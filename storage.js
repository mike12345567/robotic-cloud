var distanceMap = new Array;
var eventMap = new Array;
var calibrationMap = new Array;

UltrasonicPosEnum = {
    US_POS_FRONT : "posFront"
};

ButtonEnum = {
  FORWARD : {cmd: "forward", btnName: "forward-btn"},
  BACKWARD : {cmd: "backward", btnName: "backward-btn"},
  TURN_LEFT : {cmd: "turnLeft", btnName: "left-turn-btn"},
  TURN_RIGHT : {cmd: "turnRight", btnName: "right-turn-btn"},
  STOP : {cmd: "stop", btnName: "stop-btn"},
  SEND_SPEED : {cmd: "setSpeed", btnName: "send-speed-btn"},
  CAL_TURNING : {cmd: "calibrateTurning", btnName: "cal-turning-btn"},
  CAL_WHEELS : {cmd: "calibrateSpeed", btnName: "cal-wheels-btn"},
  CAL_FRICTION : {cmd: "calibrateFriction", btnName: "cal-friction-btn"}
};

JoystickEnum = {
  JOY_FWD : { cmd: "forward", btnName: "joy-fwd-btn"},
  JOY_LEFT : { cmd: "turnLeft", btnName: "joy-left-btn"},
  JOY_RIGHT : { cmd: "turnRight", btnName: "joy-right-btn"},
  JOY_BACK : { cmd: "backward", btnName: "joy-back-btn"}
};

InputEnum = {
  DISTANCE : "distance-input",
  SPEED : "speed-input",
  ROTATION:  "rotation-input",
  UNIT : "unit-input",
  CAL_LEFT_WHEEL : "left-wheel-input",
  CAL_RIGHT_WHEEL : "right-wheel-input",
  CAL_TURNING : "turning-cal-input",
  CAL_FRICTION : "friction-input",
  DIST_FRONT : "dist-front-output",
  EVENTS : "event-area"
};

CalibrationEnum = {
    SPEED : "speed",
    CAL_RIGHT_WHEEL : "rightWheel",
    CAL_LEFT_WHEEL : "leftWheel",
    CAL_TURNING : "turning",
    CAL_FRICTION : "friction"
};

module.exports = {
    storeEvent: function (deviceName, eventName) {
        var date = new Date();
        var time = date.getTime();
        addToMap(deviceName, eventMap, eventName, eventName + " event at:" + time.toString());
    },

    storeCalibration: function (deviceName, array) {
        var i = 0;

      addToMap(deviceName, calibrationMap, CalibrationEnum.SPEED, array[i++] | (array[i++] << 8));
      addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_RIGHT_WHEEL, array[i++] | (array[i++] << 8));
      addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_LEFT_WHEEL, array[i++] | (array[i++] << 8));
      addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_TURNING, array[i++] | (array[i++] << 8));
      addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_FRICTION, array[i++] | (array[i++] << 8));
    },

    storeDistances: function (deviceName, array) {
      var i = 0;

    addToMap(deviceName, distanceMap, UltrasonicPosEnum.US_POS_FRONT, array[i++] | (array[i++] << 8));
  }
};

function addToMap(deviceName, map, key, value) {
if (map[deviceName] == null) {
    map[deviceName] = new Array;
}
map[deviceName][key].push(value);
}