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

    app.get('/lessons', async function (req, res, next) {
        try {
            const lessons = await db.collection('lessons').find({}).toArray();
            res.json(lessons);
        } catch (err) {
            next(err);
        }
    });

    app.post('/orders', async function (req, res, next) {
        try {
            const result = await db.collection('orders').insertOne(req.body);
            res.status(201).json({ msg: 'success', insertedId: result.insertedId });
        } catch (err) {
            next(err);
        }
    });

    app.put('/lessons/:id', async function (req, res, next) {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ msg: 'Invalid ObjectId' });
            }
            const result = await db.collection('lessons').updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            );
            res.json(result.matchedCount === 1 ? { msg: 'success' } : { msg: 'error' });
        } catch (err) {
            next(err);
        }
    });

    app.get('/search', async function (req, res, next) {
        try {
            const term = (req.query.q || '').toLowerCase();
            const lessons = await db.collection('lessons').find({}).toArray();
            const results = lessons.filter(function (lesson) {
                return lesson.topic.toLowerCase().includes(term) ||
                    lesson.location.toLowerCase().includes(term) ||
                    String(lesson.price).includes(term) ||
                    String(lesson.space).includes(term);
            });
            res.json(results);
        } catch (err) {
            next(err);
        }
    });

    app.get('/teachers', async function (req, res, next) {
        try {
            const teachers = await db.collection('teachers').find({}).toArray();
            res.json(teachers);
        } catch (err) {
            next(err);
        }
    });

    app.get('/teachers/:id/lessons', async function (req, res, next) {
        try {
            const teacher = await db.collection('teachers').findOne({ id: parseInt(req.params.id) });
            if (!teacher) {
                return res.status(404).json({ msg: 'Teacher not found' });
            }
            const lessons = await db.collection('lessons').find({ id: { $in: teacher.lessonIDs } }).toArray();
            res.json(lessons);
        } catch (err) {
            next(err);
        }
    });

    app.get('/enrolment/:lessonid', async function (req, res, next) {
        try {
            const lessonId = parseInt(req.params.lessonid);
            const orders = await db.collection('orders').find({ lessonIDs: lessonId }).toArray();
            let enrolled = 0;
            orders.forEach(function (order) {
                order.lessonIDs.forEach(function (id) {
                    if (id === lessonId) {
                        enrolled++;
                    }
                });
            });
            res.json({ lessonId: lessonId, enrolled: enrolled });
        } catch (err) {
            next(err);
        }
    });

    app.use(function (err, req, res, next) {
        console.error(err);
        res.status(500).json({ msg: 'Internal server error' });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, function () {
        console.log('Server running on port ' + port);
    });
}

startServer();
