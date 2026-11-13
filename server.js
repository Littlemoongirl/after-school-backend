const express = require('express');
const app = express();

app.use(function (req, res, next) {
    console.log(req.method + ' ' + req.url + ' ' + new Date().toISOString());
    next();
});

app.get('/', function (req, res) {
    res.send('Ctrl+Learn back-end is running');
});

app.listen(3000, function () {
    console.log('Server running on port 3000');
});
