var express = require("express");
var http = require("http");
var router = express.Router();
var utils = require("../utils.js");
var locationData = require("../location.js");
var storage = require("../storage.js");
var serializer = require("../serializer.js");
var particle = require("../particle-calls.js");
var path = require("path");

/****************
 * GET REQUESTS *
 ****************/

/**
 * Gets the homepage from the node server, this version uses the API instead of direct Particle calls
 * @return a static web page with controls on it
 */
router.get("/", function(req, res) {
  utils.dateLog("Page access! (Main page)");
  res.sendFile(path.resolve("views/index.html"));
});

/**
 * Gets all of the devices in the system, a separate call must be made to check if the robot is available
 * @return JSON Array of JSON objects with "deviceName" key and each robot name as a value
 */
router.get("/devices", function(req, res) {
  utils.dateLog("GET access! /devices");
  serializer.startJson();
  var names = particle.getAllDeviceNames();
  serializer.addJson(serializer.genKeyPairs("deviceName", names));
  serializer.endJson(res);
});

/**
 * Gets all historical distance updates for a robot (its front facing Ultrasonic sensor)
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON Object with a "type" option, this states which ultrasonic sensor data is received from.
 * There will also be an "attributes" array which contains JSON objects each with a value and timestamp. The values
 * are represented as CM in this case.
 */
router.get("/distances", function(req, res) {
  getAllSpecificData("distances", req, res, "getAllDistances");
});

/**
 * Gets all events which have been received for a robot.
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON array containing the type of events which have occurred for the robot, a "type" attribute will be
 * supplied with each object in the Array, which is followed by an array of "attributes", this contains JSON objects
 * which specific event data under "value" and the timestamp under "timestamp" of when it occurred.
 */
router.get("/events", function(req, res) {
  getAllSpecificData("events", req, res, "getAllEvents");
});

/**
 * Gets the calibration values which are known for a robot.
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON array containing JSON objects each with a "type" attribute which specifies the type of calibration,
 * followed by an "attributes" object which in turn contains a value for the calibration under "value".
 */
router.get("/calibrationValues", function(req, res) {
  getAllSpecificData("calibrationValues", req, res, "getAllCalibration");
});

/**
 * Gets a list of historical data for the location, this is where the robot was located over the time it has been
 * running.
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON object which contains the "type" which will be statically noted as "location", a JSON array "attributes"
 * which contains JSON objects each with a "coordinates" object containing "x" and "y" values (these are arbitrary to
 * the scene), "rotation" value in degrees and a "timestamp".
 */
router.get("/locationList", function(req, res) {
  getAllSpecificData("locationList", req, res, "getAllLocationData");
});

/*****************
 * POST REQUESTS *
 *****************/

/**
 * sends a command to move to a specific robot
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @param JSON body should contain a "direction", this is REQUIRED, may be forward, left, right, backward or stop.
 * @param JSON body optionally can contain "distance", this states how far the move should occur for.
 * @param JSON body optionally can contain "units", this states the units the "distance" has been specified in. If
 * distance specified but no units it will assume "cm" or "degrees" as applicable. This may be mm, cm, m or degrees.
 * @return status code 200 if JSON body correct and request carried out, 500 otherwise.
 */
router.post("/move", function(req, res) {
  utils.dateLog("POST request! /move");
  var ID = getDeviceIDFromReq(req);
  if (ID == null) return;

  var direction = utils.getTrueDirection(utils.getParameter("direction", req.body));
  var distance = utils.getParameter("distance", req.body);
  var units = utils.getParameter("units", req.body);
  if (direction != null) {
    if (units == null && distance != null) {
      units = utils.isTurn(direction) ? "degrees" : "cm";
    }
    particle.particlePost(ID, direction, distance, units);
  } else {
    errorState(res);
    return;
  }
  res.sendStatus(200);
  res.end();
});

/**
 * Rotates the robot based on the computer vision output (not using robot analytics)
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @param JSON body should contain a "direction", this is REQUIRED, may be forward, left, right, backward or stop.
 * @param JSON body optionally can contain "distance", this states how far the move should occur for.
 * @param JSON body optionally can contain "units", this states the units the "distance" has been specified in. If
 * distance specified but no units it will assume "cm" or "degrees" as applicable. This may be mm, cm, m or degrees.
 * @return status code 200 if JSON body correct and request carried out, 500 otherwise.
 */
router.post("/rotate", function(req, res) {
  utils.dateLog("POST request! /rotate");
  var deviceName = getDeviceName(req);
  if (deviceName == null) {
    errorState(res);
    return;
  }

  var degrees = utils.getParameter("degrees", req.body);
  var radians = utils.getParameter("radians", req.body);
  if (radians != null) {
    degrees = radians * (180/Math.PI);
  }
  if (degrees != null) {
    locationData.setTargetRotation(deviceName, degrees)
  } else {
    errorState(res);
    return;
  }

  res.sendStatus(200);
  res.end();
});

/**
 * Specifically fills in data from the computer vision system, this may be secured in the future.
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @param JSON objects for each robot in the scene, key of object will be robot name.
 * @param each object will contain a "location", containing an "x" and "y" point for the robot.
 * @param each object will contain a "rotation" for the robot.
 * @return status code 200 if JSON body correct and request carried out, 500 otherwise.
 */
router.post("/devices/locationData", function(req, res) {
  utils.dateLog("POST Request! /devices/locationData");
  var robot = utils.getParameter("robot-one", req.body);
  if (robot != null) {
    var rotation = utils.getParameter("rotation", robot);
    var location = utils.getParameter("location", robot);
    if (rotation != null && location != null) {
      console.log("rotation: %d location x: %d location y: %d", rotation, location.x, location.y);
      var ID = particle.getDeviceIDFromName("testbot-one");
      locationData.addNewLocationData("testbot-one", location, rotation);
    }
  }
  res.sendStatus(200);
  res.end();
});

/**
 * calibrates the robot based on optional parameters, all calibration is stored once it has been calibrated on the robot
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @param optionally can contain "speed" this is a value from 0 to 255 which will configure the robots speed.
 * @param optionally can contain "turnSpeed" this is the time it takes for the robot to turn 360 degrees.
 * @param optionally can contain "wheelSpeed" if the robot drifts in one direction this can be used to speed up one
 * motor and reduce the drift. This will contain a "left" and "right" option in a JSON object for each motor.
 * @param optionally can contain "friction" this defines a friction delta for the environment.
 * @param optionally can contain "direction" defining the direction each motor rotates in when the robot moves forward.
 * @return status code 200 if JSON body correct and request carried out, 500 otherwise.
 */
router.post("/calibrate", function(req, res) {
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

/**
 * Resets the robot if it has failed.
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @return status code 200 if JSON body correct and request carried out, 500 otherwise.
 */
router.post("/reset", function(req, res) {
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

/***************
 *  UTILITIES  *
 ***************/
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
  } else if ("deviceName" in req.headers) {
    return req.headers.deviceName.toLowerCase();
  } else  if ("deviceName" in req.body) {
    return req.body.deviceName.toLowerCase();
  } else if ("devicename" in req.body) {
    return req.body.devicename.toLowerCase();
  }
}

module.exports = router;
