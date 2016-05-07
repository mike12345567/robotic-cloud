var util = require("./utils.js");
var websocket, locationData;
// avoid cyclic dependency issues with node require
setTimeout(function() {
  websocket = require("./websocket.js");
  locationData = require("./location.js");
}, 100);

var latestEventType;

var distanceMap     = [];
var eventMap        = [];
var calibrationMap  = [];
var gyroReadingsMap = [];
var deadRobotsMap   = [];
var localIPsMap     = [];
var currentHazards  = [];

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

  EventEnum: {
    COMPLETE            : "complete",
    CALIBRATION_VALUES  : "calibrationValues",
    ULTRASONIC_VALUES   : "distanceCm",
    STOPPED             : "stopped",
    GYRO_READING_VALUES : "gyroscopeReadings",
    STATUS              : "spark/status",
    FAILED              : "failed",
    HAS_FAILED          : "hasFailed",
    LOCAL_IP            : "localIP",
    MOVE_STATUS         : "moveStatus" // NOT PUSHED OUT OF API
  },

  setRobotAsDead: function (deviceName) {
    var deadObject = {};
    deadObject.alive = false;
    deadObject.deadAt = util.getDateNow();
    deadRobotsMap[deviceName] = deadObject;
  },

  setRobotAsAlive: function (deviceName) {
    var deadObject = {};
    deadObject.alive = true;
    deadObject.deadAt = "n/a";
    deadRobotsMap[deviceName] = deadObject;
  },

  getRobotHealthStatus: function (deviceName) {
    if (deadRobotsMap[deviceName] == null) {
      this.setRobotAsAlive(deviceName);
    }

    return {type: "health", value : deadRobotsMap[deviceName]};
  },

  storeEvent: function (deviceName, eventName) {
    var date = new Date();
    var time = date.getTime();
    addToMap(deviceName, eventMap, eventName, eventName + " event at:" + time.toString());
    latestEventType = eventName;
    websocket.needsUpdated(deviceName, websocket.WebSocketUpdateEnum.EVENT);
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
    websocket.needsUpdated(deviceName, websocket.WebSocketUpdateEnum.DISTANCE);
  },

  storeGyroReadings: function (deviceName, array) {
    var i = 0;

    for (var property in this.GyroReadingsEnum) {
      var value = array[i++] | array[i++] << 8 | array[i++] << 16 | array[i++] << 24;
      addToMap(deviceName, gyroReadingsMap, this.GyroReadingsEnum[property], value);
    }
    websocket.needsUpdated(deviceName, websocket.WebSocketUpdateEnum.GYRO_READING);
  },

  storeLocalIP: function (deviceName, IP) {
    var ipString = IP[3] + "." + IP[2] + "." + IP[1] + "." + IP[0];
    localIPsMap[deviceName] = {ip: ipString};
  },

  getLocalIP: function(deviceName) {
    return localIPsMap[deviceName].ip;
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

  getAllGyroReadings: function (deviceName) {
    return getAllDataFromMap(deviceName, gyroReadingsMap);
  },

  getLatestGyroReading: function(deviceName) {
    return getLatestDataFromMap(deviceName, gyroReadingsMap);
  },

  getAllEvents: function (deviceName) {
    return getAllDataFromMap(deviceName, eventMap);
  },

  getEventsFromTimestamp: function (deviceName, timestamp) {
    var array = [];
    var idx = 0;

    for (var key in eventMap[deviceName]) {
      for (var i = 0; i < eventMap[deviceName][key].length; i++) {
        var element = eventMap[deviceName][key][i];
        if (element != null && "rawTimestamp" in element && element.rawTimestamp >= timestamp) {
          array[idx++] = element;
        }
      }
    }
  },

  getLatestEvent: function (deviceName) {
    return getLatestDataFromMapByKey(deviceName, eventMap, latestEventType);
  },

  getAllCalibration: function (deviceName) {
    return getAllDataFromMap(deviceName, calibrationMap);
  },

  getAllLocationData: function(deviceName) {
    return locationData.getHistoricalLocationData(deviceName);
  },

  getLatestLocation: function(deviceName) {
    return {value: locationData.getCurrentLocation(deviceName)};
  },

  getLatestRotation: function(deviceName) {
    return {value: locationData.getCurrentRotation(deviceName)};
  },
  
  storeHazardData: function(data) {
    if (data != null) {
      var hazardCount = 0;
      currentHazards = [];
      var hazardElement = null;
      do {
        var key = "hazard" + (hazardCount+1);
        if (data[hazardCount] != null && key in data[hazardCount]) {
          hazardElement = data[hazardCount][key];
          currentHazards[key] = hazardElement;
        } else {
          hazardElement = null;
        }
        hazardCount++;
      } while (hazardElement != null);
      websocket.needsUpdated("all", websocket.WebSocketUpdateEnum.HAZARD);
    }
  },
  
  getHazardData: function() {
    return currentHazards;
  },

  resetHazardData: function() {
    currentHazards = [];
  },

  getCurrentSpeed: function(deviceName) {
    if (calibrationMap[deviceName] == null) return 0;
    return calibrationMap[deviceName][this.CalibrationEnum.SPEED][0];
  },

  deviceUsingLocal: function(deviceName, enabled) {
    if (localIPsMap[deviceName] == null) {
      localIPsMap[deviceName] = {};
    }
    localIPsMap[deviceName].enabled = enabled;
  },

  isDeviceUsingLocal: function(deviceName) {
    if (localIPsMap[deviceName] == null) {
      localIPsMap[deviceName] = {enabled: true};
    }

    if (localIPsMap[deviceName].enabled == null) {
      localIPsMap[deviceName].enabled = true;
    }

    return localIPsMap[deviceName].enabled;
  }

};

function getLatestDataFromMap(deviceName, map) {
  var array = [];

  if (map[deviceName] == null) {
    return null;
  }

  for (var key in map[deviceName]) {
    array[key] = map[deviceName][key][map[deviceName][key].length-1];
  }
  return array;
}

function getLatestDataFromMapByKey(deviceName, map, key) {
  var array = [];

  if (map[deviceName] == null || map[deviceName][key] == null) {
    return null;
  }

  array[key] = map[deviceName][key][map[deviceName][key].length-1];
  return array;
}

function getAllDataFromMap(deviceName, map) {
  var array = [];

  for (var key in map[deviceName]) {
    initMap(array, key);
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

function initMap(array, key) {
  if (array[key] == null || array[key] == undefined) {
    array[key] = [];
  }
}

function addToMap(deviceName, map, key, value) {
  initMap(map, deviceName);
  initMap(map[deviceName], key);

  var obj = {value : value, timestamp : util.getDateNow(), rawTimestamp : new Date().getTime()};
  map[deviceName][key].push(obj);
}

// only one value, no need for timestamps
function overwriteToMap(deviceName, map, key, value) {
  initMap(map, deviceName);
  initMap(map[deviceName], key);

  var obj = {value : value};
  map[deviceName][key] = [];
  map[deviceName][key].push(obj);
}