var distanceMap = new Array;
var eventMap = new Array;
var calibrationMap = new Array;

UltrasonicPosEnum = {
    US_POS_FRONT : "posFront"
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