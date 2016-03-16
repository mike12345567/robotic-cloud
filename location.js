var util = require("./utils.js");
var historicalWindowMs = 5000;
var lastLocationEntryTimeMs = 0;

HistoricalKeyEnum = {
  LOCATION_DATA : "location"
};

var latestLocationMap = [];
var latestRotationMap = [];
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
      historicalData[deviceName][key][length] = {};
      historicalData[deviceName][key][length].value = {coordinates:location, rotation:rotation};
      historicalData[deviceName][key][length].timestamp = timeNow;
      lastLocationEntryTimeMs = timeNow;
    }
  }
}

module.exports = {
  addNewLocationData: function (deviceName, location, rotation) {
    if ("x" in location && "y" in location) {
      latestLocationMap[deviceName] = location;
      latestRotationMap[deviceName] = rotation;
      testForHistoricalUpdate({deviceName:deviceName, location:location, rotation:rotation});
    }
  },

  getCurrentLocation: function (deviceName) {
    return latestLocationMap[deviceName];
  },

  getCurrentRotation:function (deviceName) {
    return latestRotationMap[deviceName];
  },

  getHistoricalLocationData: function (deviceName) {
    return historicalData[deviceName];
  }
};