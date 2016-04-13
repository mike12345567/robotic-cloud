var utils = require("./utils.js");

var differenceNoRotation = 5;      // MUST NOT BE ZERO
var baseDistanceStopRotate = 40;

module.exports = {
  optimisedForSpeed: 140,

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

  whichDirectionToRotate: function(currentRotation, targetRotation) {
    if (this.calculateAngleDifference(currentRotation, targetRotation) > 0) {
      return utils.MovementEndpointsEnum.DIRECTION_TURN_LEFT;
    } else {
      return utils.MovementEndpointsEnum.DIRECTION_TURN_RIGHT;
    }
  },

  /* threshold for rotation being complete */
  needsToRotate: function(currentRotation, targetRotation) {
    var angle = this.calculateAngleDifference(currentRotation, targetRotation);
    if (angle < 0) angle *= -1;
    return angle > differenceNoRotation;
  }
};
