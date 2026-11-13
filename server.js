const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

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

app.get('/', function (req, res) {
    res.send('Ctrl+Learn back-end is running');
});

app.listen(3000, function () {
    console.log('Server running on port 3000');
});
