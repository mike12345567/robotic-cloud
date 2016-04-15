var utils = require("./utils.js");
var particle = require("./particle-calls.js");

var differenceNoRotation = 5;      // MUST NOT BE ZERO
var baseDistanceStopRotate = 40;

var differenceNoMovement = 50;

function baseNeedsToRotate(currentRotation, targetRotation, threshold) {
  var angle = module.exports.calculateAngleDifference(currentRotation, targetRotation);
  if (angle < 0) angle *= -1;
  return angle > threshold;
}

function bounds(start, current, end) {
  return (start <= end && current >= end) || (start >= end && current <= end);
}

module.exports = {
  optimisedForSpeed: 160,

  needsToStopRotate: function(currentRotation, targetRotation, rotationSpeed, currentSpeed) {
    var angle = this.calculateAngleDifference(currentRotation, targetRotation);
    if (angle < 0) angle *= -1;
    var speed = (currentSpeed * baseDistanceStopRotate) / this.optimisedForSpeed;
    var stopDistance = rotationSpeed - speed;
    if (stopDistance < baseDistanceStopRotate) stopDistance = baseDistanceStopRotate;

    return angle < stopDistance;
  },

  signedMod: function(a, n) { return (a % n + n) % n; },

  calculateAngleDifference: function(currentRotation, targetRotation) {
    var angle  = targetRotation - currentRotation;
    angle = this.signedMod(angle + 180, 360) - 180;
    return angle;
  },

  calculateNormalisedDifference: function(intOne, intTwo) {
    var output = intOne - intTwo;
    if (output < 0) output *= -1;
    return output;
  },

  whichDirectionToRotate: function(currentRotation, targetRotation) {
    if (this.calculateAngleDifference(currentRotation, targetRotation) > 0) {
      return utils.MovementEndpointsEnum.DIRECTION_TURN_LEFT;
    } else {
      return utils.MovementEndpointsEnum.DIRECTION_TURN_RIGHT;
    }
  },

  /* threshold for rotation being complete */
  needsToRotate: function(currentRotation, targetRotation) {
    if (targetRotation == null) return false;
    return baseNeedsToRotate(currentRotation, targetRotation, differenceNoRotation);
  },

  needsToMove: function(currentLocation, targetLocation) {
    if (targetLocation == null) return false;
    var xDiff = this.calculateNormalisedDifference(currentLocation.x, targetLocation.x);
    var yDiff = this.calculateNormalisedDifference(currentLocation.y, targetLocation.y);

    return xDiff + yDiff > differenceNoMovement;
  },

  rotateRobot: function(deviceName, currentRotation, targetRotation, robotMovingData) {
    var ID = particle.getDeviceIDFromName(deviceName);
    particle.particlePost(ID, this.whichDirectionToRotate(currentRotation, targetRotation));
    robotMovingData.shouldBeMoving = true;
    robotMovingData.turning = true;
  },

  moveRobot: function(deviceName, robotMovingData) {
    var ID = particle.getDeviceIDFromName(deviceName);
    particle.particlePost(ID, utils.MovementEndpointsEnum.DIRECTION_FORWARD);
    robotMovingData.shouldBeMoving = true;
    robotMovingData.turning = false;
  },

  calculateRotationToFacePoint: function(currentLocation, targetLocation) {
    var x = targetLocation.x - currentLocation.x;
    var y = targetLocation.y - currentLocation.y;

    var baseAngle = 90 - Math.atan2( y, x ) * (180 / Math.PI);
    if (baseAngle < 0) {
      baseAngle += 360;
    }

    baseAngle -= 180;

    if (baseAngle < 0) {
      baseAngle = 360 + baseAngle; // removing the base angle
    }

    return baseAngle;
  },

  hasPassedLocation: function (startLocation, currentLocation, targetLocation) {
    if (startLocation == null || currentLocation == null || targetLocation == null) return true;

    return (bounds(startLocation.x, currentLocation.x, targetLocation.x) ||
            bounds(startLocation.y, currentLocation.y, targetLocation.y));
  }
};
