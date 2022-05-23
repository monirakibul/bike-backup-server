const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekxfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect()
        const productsCollection = client.db('BikeBackup').collection('products')
        const reviewsCollection = client.db('BikeBackup').collection('reviews')


        // product 
        app.get('/products', async (req, res) => {
            const query = {}
            const cursor = productsCollection.find(query)
            const products = await cursor.toArray()
            res.send(products)
        });
        // add product 
        app.post('/product', async (req, res) => {
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
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = reviewsCollection.insertOne(review)
            res.send(result)
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