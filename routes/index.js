var express = require('express');
var http = require('http');
var router = express.Router();
var utils = require('../utils.js');
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  utils.dateLog("Page access! (Main page)");
  res.sendFile(path.resolve('views/index.html'));
});

module.exports = router;
