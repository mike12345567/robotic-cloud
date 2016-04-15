var particle = require("./particle-calls.js");
var utils = require("./utils.js");
var websocket = require("./websocket.js");
var storage = require("./storage.js");
var locationUtils = require("./location-utilities.js");

/* Interval data */
var noUpdateShutdownTimeMs = 3000;
var lastUpdateTimeMs = 0;

var historicalWindowMs = 5000;
var moveTimeThresholdMs = 300;
var baseAdjustmentLengthMs = 200;
var lastLocationEntryTimeMs = 0;
var maxAttempts = 300;

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

function initMovingData(deviceName) {
  if (robotMoveData[deviceName] == null) {
    resetMovingData(deviceName, true);
    robotMoveData[deviceName].moving = false;
  }
}

function resetMovingData(deviceName, all) {
  var obj = {};
  obj.turning = false;
  obj.shouldBeMoving = false;
  obj.makingAdjustments = false;
  obj.attempts = 0;
  if (all) {
    obj.rotationCompleteCall = null;
    obj.rotationSet = false;
    obj.startingLocation = null;
  }
  robotMoveData[deviceName] = obj;
}

function testIfRobotShouldRotate(deviceName, completion) {
  initMovingData(deviceName);
  var robotMovingData = robotMoveData[deviceName];
  var currentRotation = latestRotationMap[deviceName];
  var targetRotation = targetRotationMap[deviceName];

  if (targetRotation == null || currentRotation == null || robotMovingData.makingAdjustments) {
    return;
  }

  if (robotMovingData.shouldBeMoving) {
    if (locationUtils.needsToStopRotate(currentRotation, targetRotation,
        robotMovingData.rotationSpeed,
        storage.getCurrentSpeed(deviceName).value)) {
      stopRobot(deviceName, completion);
    }
  } else {
    /* we are already at the target degrees */
    if (!locationUtils.needsToRotate(currentRotation, targetRotation)) {
      if (completion != null) {
        completion();
      }
      return;
    }
    locationUtils.rotateRobot(deviceName, currentRotation, targetRotation, robotMovingData);
  }
  robotMoveData[deviceName] = robotMovingData;
}

function afterRotateComplete(deviceName, complete) {
  if (targetRotationMap[deviceName] == null) return;

  if (robotMoveData[deviceName].attempts < maxAttempts && !complete) {
    robotMoveData[deviceName].attempts++;
    robotMoveData[deviceName].makingAdjustments = true;
    setTimeout(function() {
      makeRotationAdjustment(deviceName, true);
    }, baseAdjustmentLengthMs * 2);
  } else {
    targetRotationMap[deviceName] = null;
    robotMoveData[deviceName].shouldBeMoving = false;
    robotMoveData[deviceName].makingAdjustments = false;
    robotMoveData[deviceName].turning = false;
    if (robotMoveData[deviceName].rotationCompleteCall != null) {
      robotMoveData[deviceName].rotationCompleteCall(deviceName);
    } else {
      storage.storeEvent(deviceName, storage.EventEnum.COMPLETE);
    }
  }
}

function makeRotationAdjustment(deviceName, firstCall) {
  if (!robotMoveData[deviceName].makingAdjustments ||
      !locationUtils.needsToRotate(latestRotationMap[deviceName], targetRotationMap[deviceName])) {
    afterRotateComplete(deviceName, true);
    return;
  }

  if (firstCall) {
    var robotSpeed = storage.getCurrentSpeed(deviceName).value;
    var adjustmentLengthMs = (locationUtils.optimisedForSpeed * baseAdjustmentLengthMs) / robotSpeed;
    /* bit dirty but it makes sure we eventually arrive at the right angle */
    if (robotMoveData[deviceName].attempts > maxAttempts/4) {
      adjustmentLengthMs /= 2;
    }
    if (robotMoveData[deviceName].attempts > maxAttempts/2) {
      adjustmentLengthMs /= 4;
    }

    locationUtils.rotateRobot(deviceName, latestRotationMap[deviceName],
                              targetRotationMap[deviceName], robotMoveData[deviceName]);
    setTimeout(function () {
      makeRotationAdjustment(deviceName, false);
    }, adjustmentLengthMs);
  } else {
    stopRobot(deviceName, function() {
      afterRotateComplete(deviceName);
    });
  }
}

function testIfRobotShouldMove(deviceName, completion) {
  initMovingData(deviceName);
  var robotMovingData = robotMoveData[deviceName];
  var currentLocation = latestLocationMap[deviceName];
  var targetLocation = targetLocationMap[deviceName];

  if (targetLocation == null || currentLocation == null || robotMovingData.makingAdjustments) {
    return;
  }

  if (!locationUtils.needsToMove(currentLocation, targetLocation) ||
       locationUtils.hasPassedLocation(robotMovingData.startingLocation, currentLocation, targetLocation)) {
    if (!robotMovingData.turning && robotMovingData.shouldBeMoving) {
      stopRobot(deviceName);
    }
    if (completion != null) {
      completion();
    }
    return;
  }

  if (!robotMovingData.rotationSet) {
    module.exports.setTargetRotation(deviceName, locationUtils.calculateRotationToFacePoint(currentLocation, targetLocation));
    robotMovingData.rotationCompleteCall = function() {
      locationUtils.moveRobot(deviceName, robotMovingData);
    };
    robotMovingData.rotationSet = true;
  }
  robotMoveData[deviceName] = robotMovingData;
}

