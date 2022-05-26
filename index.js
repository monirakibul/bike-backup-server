const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const nodemailer = require("nodemailer");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())

async function sendEmail(product) {

    const { name, email, productName, amount } = product;
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.USER, // generated ethereal user
            pass: process.env.PASS, // generated ethereal password
        },
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: false,
        },
    });

    var mail = {
        from: 'sobjano48@gmail.com',
        to: email,
        subject: `We have received your order for ${productName} is pending`,
        text: `Your payment for ${productName} is  Pending.`,
        html: `
          <div>
            <p> Hello ${name}, </p>
            <h3>Thank you for your order . </h3>
            <h3>We have received your order</h3>
            <p>Please payment amount $${amount}.</p>
            <h3>Our Address</h3>
            <p>Andor Killa Bandorban</p>
            <p>Bangladesh</p>
            <a href="">unsubscribe</a>
          </div>
        `
    };
    // send mail with defined transport object
    let info = await transporter.sendMail(mail);

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekxfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect()
        const productsCollection = client.db('BikeBackup').collection('products')
        const reviewsCollection = client.db('BikeBackup').collection('reviews')
        const userCollection = client.db('BikeBackup').collection('users')
        const ordersCollection = client.db('BikeBackup').collection('orders')


        const verifyAdmin = async (req, res, next) => {

            const currentAdmin = req.decoded.email;
            const currentAdminData = await userCollection.findOne({ email: currentAdmin });
            if (currentAdminData.role !== 'admin') {
                res.status(403).send({ message: 'forbidden' })
            } else {
                next()
            }

        }

        // get user 
        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })
        // get user by email 
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const userData = await userCollection.findOne({ email: email });
            res.send(userData)
        });
        // get admin 
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const userData = await userCollection.findOne({ email: email });
            const isAdmin = userData.role === 'admin';
            res.send({ admin: isAdmin })
        });

        // make admin 
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const body = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: body,
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // update user 
        app.put('/user', verifyJWT, async (req, res) => {
            const email = req.body.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });

        // getting token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.TOKEN, { expiresIn: '1d' })

            res.send({ result, token: token });
        });

        // product 
        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productsCollection.find(query)
            const products = await cursor.toArray()
            res.send(products)
        });
        // add product 
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = productsCollection.insertOne(product)
            res.send(result)
        })

        // delete product 
        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })

        // product details 
        app.get('/purchase/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query)
            res.send(product)
        })

        // get review
        app.get('/reviews', async (req, res) => {
            const query = {}
            const cursor = reviewsCollection.find(query)
            const reviews = await cursor.toArray()
            res.send(reviews)
        });
        // add review 
        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = reviewsCollection.insertOne(review)
            res.send(result)
        })

        // place order 
        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            sendEmail(order)
            return res.send({ success: true, result });
        });

        // get order by id 
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            return res.send(result);
        });

        // get order list 
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            let query = {}
            if (email) {
                query = { email: email }
            }
            else {
                query = {}
            }
            const cursor = ordersCollection.find(query)
            const orders = await cursor.toArray()
            res.send(orders)
        });

        // delete order 
        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        })

        // update order 
        app.put('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: body,
            };
            const result = await ordersCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        });


        // payment intent 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const price = req.body.amount;
            const amount = parseInt(price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })
    }
    finally { }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('running')
})

app.listen(port, () => {
    console.log(port)
})