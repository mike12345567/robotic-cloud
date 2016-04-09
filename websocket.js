var WebSocketServer = require("ws").Server;
var server = new WebSocketServer({ port: 4201 });
var serializer = require("./serializer.js");
var storage;

var socketMap = []; // primary key by deviceName, contains an array of sockets

server.on("connection", function (socket) {
  var deviceName;

  socket.on("message", function(message) {
    var obj = JSON.parse(message);
    deviceName = obj.deviceName;
    if (socketMap[deviceName] == null) {
      socketMap[deviceName] = [];
    }
    socketMap[deviceName][socketMap[deviceName].length] = socket;
    updateClient(deviceName, socket);
  });

  socket.on('close', function(code, message) {
    if (socketMap[deviceName] == null) return;
    var index = socketMap[deviceName].indexOf(socket);
    if (index >= 0) {
      socketMap[deviceName].splice(index, 1);
    }
  });
});

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
  switch (key) {
    case module.exports.WebSocketUpdateEnum.DISTANCE:
      return storage.getLatestDistance(deviceName);
    case module.exports.WebSocketUpdateEnum.GYRO_READING:
      return storage.getLatestGyroReading(deviceName);
    case module.exports.WebSocketUpdateEnum.LOCATION:
      return storage.getLatestLocation(deviceName);
    case module.exports.WebSocketUpdateEnum.ROTATION:
      return {"value": storage.getLatestRotation(deviceName)};
    case module.exports.WebSocketUpdateEnum.EVENT:
      return storage.getLatestEvent(deviceName);
  }
  return null;
}

module.exports = {
  WebSocketUpdateEnum: {
    DISTANCE : "distance",
    GYRO_READING : "gyroReading",
    EVENT : "event",
    LOCATION : "location",
    ROTATION : "rotation"
  },

  needsUpdated: function(deviceName, key, socket) {
    if (storage == null) {
      // delay the require until after init
      storage = require("./storage.js");
    }
    if (socketMap[deviceName] == null) {
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
      for (var i = 0; i < socketMap[deviceName].length; i++) {
        socketMap[deviceName][i].send(string);
      }
    } else {
      socket.send(string);
    }
  }
};