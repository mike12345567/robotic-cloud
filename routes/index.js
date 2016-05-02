var express = require("express");
var http = require("http");
var router = express.Router();
var utils = require("../utils.js");
var locationData = require("../location.js");
var storage = require("../storage.js");
var serializer = require("../serializer.js");
var particle = require("../particle-calls.js");

/****************
 * GET REQUESTS *
 ****************/

/**
 * Gets all of the devices in the system, a separate call must be made to check if the robot is available
 * @return JSON Array of JSON objects with "deviceNames" key and each robot name as a value
 */
router.get("/devices", function(req, res) {
  utils.dateLog("GET access! /devices");
  serializer.startJson();
  var names = particle.getAllDeviceData();
  if (names == null) {
    errorState(res);
  } else {
    serializer.addJsonBlock(serializer.genKeyPairs("devices", names));
    serializer.endJson(res);
  }
});

router.get("/isdead", function(req, res) {
  utils.dateLog("GET access! /isdead");
  var deviceName = getDeviceName(req);

  if (deviceName != null) {
    serializer.startJson();
    var isdead = storage.getRobotHealthStatus(deviceName);
    if (particle.isRobotAvailable(deviceName)) {
      serializer.addJson(isdead);
    } else {
      serializer.addJson({type: isdead.type, value: {status: "offline"}});
    }
    serializer.endJson(res);
  } else {
    errorState(res);
  }
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

router.get("/currentDistance", function(req, res) {
  getAllSpecificData("currentDistance", req, res, "getLatestDistance");
});

/**
 * Gets all historical gyroscope updates for a robot accel and gyro (xyz)
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON Object with a "type" option, this states which accel/gyro reading this is
 * There will also be an "attributes" array which contains JSON objects each with a value and timestamp. The values
 * are represented as CM in this case.
 */
router.get("/gyroReadings", function(req, res) {
  getAllSpecificData("gyroReadings", req, res, "getAllGyroReadings");
});

router.get("/currentGyroReading", function(req, res) {
  getAllSpecificData("currentGyroReading", req, res, "getLatestGyroReading");
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

router.get("/currentEvent", function(req, res) {
  getAllSpecificData("currentEvent", req, res, "getLatestEvent");
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

/**
 * Gets the current location of the robot that goes by the name passed in the header or get body
 * @param expects the header or get body to contain a "deviceName" for the device to get data from.
 * @return JSON object which contains the "type" which will be statically noted as "location", a JSON array "attributes"
 * which contains JSON objects each with a "coordinates" object containing "x" and "y" values (these are arbitrary to
 * the scene), "rotation" value in degrees and a "timestamp".
 */
router.get("/currentLocation", function(req, res) {
  getLocationOrRotationData("currentLocation", req, res, "getLatestLocation", "location");
});

router.get("/currentRotation", function(req, res) {
  getLocationOrRotationData("currentRotation", req, res, "getLatestRotation", "rotation");
});

router.get("/device/*", function(req, res) {
  var elements = req.url.split("/");
  var deviceName = elements[elements.length-1];
  
  var options = ["getLatestDistance", "getLatestGyroReading", "getLatestEvent", "getLatestLocation", "getLatestRotation"];
  var names = ["distance", "gyroReading", "event", "location", "rotation"];
  if (particle.getDeviceIDFromName(deviceName) != null) {
    serializer.startJson();
    if (!particle.isRobotAvailable(deviceName)) {
      serializer.setError("offline", "The robot is not currently online, please check the robot and the network setup.");
    } else {
      for (var option in options) {
        if (options.hasOwnProperty(option)) {
          var array = storage[options[option]](deviceName);
          var keyPairs = [];
          for (var key in array) {
            if (array.hasOwnProperty(key)) {
              keyPairs.push(serializer.genKeyPair(key, array[key]));
            }
          }
          serializer.addJsonBlock(keyPairs, names[option]);
        }
      }
      if (serializer.currentKeys() == 0) {
        serializer.setError("network error", "no data available, network issues likely.");
      }
    }
    serializer.endJson(res);
  } else {
    errorState(res);
  }
});

router.get("/isUsingLocal", function(req, res) {
  utils.dateLog("GET access! /isUsingLocal");
  var deviceName = getDeviceName(req);

  if (deviceName != null) {
    serializer.startJson();
    serializer.addJson({type: "isLocal", value: storage.isDeviceUsingLocal(deviceName)});
    serializer.endJson(res);
  } else {
    errorState(res);
  }
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
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
 */
router.post("/move", function(req, res) {
  utils.dateLog("POST request! /move");
  var ID = getDeviceIDFromReq(req);
  var name = particle.getDeviceNameFromID(ID);
  if (ID == null) {
    errorState(res);
    return;
  }

  var direction = utils.getTrueDirection(utils.getParameter("direction", req.body));
  var distance = utils.getParameter("distance", req.body);
  var units = utils.getParameter("units", req.body);
  if (direction != null) {
    if (units == null && distance != null) {
      units = utils.isTurn(direction) ? "degrees" : "cm";
    }
    particle.particlePost(ID, direction, distance, units);
    if (utils.isMove(direction)) {
      locationData.robotShouldBeMoving(name);
    } else if (utils.isStop(direction)) {
      locationData.clearTargetData(name);
      locationData.robotShouldBeStopped(name);
    }
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
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
 */
router.post("/rotateToTarget", function(req, res) {
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
  if (degrees != null && degrees >= 0 && degrees <= 360) {
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
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
 */
router.post("/devices/locationData", function(req, res) {
  /* this route will be called a lot so there shouldn't be any logging throughout it as it isn't of use */
  utils.parseLocationData(req);
  if ("hazards" in req.body) {
    storage.storeHazardData(req.body.hazards);
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
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
 */
router.post("/calibrate", function(req, res) {
  utils.dateLog("POST Request! /calibrate");
  var ID = getDeviceIDFromReq(req);
  if (ID == null) {
    errorState(res);
    return;
  }

  var data = utils.getCalibrationDataFromPost(req.body);
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
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
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
  storage.storeEvent(name, "reset");

  res.sendStatus(200);
  res.end();
});

/**
 * Sets a target location for the robot
 * @param expects the header or post body to contain a "deviceName" for the device to get data from.
 * @param expects the body to contain a "coordinates" populated with an "x" and "y" parameter for where the robot
 *        should move in 2D space.
 * @return status code 200 if JSON body correct and request carried out, 404 otherwise.
 */
router.post("/moveToTarget", function(req, res) {
  utils.dateLog("POST Request! /moveToTarget");
  var deviceName = getDeviceName(req);
  var ID = getDeviceIDFromReq(req);
  if (ID == null) {
    errorState(res);
    return;
  }
  var coordinates = utils.getParameter("coordinates", req.body);

  if (coordinates != null && "x" in coordinates && "y" in coordinates &&
      coordinates.x >= locationData.screenSize.minX && coordinates.x <= locationData.screenSize.maxX &&
      coordinates.y >= locationData.screenSize.minY && coordinates.y <= locationData.screenSize.maxY) {
    locationData.setTargetLocation(deviceName, coordinates);
  } else {
    errorState(res);
    return;
  }

  res.sendStatus(200);
  res.end();
});

router.post("/ledOff", function(req, res) {
  changeLed(req, res, true);
});

router.post("/ledOn", function(req, res) {
  changeLed(req, res, false);
});

router.post("/useWeb", function(req, res) {
  utils.dateLog("POST Request! /useWeb");
  useLocal(req, res, false);
});

router.post("/useLocal", function(req, res) {
  utils.dateLog("POST Request! /useLocal");
  useLocal(req, res, true);
});

/***************
 *  UTILITIES  *
 ***************/
function getAllSpecificData(name, req, res, storageName) {
  utils.dateLog("GET access! /" + name);
  var deviceName = getDeviceName(req);

  if (deviceName != undefined && deviceName != null) {
    serializer.startJson();
    var array = storage[storageName](deviceName);
    for (var key in array) {
      if (array.hasOwnProperty(key)) {
        if (array[key] instanceof Array) {
          serializer.addJsonBlock(serializer.genKeyPairs(key, array[key]));
        } else {
          serializer.addJson(serializer.genKeyPair(key, array[key]));
        }
      }
    }
    serializer.endJson(res);
  } else {
    errorState(res);
  }
}

function getLocationOrRotationData(name, req, res, storageName, key) {
  utils.dateLog("GET Request! /" + name);
  var deviceName = getDeviceName(req);

  if (deviceName != null) {
    var value = storage[storageName](deviceName);

    if (value != null || value == JSON.stringify({})) {
      serializer.startJson();
      serializer.addJsonBlock(serializer.genKeyPairs(null, value), key);
      serializer.endJson(res);
      // escape and do not error
      return;
    }
  }
  errorState(res);
}

function errorState(res) {
  if (res != null) {
    res.sendStatus(404);
    res.end();
  }
}

function getDeviceIDFromReq(req, res) {
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

function changeLed(req, res, state) {
  utils.dateLog("POST Request! /ledOff");
  var deviceName = getDeviceName(req);
  if (deviceName == null) {
    errorState(res);
    return;
  }

  particle.changeLedState(deviceName, state);
  res.sendStatus(200);
  res.end();
}

function useLocal(req, res, shouldUseLocal) {
  var deviceName = getDeviceName(req);
  if (deviceName == null) {
    errorState(res);
    return;
  }

  storage.deviceUsingLocal(deviceName, shouldUseLocal);
  res.sendStatus(200);
  res.end();
}

module.exports = router;
