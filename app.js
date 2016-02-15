var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var spark = require('spark');
var base64js = require('./b64.js');
var utils = require('./utils.js');

var routes = require('./routes/index');

var app = express();

var deviceID = "300032001147343339383037";
var distanceMap = new Array;
var eventMap = new Array;
var calibrationMap = new Array;

UltrasonicPosEnum = {
    US_POS_FRONT : "posFront"
};

EventEnum = {
    COMPLETE : "complete",
    CALIBRATION_VALUES : "calibrationValues",
    ULTRASONIC_VALUES: "distanceCm",
    STOPPED : "stopped"
};

CalibrationEnum = {
    SPEED : "speed",
    CAL_RIGHT_WHEEL : "rightWheel",
    CAL_LEFT_WHEEL : "leftWheel",
    CAL_TURNING : "turning",
    CAL_FRICTION : "friction"
};

/********************
 *  PARTICLE EVENTS *
 ********************/

spark.login({accessToken: utils.accessToken});

var deviceList = spark.listDevices();

deviceList.then(function(devices) {
    for (var i = 0; i < devices.length; i++) {
        var device = devices[i];
        var name = device.attributes.name;
        device.onEvent(EventEnum.COMPLETE, function(data) {
            storeEvent(name, EventEnum.COMPLETE);
        });

        device.onEvent(EventEnum.STOPPED, function(data) {
            storeEvent(name, EventEnum.STOPPED);
        });

        device.onEvent(EventEnum.CALIBRATION_VALUES, function(data) {
            var array = base64js.toByteArray(data.data);
            storeCalibration(name, array);
        });

        device.onEvent(EventEnum.ULTRASONIC_VALUES, function(data) {
            var array = base64js.toByteArray(data.data);
            storeDistances(name, array);
        });
    }
    module.exports = {deviceArray : devices};
});

function storeEvent(deviceName, eventName) {
    var date = new Date();
    var time = date.getTime();

    addToMap(deviceName, eventMap, eventName, eventName + " event at:" + time.toString());
}

function storeCalibration(deviceName, array) {
    var i = 0;

    addToMap(deviceName, calibrationMap, CalibrationEnum.SPEED, array[i++] | (array[i++] << 8));
    addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_RIGHT_WHEEL, array[i++] | (array[i++] << 8));
    addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_LEFT_WHEEL, array[i++] | (array[i++] << 8));
    addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_TURNING, array[i++] | (array[i++] << 8));
    addToMap(deviceName, calibrationMap, CalibrationEnum.CAL_FRICTION, array[i++] | (array[i++] << 8));
}

function storeDistances(deviceName, array) {
    var i = 0;

    addToMap(deviceName, distanceMap, UltrasonicPosEnum.US_POS_FRONT, array[i++] | (array[i++] << 8));
}

function addToMap(deviceName, map, key, value) {
    if (map[deviceName] == null) {
        map[deviceName] = new Array;
    }
    map[deviceName][key].push(value);
}

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/', routes);

module.exports = {app: app};
