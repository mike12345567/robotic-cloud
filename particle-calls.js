var accessToken = "d451f895e6d72efc774b82b6de71bed6ba43522c";
var functionName = 'makeMove';

var storage = require('./storage.js');
var base64js = require('./b64.js');
var http = require('http');

/*******************
 *  INIT PARTICLE  *
 *******************/
var particle = require('spark');

EventEnum = {
  COMPLETE : "complete",
  CALIBRATION_VALUES : "calibrationValues",
  ULTRASONIC_VALUES: "distanceCm",
  STOPPED : "stopped",
  GYRO_READING_VALUES : "gyroscopeReadings"
};

/********************
 *  PARTICLE EVENTS *
 ********************/
function openEventStream() {
  var req = particle.getEventStream("", "mine", function (data) {
    console.log("EVENT - " + data.name + " - " + data.published_at);
    var name = module.exports.getDeviceNameFromID(data.coreid);
    switch (data.name) {
      case EventEnum.COMPLETE:
        storage.storeEvent(name, EventEnum.COMPLETE);
        break;
      case EventEnum.STOPPED:
        storage.storeEvent(name, EventEnum.STOPPED);
        break;
      case EventEnum.CALIBRATION_VALUES:
        var temp = base64js.toByteArray(data.data);
        storage.storeCalibration(name, temp);
        break;
      case EventEnum.ULTRASONIC_VALUES:
        var temp = base64js.toByteArray(data.data);
        storage.storeDistances(name, temp);
        break;
      case EventEnum.GYRO_READING_VALUES:
        var temp = base64js.toByteArray(data.data);
        storage.storeGyroReadings(name, temp);
        break;
      default:
        console.log("EVENT UNHANDLED!");
    }
  });

  req.on('end', function() {
    console.log("ended!  re-opening in 3 seconds...");
    setTimeout(openEventStream, 3 * 1000);
  });
}

var promise = particle.login({accessToken:accessToken});
promise.then(function() {
  var devicesList = particle.listDevices();
  devicesList.then(function (devices) {
    var deviceArray = devices;
    module.exports.deviceArray = deviceArray;
    console.log("INIT COMPLETE");
  }, function (err) {
    console.log("FAILED TO GET DEVICES - " + err.description);
    process.exit();
  });

  openEventStream();
});



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
      if (deviceArray[i].attributes.name == name) {
        return deviceArray[i].id;
      }
    }
    return "";
  },

  getDeviceNameFromID: function getDeviceNameFromID(ID) {
    var deviceArray = module.exports.deviceArray;
    if (deviceArray == null) {
      return "";
    }
    for (var i = 0; i < deviceArray.length; i++) {
      if (deviceArray[i].id == ID) {
        return deviceArray[i].attributes.name;
      }
    }
    return "";
  },

  getAllDeviceNames: function getAllDeviceNames() {
    var array = new Array;
    var deviceArray = module.exports.deviceArray;
    for (var i = 0; i < deviceArray.length; i++) {
      array.push(deviceArray[i].attributes.name);
    }
    return array;
  }
};