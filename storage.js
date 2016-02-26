var distanceMap = new Array;
var eventMap = new Array;
var calibrationMap = new Array;
var gyroReadingsMap = new Array;
var maxGyroRead = 22000;

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

GyroReadingsEnum = {
  GYRO_A_X : "gyroAX",
  GYRO_A_Y : "gyroAY",
  GYRO_A_Z : "gyroAZ",
  GYRO_G_X : "gyroGX",
  GYRO_G_Y : "gyroGY",
  GYRO_G_Z : "gyroGZ"
};

module.exports = {
  storeEvent: function (deviceName, eventName) {
    var date = new Date();
    var time = date.getTime();
    addToMap(deviceName, eventMap, eventName, eventName + " event at:" + time.toString());
  },

  storeCalibration: function (deviceName, array) {
    var i = 0;

    for (var property in CalibrationEnum) {
      addToMap(deviceName, calibrationMap, property, array[i++] | (array[i++] << 8));
    }
  },

  storeDistances: function (deviceName, array) {
    var i = 0;

    for (var property in UltrasonicPosEnum) {
      addToMap(deviceName, distanceMap, property, array[i++] | (array[i++] << 8));
    }
  },

  storeGyroReadings: function (deviceName, array) {
    var i = 0;

    for (var property in GyroReadingsEnum) {
      var value = array[i++] | array[i++] << 8;
      if (value > maxGyroRead) {
        value -= 0x10000;
      }
      addToMap(deviceName, gyroReadingsMap, property, value);
    }
  },

  getFromMap: function (deviceName, map, key) {
    return map[deviceName][key];
  },

  getAllLatestDistances: function (deviceName) {
    return getAllDataFromMap(deviceName, distanceMap);
  }
};

function getAllDataFromMap(deviceName, map) {
  var array = new Array();
  var i = 0;
  for (var keys in map[deviceName]) {
    array[i++] = map[deviceName][keys];
  }
  return array;
}

function addToMap(deviceName, map, key, value) {
  if (map[deviceName] == null || map[deviceName] == undefined) {
    map[deviceName] = new Array;
  }
  
  map[deviceName][key] = value;
}