/**
 * The main entry-specific functionality of the platform.
 *
 * @since      1.0.0
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/index
 */

/**
 * The main entry-specific functionality of the platform.
 *
 * @description
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/index
 * @author     Vasanth Kumararajan <vkumarar@amazon.com>
 */

const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
var path = require('path');
var cookieParser = require('cookie-parser')


app.use(bodyParser.json({ strict: false }));

app.use(cookieParser());

app.use('/js', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/view/index.html'));
});

app.get('/articles', (req, res) => {
  res.sendFile(path.join(__dirname + '/public/articles.json'));
});

app.get('/articlesexportall', (req, res) => {
  res.sendFile(path.join(__dirname + '/public/articlesexportall.json'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname + '/view/login.html'));
});

app.get('/entitlements', (req, res) => {
  res.sendFile(path.join(__dirname + '/view/entitlements.html'));
});

app.get('/api/hello', function (req, res) {
  if (!req.cookies['londonsheriff-Token']) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    // ISO 639-2 Language Code List
    // https://www.loc.gov/standards/iso639-2/php/code_list.php
    let hello = {
      "en" : "hello",
      "es" : "hola",
      "fr" : "bonjour",
      "he" : "שלום",
      "hi" : "नमस्ते",
      "it" : "ciao",
      "ja" : "こんにちは",
      "pt" : "Oi",
      "si" : "හෙලෝ",
      "ta" : "வனக்கம்",
      "zh" : "你好"
    }
    res.json(hello);
  }
});

module.exports.handler = serverless(app);
