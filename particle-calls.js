var accessToken = "d451f895e6d72efc774b82b6de71bed6ba43522c";
var functionName = 'makeMove';

var storage = require('./storage.js');
var base64js = require('./b64.js');
var http = require('http');
var utils = require('./utils.js');

/*******************
 *    RUN QUEUE    *
 *******************/
// commands to be sent more slowly
var queue = [];
// whole commands that could not be sent
var notConnectedQueue = [];

setTimeout(queueOnInterval, 500);
function queueOnInterval() {
  if (queue.length != 0) {
    var object = queue[0];
    queue.splice(0);
    module.exports.particlePost(object.id, object.cmd, object.data);
  }

  var deviceArray = module.exports.deviceArray;
  if (deviceArray != null && deviceArray != undefined) {
    for (var i = 0; i < deviceArray.length; i++) {
      var device = deviceArray[i];
      if (module.exports.isRobotIDAvailable(device.id) && notConnectedQueue[device.id] != null) {
        for (var j = 0; j < notConnectedQueue[device.id].length; j++) {
          var object = notConnectedQueue[device.id][j];
          module.exports.loadToQueue(device.id, object);
        }
        // empty the queue for the device
        notConnectedQueue[device.id] = [];
      }
    }
  }
  setTimeout(queueOnInterval, 500);
}

/*******************
 *  INIT PARTICLE  *
 *******************/
var Particle = require('particle-api-js');
var particle = new Particle();
updateDevices();
openEventStream();

EventEnum = {
  COMPLETE            : "complete",
  CALIBRATION_VALUES  : "calibrationValues",
  ULTRASONIC_VALUES   : "distanceCm",
  STOPPED             : "stopped",
  GYRO_READING_VALUES : "gyroscopeReadings",
  STATUS              : "spark/status",
  FAILED              : "failed",
  HAS_FAILED          : "hasFailed"
};

/********************
 *  PARTICLE EVENTS *
 ********************/
function openEventStream() {
  particle.getEventStream({deviceId: 'mine', auth: accessToken}).then(function(stream) {
    stream.on('event', function(data) {
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
        case EventEnum.STATUS:
          updateDevices();
          break;
        case EventEnum.FAILED:
          storage.storeEvent(name, EventEnum.FAILED);
          storage.setRobotAsDead(name);
          break;
        case EventEnum.HAS_FAILED:
          storage.storeEvent(name, EventEnum.HAS_FAILED);
          storage.setRobotAsDead(name);
          break;
        default:
          console.log("EVENT UNHANDLED!");
      }
    });
    stream.on('end', function() {
      console.log("ended!  re-opening in 3 seconds...");
      setTimeout(openEventStream, 3 * 1000);
    });
  });
}

function updateDevices() {
  var deviceList = particle.listDevices({auth: accessToken});
  deviceList.then(doneDeviceList, errorDeviceList);
}

function doneDeviceList (devices) {
  module.exports.deviceArray = devices.body;
  console.log("GOT DEVICES");
  module.exports.updateCalibrationValues("all");
}
function errorDeviceList (err) {
  console.log("FAILED TO GET DEVICES - " + err.description);
  process.exit();
}

function getDeviceByID(ID) {
  var deviceArray = module.exports.deviceArray;
  for (var i = 0; i < deviceArray.length; i++) {
    if (deviceArray[i].id == ID) {
      return deviceArray[i];
    }
  }
  return null;
}

function postData(ID, string) {
  if (!module.exports.isRobotIDAvailable(ID)) {
    if (notConnectedQueue[ID] == null || notConnectedQueue[ID] == undefined) {
      notConnectedQueue[ID] = [];
    }
    notConnectedQueue[ID][notConnectedQueue[ID].length] = string;
  } else {
    var postCall = particle.callFunction({
      deviceId: ID, name: functionName,
      argument: string, auth: accessToken
    });
    postCall.then(function (data) {
      console.log("COMPLETED POST - " + data.toString());
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('Response: ' + chunk);
      });
    }, function (err) {
      console.log("FAILED TO POST - " + string + " - " + err.errorDescription + " - " + err.info);
    });
  }
}

module.exports = {
  isRobotAvailable: function(deviceName) {
    return getDeviceByID(this.getDeviceIDFromName(deviceName)).connected;
  },

  isRobotIDAvailable: function(deviceID) {
    return getDeviceByID(deviceID).connected;
  },

  loadToQueue: function(deviceID, cmd) {
    /* don't repeat some specific commands */
    for (var i = 0; i < queue.length; i++) {
      if (utils.isNoRepeatEndpoint(queue[i].cmd)) {
        return;
      }
    }

    var object = {};
    object.id = deviceID;
    object.cmd = cmd;
    object.data = [];
    if (arguments.length > 2 && cmd != null) {
      var dataCount = 0;
      for (var arg = 2; arg < arguments.length; arg++) {
        if (arguments[arg] == null) continue;
        object.data[dataCount++] = arguments[arg];
      }
    }
    queue[queue.length] = object;
  },

  particlePost: function particlePost(deviceID, cmd) {
    var dataString = cmd;

    if (arguments.length > 2 && cmd != null) {
      for (var arg = 2; arg < arguments.length; arg++) {
        if (arguments[arg] == null) continue;
        dataString += "," + arguments[arg];
      }
    }

    if (deviceID != "all") {
      postData(deviceID, dataString);
    } else {
      var deviceArray = module.exports.deviceArray;
      for (var i = 0; i < deviceArray.length; i++) {
        postData(deviceArray[i].id, dataString);
      }
    }
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

  getDeviceNameFromID: function getDeviceNameFromID(ID) {
    var deviceArray = module.exports.deviceArray;
    if (deviceArray == null) {
      return "";
    }
    for (var i = 0; i < deviceArray.length; i++) {
      if (deviceArray[i].id == ID) {
        return deviceArray[i].name;
      }
    }
    return "";
  },

  getAllDeviceNames: function getAllDeviceNames() {
    var array = [];
    var deviceArray = module.exports.deviceArray;
    for (var i = 0; i < deviceArray.length; i++) {
      array.push(deviceArray[i].name);
    }
    return array;
  },

  updateCalibrationValues: function updateCalibrationValues(ID) {
    if (ID == "all") {
      var deviceArray = module.exports.deviceArray;
      for (var i = 0; i < deviceArray.length; i++) {
        var device = deviceArray[i];
        this.particlePost(device.id, utils.OtherEndpointsEnum.GET_CALIBRATION);
      }
    } else {
      this.particlePost(ID, utils.OtherEndpointsEnum.GET_CALIBRATION);
    }
  }
};