var express = require('express');
var http = require('http');
var router = express.Router();
var utils = require('../utils.js');
var storage = require('../storage.js');
var serializer = require('../serializer.js');
var particle = require('../particle-calls.js');
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

router.get('/distances', function(req, res) {
  utils.dateLog("GET access! /distances");
  var deviceName = getDeviceName(req);

  if (deviceName != undefined && deviceName != null) {
    serializer.startJson();
    var distancesCm = storage.getAllLatestDistances(deviceName);
    serializer.addJson(serializer.genKeyPairs("frontDistance", distancesCm));
    serializer.endJson(res);
  } else {
    errorState(res);
  }
});

router.post('/move', function(req, res) {
  utils.dateLog("POST request! /move");
  var ID;
  var deviceName = getDeviceName(req);
  if (deviceName != undefined && deviceName != null) {
    ID = particle.getDeviceIDFromName(deviceName);
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

function getDeviceName(req) {
  if ("devicename" in req.headers) {
    return req.headers.devicename.toLowerCase();
  } else if ("deviceName" in req.body) {
    return req.body.deviceName.toLowerCase();
  }
}

module.exports = router;
