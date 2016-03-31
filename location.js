var particle = require("./particle-calls.js");
var utils = require("./utils.js");

var historicalWindowMs = 5000;
var moveTimeThresholdMs = 300;
var lastLocationEntryTimeMs = 0;
var differenceNoRotation = 5;      // MUST NOT BE ZERO
var differenceToStopRotation = 60; // MUST NOT BE ZERO

HistoricalKeyEnum = {
  LOCATION_DATA : "location"
};

var latestLocationMap = [];
var latestRotationMap = [];
var targetRotationMap = [];
var targetLocationMap = [];
var robotMoveData = [];

var historicalData = [];

function testForHistoricalUpdate(params) {
  var deviceName, location, rotation;
  if ("deviceName" in params) {
    deviceName = params.deviceName;
  }
  if ("location" in params) {
    location = params.location;
  }
  if ("rotation" in params) {
    rotation = params.rotation;
  }

  if (historicalData[deviceName] == null) {
    historicalData[deviceName] = [];
  }

  var timeNow = new Date().getTime();

  if (location != null) {
    var key = HistoricalKeyEnum.LOCATION_DATA;
    if (historicalData[deviceName][key] == null) {
      historicalData[deviceName][key] = [];
    }
    var length = historicalData[deviceName][key].length;

    if (timeNow - lastLocationEntryTimeMs > historicalWindowMs) {
      /* value and key are included so that the serializer can be used without changes */
      historicalData[deviceName][key][length] = {coordinates:location, rotation:rotation, timestamp:timeNow};
      lastLocationEntryTimeMs = timeNow;
    }
  }
}

/* threshold for rotation being complete */
function needsToRotate(currentRotation, targetRotation) {
  var difference = currentRotation - targetRotation;
  if (difference < 0) difference *= -1;
  return difference > differenceNoRotation;
}

function initMovingData(deviceName) {
  if (robotMoveData[deviceName] == null) {
    var obj = {};
    obj.moving = false;
    obj.startMoveTimeMs = 0;
    obj.startRotation = 0;
    robotMoveData[deviceName] = obj;
  }
}

function needsToStopRotate(currentRotation, targetRotation) {
  var difference = currentRotation - targetRotation;
  if (difference < 0) difference *= -1;
  return difference < differenceToStopRotation;
}

function rotateRobotToTarget(deviceName) {
  initMovingData(deviceName);
  var robotMovingData = robotMoveData[deviceName];
  var currentRotation = latestRotationMap[deviceName];
  var targetRotation = targetRotationMap[deviceName];
  var ID = particle.getDeviceIDFromName(deviceName);

  if (targetRotation == null || currentRotation == null) {
    return;
  }

  switch (robotMovingData.moving) {
    case true:
      /* stop rotation when in threshold */
      if (robotMovingData.startMoveTimeMs + moveTimeThresholdMs > new Date().getTime()) {
        return;
      }

      if (needsToStopRotate(currentRotation, targetRotation)) {
        particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_STOP);
        robotMovingData.moving = false;
        targetRotationMap[deviceName] = null;
      }
      break;
    case false:
      /* we are already at the target degrees */
      if (!needsToRotate(currentRotation, targetRotation)) {
        targetRotationMap[deviceName] = null;
        return;
      }
      /* move in the direction closest to the requirement */
      var smallerAngle = Math.min(currentRotation, targetRotation);
      var largerAngle = Math.max(currentRotation, targetRotation);
      if ((largerAngle - smallerAngle) < 180.0) {
        particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_TURN_LEFT);
      } else {
        particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_TURN_RIGHT);
      }
      robotMovingData.moving = true;
      robotMovingData.startRotation = currentRotation;
      robotMovingData.startMoveTimeMs = new Date().getTime();
      break;
    default:
      robotMovingData.moving = false;
      /* repeat function now that we have init this robot moving */
      rotateRobotToTarget(deviceName);
  }
  robotMoveData[deviceName] = robotMovingData;
}

module.exports = {
  addNewLocationData: function (deviceName, location, rotation) {
    if ("x" in location && "y" in location) {
      latestLocationMap[deviceName] = location;
      latestRotationMap[deviceName] = rotation;
      testForHistoricalUpdate({deviceName:deviceName, location:location, rotation:rotation});
    }
    rotateRobotToTarget(deviceName);
  },

  getCurrentLocation: function (deviceName) {
    return latestLocationMap[deviceName];
  },

  getCurrentRotation:function (deviceName) {
    return latestRotationMap[deviceName];
  },

  getHistoricalLocationData: function (deviceName) {
    return historicalData[deviceName];
  },

  setTargetLocation: function (deviceName, location) {
    targetLocationMap[deviceName] = location;
  },

  setTargetRotation: function (deviceName, rotation) {
    targetRotationMap[deviceName] = rotation;
  },

  clearRobotData: function (deviceName) {
    targetRotationMap[deviceName] = null;
    targetLocationMap[deviceName] = null;
    latestRotationMap[deviceName] = null;
    latestLocationMap[deviceName] = null;
  }
};