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

router.get('/devices', function(req, res, next) {
  var deviceArray = require('../app.js').deviceArray;
  utils.dateLog("Post access! /devices");
  var args = [];
  if (deviceArray != null) {
    for (var i = 0; i < deviceArray.length; i++) {
      var device = deviceArray[i];
      args.push({"deviceName": device.attributes.name});
    }
  }
  res.contentType('application/json');
  res.send(JSON.stringify(args));
  res.end();
});

module.exports = router;
