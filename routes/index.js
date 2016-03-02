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
    var distancesCm = storage.getAllDistances(deviceName);
    for (var key in distancesCm) {
      serializer.addJsonBlock(serializer.genKeyPairs(key, distancesCm[key]));
    }
    serializer.endJson(res);
  } else {
    errorState(res);
  }
});

router.post('/move', function(req, res) {
  utils.dateLog("POST request! /move");
  var ID = getDeviceIDFromReq(req);
  if (ID == null) return;

  var direction = utils.getTrueDirection(utils.getParameter("direction", req.body));
  var distance = utils.getParameter("distance", req.body);
  var units = utils.getParameter("units", req.body);
  if (direction != null) {
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
  var ID = getDeviceIDFromReq(req);
  if (ID == null) return;

  var direction = utils.getTrueDirection(utils.getParameter("direction", req.body));
  var degrees = utils.getParameter("degrees", req.body);
  var radians = utils.getParameter("radians", req.body);
  if (radians != null) {
    degrees = radians * (180/Math.PI);
  }
  if (direction != null) {
    particle.particlePost(ID, direction, degrees);
  } else {
    errorState(res);
    return;
  }

  res.sendStatus(200);
  res.end();
});

function errorState(res) {
  res.sendStatus(500);
  res.end();
}

function getDeviceIDFromReq(req) {
  var deviceName = getDeviceName(req);
  if (deviceName != undefined && deviceName != null) {
    return particle.getDeviceIDFromName(deviceName);
  } else {
    errorState(res);
    return null;
  }

}

function getDeviceName(req) {
  if ("devicename" in req.headers) {
    return req.headers.devicename.toLowerCase();
  } else if ("deviceName" in req.body) {
    return req.body.deviceName.toLowerCase();
  }
}

module.exports = router;
