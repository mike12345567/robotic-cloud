var WebSocketServer = require("ws").Server;
var server = new WebSocketServer({ port: 4201 });
var serializer = require("./serializer.js");
var utils = require("./utils.js");
var storage, particle;

setTimeout(function() {
  // delay loading some scripts which could have cyclic dependencies
  storage = require("./storage.js");
  particle = require("./particle-calls.js");
}, 50);

var socketMap = []; // primary key by deviceName, contains an array of sockets

server.on("connection", function (socket) {
  var deviceName;

  socket.on("message", function(message) {
    var obj = JSON.parse(message);
    if ("deviceName" in obj) {
      if (deviceName != null) removeFromSocketMap(deviceName, socket);
      deviceName = handleDeviceName(obj, socket);
    } else { // this must be a message from a computer vision system
      // we don't need to store the socket as we won't reply
      handleLocationData(obj);
    }
  });

  socket.on('close', function(code, message) {
    removeFromSocketMap(deviceName, socket);
  });
});

function removeFromSocketMap(deviceName, socket) {
  if (socketMap[deviceName] == null) return;
  var index = socketMap[deviceName].indexOf(socket);
  if (index >= 0) {
    socketMap[deviceName].splice(index, 1);
  }
}

function handleDeviceName(data, socket) {
  var deviceName = data.deviceName;
  if (socketMap[deviceName] == null) {
    socketMap[deviceName] = [];
  }
  socketMap[deviceName][socketMap[deviceName].length] = socket;
  updateClient(deviceName, socket);
  return deviceName;
}

function handleLocationData(data) {
  if (storage == null) return;
  var input = {body : data};
  utils.parseLocationData(input);
  if ("hazards" in data) {
    storage.storeHazardData(data.hazards);
  }
}

function updateClient(deviceName, socket) {
  for (var property in module.exports.WebSocketUpdateEnum) {
    var enumeration = module.exports.WebSocketUpdateEnum[property];
    // don't find the latest event, client will pull down all events
    if (enumeration != module.exports.WebSocketUpdateEnum.EVENT) {
      module.exports.needsUpdated(deviceName, enumeration, socket);
    }
  }
}

function getDataFromStorage(deviceName, key) {
  if (storage == null) return null;
  switch (key) {
    case module.exports.WebSocketUpdateEnum.DISTANCE:
      return storage.getLatestDistance(deviceName);
    case module.exports.WebSocketUpdateEnum.GYRO_READING:
      return storage.getLatestGyroReading(deviceName);
    case module.exports.WebSocketUpdateEnum.LOCATION:
      return storage.getLatestLocation(deviceName);
    case module.exports.WebSocketUpdateEnum.ROTATION:
      return storage.getLatestRotation(deviceName);
    case module.exports.WebSocketUpdateEnum.EVENT:
      return storage.getLatestEvent(deviceName);
    case module.exports.WebSocketUpdateEnum.HAZARD:
      return storage.getHazardData();
  }
  return null;
}

function sendOnSockets(deviceName, data)  {
  if (socketMap[deviceName] == null) return;
  for (var i = 0; i < socketMap[deviceName].length; i++) {
    if (socketMap[deviceName][i].readyState == 1) {
      socketMap[deviceName][i].send(data);
    }
  }
}


module.exports = {
  WebSocketUpdateEnum: {
    DISTANCE : "distance",
    GYRO_READING : "gyroReading",
    EVENT : "event",
    LOCATION : "location",
    ROTATION : "rotation",
    HAZARD : "hazards"
  },

  needsUpdated: function(deviceName, key, socket) {
    if (deviceName != "all" && socketMap[deviceName] == null) {
      socketMap[deviceName] = [];
      return;
    }

    var value = getDataFromStorage(deviceName, key);
    if (value == null) {
      return;
    }
    serializer.startJson();
    serializer.addJsonBlock(serializer.genKeyPairs(null, value), key);
    var string = serializer.endJson();
    if (string == JSON.stringify({})) return;
    if (socket == null) {
      if (deviceName == "all") {
        for (var nameKey in particle.deviceArray) {
          var name = particle.deviceArray[nameKey].name;
          sendOnSockets(name, string);
        }
      } else {
        sendOnSockets(deviceName, string);
      }
    } else {
      socket.send(string);
    }
  }
};