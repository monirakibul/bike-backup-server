const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')


const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


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


        // gte user 
        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })
        // get admin 
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const userData = await userCollection.findOne({ email: email });
            const isAdmin = userData.role === 'admin';
            res.send({ admin: isAdmin })
        });

        // make admin 
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // product 
        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productsCollection.find(query)
            const products = await cursor.toArray()
            res.send(products)
        });
        // add product 
        app.post('/product', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = productsCollection.insertOne(product)
            res.send(result)
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
            const token = jwt.sign({ email: email }, process.env.TOKEN, { expiresIn: '1h' })

            res.send({ result, token: token });
        });
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