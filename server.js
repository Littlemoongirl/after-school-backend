const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const app = express();

app.use(express.json());

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, Accept, X-Requested-With, Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(function (req, res, next) {
    console.log(req.method + ' ' + req.url + ' ' + new Date().toISOString());
    next();
});

app.use('/images', function (req, res, next) {
    let filePath = path.join(__dirname, 'images', req.url);
    fs.stat(filePath, function (err, stats) {
        if (err || !stats.isFile()) {
            res.status(404).json({ msg: 'Image not found' });
        } else {
            res.sendFile(filePath);
        }
    });
});

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function startServer() {
    await client.connect();
    const db = client.db('ctrlLearn');
    console.log('Connected to MongoDB');

    app.get('/', function (req, res) {
        res.send('Ctrl+Learn back-end is running');
    });

    app.get('/lessons', async function (req, res) {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
    });

    app.post('/orders', async function (req, res) {
        const result = await db.collection('orders').insertOne(req.body);
        res.status(201).json({ msg: 'success', insertedId: result.insertedId });
    });

    app.put('/lessons/:id', async function (req, res) {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ msg: 'Invalid ObjectId' });
        }
        const result = await db.collection('lessons').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json(result.matchedCount === 1 ? { msg: 'success' } : { msg: 'error' });
    });

    app.get('/search', async function (req, res) {
        const term = (req.query.q || '').toLowerCase();
        const lessons = await db.collection('lessons').find({}).toArray();
        const results = lessons.filter(function (lesson) {
            return lesson.topic.toLowerCase().includes(term) ||
                lesson.location.toLowerCase().includes(term) ||
                String(lesson.price).includes(term) ||
                String(lesson.space).includes(term);
        });
        res.json(results);
    });

    app.listen(3000, function () {
        console.log('Server running on port 3000');
    });
}

startServer();
