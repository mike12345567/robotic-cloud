var accessToken = "d451f895e6d72efc774b82b6de71bed6ba43522c";
var functionName = 'makeMove';

var storage = require('./storage.js');
var base64js = require('./b64.js');
var http = require('http');

/*******************
 *  INIT PARTICLE  *
 *******************/
var Particle = require('particle-api-js');
var particle = new Particle();
var deviceList = particle.listDevices({auth: accessToken});
deviceList.then(function(devices) {
  for (var i = 0; i < devices.length; i++) {
    var device = devices[i];
    var name = device.attributes.name;
    device.onEvent(EventEnum.COMPLETE, function(data) {
      storage.storeEvent(name, EventEnum.COMPLETE);
    });

    device.onEvent(EventEnum.STOPPED, function(data) {
      storage.storeEvent(name, EventEnum.STOPPED);
    });

    device.onEvent(EventEnum.CALIBRATION_VALUES, function(data) {
      var temp = base64js.toByteArray(data.data);
      storage.storeCalibration(name, temp);
    });

    device.onEvent(EventEnum.ULTRASONIC_VALUES, function(data) {
      var temp = base64js.toByteArray(data.data);
      storage.storeDistances(name, temp);
    });
  }
  module.exports = {deviceArray : devices.body};
  console.log("INIT COMPLETE");
}, function(err){
  console.log("FAILED TO GET DEVICES - " + err.description);
  process.exit();
});

EventEnum = {
  COMPLETE : "complete",
  CALIBRATION_VALUES : "calibrationValues",
  ULTRASONIC_VALUES: "distanceCm",
  STOPPED : "stopped"
};

/********************
 *  PARTICLE EVENTS *
 ********************/


module.exports = {
  particleGet: function particleGet(url, options) {

  },

  particlePost: function particlePost(deviceID, cmd) {
    var dataString = cmd;

    if (arguments.length > 2 && cmd != null) {
      for (var arg = 2; arg < arguments.length; arg++) {
        if (arguments[arg] == null) continue;
        dataString += "," + arguments[arg];
      }
    }

    var postCall = particle.callFunction({ deviceId: deviceID, name: functionName,
                                           argument: dataString, auth: accessToken });
    postCall.then(function(data){
      console.log("COMPLETED POST - " + data);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('Response: ' + chunk);
      });
    }, function(err) {
      console.log("FAILED TO POST - " + dataString + " - " + err.errorDescription);
    });
  },

  getDeviceIDFromName: function getDeviceIDFromName(name) {
    var deviceArray = module.exports.deviceArray;
    if (deviceArray == null) {
      return "";
    }
    for (var i = 0; i < deviceArray.length; i++) {
      if (deviceArray[i].name == name) {
        return deviceArray[i].id;
      }
    }
    return "";
  },

  getAllDeviceNames: function getAllDeviceNames() {
    var array = new Array;
    var deviceArray = module.exports.deviceArray;
    for (var i = 0; i < deviceArray.length; i++) {
      array.push(deviceArray[i].name);
    }
    return array;
  }
};