var particle = require("./particle-calls.js");
var utils = require("./utils.js");
var websocket = require("./websocket.js");
var storage = require("./storage.js");
var rotationUtils = require("./rotation-utilities.js");

/* Interval data */
var noUpdateShutdownTimeMs = 3000;
var lastUpdateTimeMs = 0;

var historicalWindowMs = 5000;
var moveTimeThresholdMs = 300;
var baseAdjustmentLengthMs = 200;
var lastLocationEntryTimeMs = 0;
var maxAttempts = 10;

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
    resetMovingData(deviceName);
  }
}

function resetMovingData(deviceName) {
  var obj = {};
  obj.moving = false;
  obj.startMoveTimeMs = 0;
  obj.startRotation = 0;
  obj.turning = false;
  obj.shouldBeMoving = false;
  obj.makingAdjustments = false;
  obj.attempts = 0;
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

  switch (robotMovingData.shouldBeMoving) {
    case true:
      if (rotationUtils.needsToStopRotate(currentRotation, targetRotation,
                                          robotMovingData.rotationSpeed,
                                          storage.getCurrentSpeed(deviceName).value)) {
        stopRobot(deviceName, completion);
      }
      break;
    case false:
      /* we are already at the target degrees */
      if (!rotationUtils.needsToRotate(currentRotation, targetRotation)) {
        targetRotationMap[deviceName] = null;
        if (completion != null) {
          completion();
        }
        return;
      }
      rotationUtils.rotateRobot(deviceName, currentRotation, targetRotation, robotMovingData);
      break;
    default:
      robotMovingData.shouldBeMoving = robotMovingData.moving = false;
      /* repeat function now that we have init this robot moving */
      testIfRobotShouldRotate(deviceName);
  }
}

function afterRotateComplete(deviceName) {
  if (rotationUtils.needsToRotate(latestRotationMap[deviceName], targetRotationMap[deviceName]) &&
      robotMoveData[deviceName].attempts < maxAttempts) {
    makeRotationAdjustment(deviceName, true);
  } else {
    targetRotationMap[deviceName] = null;
    robotMoveData[deviceName].shouldBeMoving = false;
    robotMoveData[deviceName].makingAdjustments = false;
    storage.storeEvent(deviceName, storage.EventEnum.COMPLETE);
  }
}

function makeRotationAdjustment(deviceName, firstCall) {
  if (!robotMoveData[deviceName].makingAdjustments) return;
  if (firstCall) {
    var robotSpeed = storage.getCurrentSpeed(deviceName).value;
    var adjustmentLengthMs = (rotationUtils.optimisedForSpeed * baseAdjustmentLengthMs) / robotSpeed;
    robotMoveData[deviceName].attempts++;

    rotationUtils.rotateRobot(deviceName, latestRotationMap[deviceName],
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

function testIfRobotShouldMove(deviceName) {
  initMovingData(deviceName);

}

function stopRobot(deviceName, completion) {
  var ID = particle.getDeviceIDFromName(deviceName);
  particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_STOP);
  robotMoveData[deviceName].makingAdjustments = true;
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

  addNewLocationData: function (deviceName, location, rotation, rotationSpeed) {
    if ("x" in location && "y" in location) {
      latestLocationMap[deviceName] = location;
      latestRotationMap[deviceName] = rotation;
      robotMoveData[deviceName].rotationSpeed = rotationSpeed;
      testForHistoricalUpdate({deviceName:deviceName, location:location, rotation:rotation});
    }
    if (storage != null) {
      storage.resetHazardData();
    }
    lastUpdateTimeMs = new Date().getTime();
    testIfRobotShouldRotate(deviceName, function() {afterRotateComplete(deviceName)});
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
    if (particle.isRobotAvailable(deviceName)) {
      targetLocationMap[deviceName] = location;
    }
  },

  setTargetRotation: function (deviceName, rotation) {
    initMovingData(deviceName);

    if (particle.isRobotAvailable(deviceName)) {
      robotMoveData[deviceName].startRotation = 0;
      robotMoveData[deviceName].startMoveTimeMs = 0;

      targetRotationMap[deviceName] = rotation;
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
    robotMoveData[deviceName].shouldBeMoving = false;
    robotMoveData[deviceName].makingAdjustments = false;
    targetLocationMap[deviceName] = null;
    targetRotationMap[deviceName] = null;
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
        robotMovingData.intervalId = setInterval(function() { stopRobotIfRequired(deviceName) }, moveTimeThresholdMs);
      }
    }
  }
};