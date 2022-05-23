const express = require('express')
const cors = require('cors');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekxfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


client.connect(err => {
    const collection = client.db("bikebackup").collection("users");
    // perform actions on the collection object
    console.log('con')
})

app.get('/', (req, res) => {
    res.send('running')
})

app.listen(port, () => {
    console.log(port)
})