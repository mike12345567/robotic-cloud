var express = require('express');
var http = require('http');
var router = express.Router();
var utils = require('../utils.js');
var serializer = require('../serializer.js');
var particle = require('../particle.js');
var path = require('path');

/* GET home page. */
router.get('/', function(req, res) {
  utils.dateLog("Page access! (Main page)");
  res.sendFile(path.resolve('views/index.html'));
});

router.get('/devices', function(req, res) {
  utils.dateLog("GET access! /devices");
  serializer.startJson();
  var names = particle.getAllDeviceNames();
  serializer.addJson(serializer.genKeyPairs("deviceName", names));
  serializer.endJson(res);
});

router.post('/move', function(req, res) {
  utils.dateLog("POST request! /move");
  var ID;
  if ("deviceName" in req.body) {
    ID = particle.getDeviceIDFromName(req.body.deviceName);
  } else {
    errorState(res);
    return;
  }

  if ("direction" in req.body) {
    var direction = req.body.direction.toLowerCase();
    if ("distance" in req.body && "units" in req.body) {
      var distance = req.body.distance;
      var units = req.body.units;
    }
    particle.particlePost(ID, direction, distance, units);
  } else {
    errorState(res);
    return;
  }
  res.sendStatus(200);
  res.end();
});

router.post('/rotate', function(req, res) {
  utils.dateLog("POST request! /rotate");
});

function errorState(res) {
  res.sendStatus(500);
  res.end();
}

module.exports = router;
