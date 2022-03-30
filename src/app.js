const express = require('express');
const path = require('path');
const filesRouter = require('./routers/files');

const app = express();

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectoryPath));
app.use(filesRouter);

module.exports = app;
