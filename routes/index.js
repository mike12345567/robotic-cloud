var express = require('express');
var http = require('http');
var router = express.Router();
var utils = require('../utils.js');
var storage = require('../storage.js');
var serializer = require('../serializer.js');
var particle = require('../particle-calls.js');
var locationData = require('../location.js');
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
  getAllSpecificData("distances", req, res, "getAllDistances");
});

router.get('/events', function(req, res) {
  getAllSpecificData("events", req, res, "getAllEvents");
});

router.get('/calibrationValues', function(req, res) {
  getAllSpecificData("calibrationValues", req, res, "getAllCalibration");
});

router.get('/locationList', function(req, res) {
  getAllSpecificData("locationList", req, res, "getAllLocationData");
});

function getAllSpecificData(name, req, res, storageName) {
  utils.dateLog("GET access! /" + name);
  var deviceName = getDeviceName(req);

  if (deviceName != undefined && deviceName != null) {
    serializer.startJson();
    var events = storage[storageName](deviceName);
    for (var key in events) {
      serializer.addJsonBlock(serializer.genKeyPairs(key, events[key]));
    }
    serializer.endJson(res);
  } else {
    errorState(res);
  }
}

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
  if (ID == null) {
    errorState(res);
    return;
  }

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

/* this will pass the data for robots that it can find, therefore is under /devices */
router.post('/devices/locationData', function(req, res) {
  utils.dateLog("POST Request! /devices/locationData");
  var robot = utils.getParameter("robot-one", req.body);
  if (robot != null) {
    var rotation = utils.getParameter("rotation", robot);
    var location = utils.getParameter("location", robot);
    if (rotation != null && location != null) {
      console.log("rotation: %d location x: %d location y: %d", rotation, location.x, location.y);
      locationData.addNewLocationData("testbot-one", location, rotation);
    }
  }
  res.sendStatus(200);
  res.end();
});

router.post('/calibrate', function(req, res) {
  utils.dateLog("POST Request! /calibrate");
  var ID = getDeviceIDFromReq(req);
  if (ID == null) {
    errorState(res);
    return;
  }

  var data = utils.getCalibrationPost(req.body);
  if (data == null || !(data instanceof Array)) {
    errorState(res);
    return;
  }
  for (var i = 0; i < data.length; i++) {
    var element = data[i];
    if ("value" in element) {
      particle.loadToQueue(ID, element.endpoint, element.value);
    } else {
      particle.loadToQueue(ID, element.endpoint, element.valueLeft, element.valueRight);
    }
  }
  /* get the latest values */
  particle.loadToQueue(ID, utils.OtherEndpointsEnum.GET_CALIBRATION);

  res.sendStatus(200);
  res.end();
});
router.post('/reset', function(req, res) {
  utils.dateLog("POST Request! /reset");
  var name = getDeviceName(req);
  var ID = getDeviceIDFromReq(req);
  if (ID == null) {
    errorState(res);
    return;
  }

  particle.particlePost(ID, utils.OtherEndpointsEnum.RESET_FAILED);
  storage.setRobotAsAlive(name);

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
