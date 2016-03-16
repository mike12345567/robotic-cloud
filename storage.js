var util = require("./utils.js");
var locationData = require("./location.js");

var distanceMap = [];
var eventMap = [];
var calibrationMap = [];
var gyroReadingsMap = [];
var deadRobotsMap = [];
var maxGyroRead = 22000;

module.exports = {
  UltrasonicPosEnum: {
    US_POS_FRONT : "posFront"
  },

  CalibrationEnum: {
    SPEED           : "speed",
    CAL_RIGHT_WHEEL : "rightWheel",
    CAL_LEFT_WHEEL  : "leftWheel",
    CAL_TURNING     : "turning",
    CAL_FRICTION    : "friction",
    CAL_DIR_LEFT    : "directionLeft",
    CAL_DIR_RIGHT   : "directionRight"
  },

  GyroReadingsEnum: {
    GYRO_A_X : "gyroAX",
    GYRO_A_Y : "gyroAY",
    GYRO_A_Z : "gyroAZ",
    GYRO_G_X : "gyroGX",
    GYRO_G_Y : "gyroGY",
    GYRO_G_Z : "gyroGZ"
  },

  setRobotAsDead: function (deviceName) {
    initArray(deadRobotsMap, deviceName);
    var deadObject = {};
    deadObject.alive = false;
    deadObject.deadAt = new Date().getTime();
    deadRobotsMap[deviceName] = deadObject;
  },

  setRobotAsAlive: function (deviceName) {
    initArray(deadRobotsMap, deviceName);
    var deadObject = deadRobotsMap[deviceName];
    if (deadObject == null) {
      deadObject = {};
    }
    deadObject.alive = true;
    deadObject.deadAt = null;
  },

  getRobotHealthStatus: function (deviceName) {
    initArray(deadRobotsMap, deviceName);
    return deadRobotsMap[deviceName];
  },

  storeEvent: function (deviceName, eventName) {
    var date = new Date();
    var time = date.getTime();
    addToMap(deviceName, eventMap, eventName, eventName + " event at:" + time.toString());
  },

  storeCalibration: function (deviceName, array) {
    var i = 0;

    for (var property in this.CalibrationEnum) {
      overwriteToMap(deviceName, calibrationMap, this.CalibrationEnum[property], array[i++] | (array[i++] << 8));
    }
  },

  storeDistances: function (deviceName, array) {
    var i = 0;

    for (var property in this.UltrasonicPosEnum) {
      addToMap(deviceName, distanceMap, this.UltrasonicPosEnum[property], array[i++] | (array[i++] << 8));
    }
  },

  storeGyroReadings: function (deviceName, array) {
    var i = 0;

    for (var property in this.GyroReadingsEnum) {
      var value = array[i++] | array[i++] << 8;
      if (value > maxGyroRead) {
        value -= 0x10000;
      }
      addToMap(deviceName, gyroReadingsMap, this.GyroReadingsEnum[property], value);
    }
  },

  getLatestDistance: function (deviceName) {
    return getLatestDataFromMap(deviceName, distanceMap);
  },

  getAllDistances: function (deviceName) {
    return getAllDataFromMap(deviceName, distanceMap);
  },

  getDistancesByKey: function (deviceName, key) {
    return getAllKeyDataFromMap(deviceName, key, map);
  },

  getAllEvents: function (deviceName) {
    return getAllDataFromMap(deviceName, eventMap);
  },

  getLatestEvent: function (deviceName) {
    return getLatestDataFromMap(deviceName, eventMap);
  },

  getAllCalibration: function (deviceName) {
    return getAllDataFromMap(deviceName, calibrationMap);
  },

  getAllLocationData: function(deviceName) {
    return locationData.getHistoricalLocationData(deviceName);
  }
};

function getLatestDataFromMap(deviceName, map) {
  var array = [];
  var idx = 0;

  for (var key in map[deviceName]) {
    initArray(array, key);
    array[key][0] = map[deviceName][key][map[deviceName][key].length-1];
  }
  return array;
}

function getAllDataFromMap(deviceName, map) {
  var array = [];
  var idx = 0;

  for (var key in map[deviceName]) {
    initArray(array, key);
    for (var j = 0; j < map[deviceName][key].length; j++) {
      array[key][j] = map[deviceName][key][j];
    }
  }
  return array;
}

function getAllKeyDataFromMap(deviceName, key, map) {
  var array = [];
  var idx = 0;

  for (var i = 0; i < map[deviceName][key].length; i++) {
    array[idx++] = map[deviceName][key][i];
  }
}

function initArray(array, key) {
  if (array[key] == null || array[key] == undefined) {
    array[key] = [];
  }
}

function addToMap(deviceName, map, key, value) {
  initArray(map, deviceName);
  initArray(map[deviceName], key);

  var obj = {"value" : value, "timestamp" : util.getDateNow()};
  map[deviceName][key].push(obj);
}

function overwriteToMap(deviceName, map, key, value) {
  initArray(map, deviceName);
  initArray(map[deviceName], key);

  var obj = {"value" : value};
  map[deviceName][key] = [];
  map[deviceName][key].push(obj);
}