function afterMoveComplete(deviceName) {
  var currentLocation = latestLocationMap[deviceName];
  var targetLocation = targetLocationMap[deviceName];
  if (locationUtils.needsToMove(currentLocation, targetLocation)) {
    // reset at our new point
    setTimeout(function() {
      module.exports.setTargetLocation(deviceName, targetLocation);
    }, baseAdjustmentLengthMs *2);
  } else {
    targetLocationMap[deviceName] = null;
    robotMoveData[deviceName].rotationSet = false;
    robotMoveData[deviceName].shouldBeMoving = false;
    robotMoveData[deviceName].makingAdjustments = false;

    storage.storeEvent(deviceName, storage.EventEnum.COMPLETE);
  }
}

function stopRobot(deviceName, completion) {
  var ID = particle.getDeviceIDFromName(deviceName);
  particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_STOP);
  if (completion != null) {
    setTimeout(completion, moveTimeThresholdMs);
  }
}

function stopRobotIfRequired(deviceName) {
 if (robotMoveData[deviceName].moving) {
   if ((new Date().getTime() - lastUpdateTimeMs > noUpdateShutdownTimeMs) ||
       (!robotMoveData[deviceName].shouldBeMoving && robotMoveData[deviceName].moving)) {
     stopRobot(deviceName);
   }
 }
}

module.exports = {
  MoveStatusEnum: {
    MOVING  : 1,
    STOPPED : 0
  },

  screenSize: {minX: 100, minY: 100, maxX: 650, maxY: 400},

  addNewLocationData: function (deviceName, location, rotation, rotationSpeed) {
    if ("x" in location && "y" in location) {
      latestLocationMap[deviceName] = {x: parseInt(location.x), y: parseInt(location.y)};
      latestRotationMap[deviceName] = parseInt(rotation);
      robotMoveData[deviceName].rotationSpeed = rotationSpeed;
      testForHistoricalUpdate({deviceName:deviceName, location:location, rotation:rotation});
    }
    if (storage != null) {
      storage.resetHazardData();
    }
    lastUpdateTimeMs = new Date().getTime();
    testIfRobotShouldRotate(deviceName, function() {afterRotateComplete(deviceName)});
    testIfRobotShouldMove(deviceName, function() {afterMoveComplete(deviceName)});
    websocket.needsUpdated(deviceName, websocket.WebSocketUpdateEnum.LOCATION);
    websocket.needsUpdated(deviceName, websocket.WebSocketUpdateEnum.ROTATION);
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
    initMovingData(deviceName);

    if (particle.isRobotAvailable(deviceName)) {
      resetMovingData(deviceName, true);
      robotMoveData[deviceName].startingLocation = latestLocationMap[deviceName];
      targetLocationMap[deviceName] = {x: parseInt(location.x), y: parseInt(location.y)};
    }
  },

  setTargetRotation: function (deviceName, rotation) {
    initMovingData(deviceName);

    if (particle.isRobotAvailable(deviceName)) {
      resetMovingData(deviceName, false);
      targetRotationMap[deviceName] = parseInt(rotation);
    }
  },

  clearTargetData: function (deviceName) {
    targetRotationMap[deviceName] = null;
    targetLocationMap[deviceName] = null;
  },

  moveStatus: function (deviceName, status) {
    if (status == this.MoveStatusEnum.MOVING) {
      robotMoveData[deviceName].moving = true;
    } else if (status == this.MoveStatusEnum.STOPPED) {
      robotMoveData[deviceName].moving = false;
    }
  },

  robotShouldBeMoving: function (deviceName) {
    initMovingData(deviceName);
    robotMoveData[deviceName].shouldBeMoving = true;
  },

  robotShouldBeStopped: function (deviceName) {
    initMovingData(deviceName);
    resetMovingData(deviceName, true);
    this.clearTargetData(deviceName);
  },

  devicesReady: function (deviceArray) {
    for (var i = 0; i < deviceArray.length; i++) {
      var deviceName = deviceArray[i].name;
      initMovingData(deviceName);
      var robotMovingData = robotMoveData[deviceName];
      if ("intervalId" in robotMovingData) {
        clearInterval(robotMovingData.intervalId);
      }
      if (particle.isRobotAvailable(deviceName)) {
        robotMovingData.intervalId = setInterval(utils.createCopyCallback(stopRobotIfRequired, deviceName), moveTimeThresholdMs);
      }
    }
  }
};