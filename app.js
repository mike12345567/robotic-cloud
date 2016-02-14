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
// TODO: update this to take the device which we are getting data from
spark.getDevice(deviceID).then(function(device) {
    device.onEvent(EventEnum.COMPLETE, function(data) {
        storeEvent(EventEnum.COMPLETE);
    });

    device.onEvent(EventEnum.STOPPED, function(data) {
        storeEvent(EventEnum.STOPPED);
    });

    device.onEvent(EventEnum.CALIBRATION_VALUES, function(data) {
        var array = base64js.toByteArray(data.data);
        storeCalibration(array);
    });

    device.onEvent(EventEnum.ULTRASONIC_VALUES, function(data) {
        var array = base64js.toByteArray(data.data);
        storeDistances(array);
    });
});

function storeEvent(eventName) {
    var date = new Date();
    var time = date.getTime();

    addToMap(eventMap, eventName, eventName + " event at:" + time.toString());
}

function storeCalibration(array) {
    var i = 0;

    addToMap(calibrationMap, CalibrationEnum.SPEED, array[i++] | (array[i++] << 8));
    addToMap(calibrationMap, CalibrationEnum.CAL_RIGHT_WHEEL, array[i++] | (array[i++] << 8));
    addToMap(calibrationMap, CalibrationEnum.CAL_LEFT_WHEEL, array[i++] | (array[i++] << 8));
    addToMap(calibrationMap, CalibrationEnum.CAL_TURNING, array[i++] | (array[i++] << 8));
    addToMap(calibrationMap, CalibrationEnum.CAL_FRICTION, array[i++] | (array[i++] << 8));
}

function storeDistances(array) {
    var i = 0;

    addToMap(distanceMap, UltrasonicPosEnum.US_POS_FRONT, array[i++] | (array[i++] << 8));
}

function addToMap(map, key, value) {
    if (map[deviceID] == null) {
        map[deviceID] = new Array;
    }
    map[deviceID][key].push(value);
}

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/', routes);

module.exports = app;
