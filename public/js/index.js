var selectedDeviceName = "";
var noSelected = "none";
var waitForLift = false;
var wasFail = false;
var webSocketOpened = false;

EndpointsEnum = {
    MOVE : "move",
    CALIBRATE : "calibrate",
    DEVICES : "devices",
    EVENTS : "events",
    CALIBRATION_VALUES : "calibrationValues"
};

MotorDirectionEnum = {
    DIRECTION_FORWARD  : 1 << 0,
    DIRECTION_BACKWARD : 1 << 1,
    DIRECTION_MAX      : 1 << 2
};

ButtonEnum = {
    FORWARD : {cmd: "forward", btnName: "forward-btn", input: ["distance-input", "unit-input"]},
    BACKWARD : {cmd: "backward", btnName: "backward-btn", input: ["distance-input", "unit-input"]},
    TURN_LEFT : {cmd: "turnLeft", btnName: "left-turn-btn", input: "rotation-input"},
    TURN_RIGHT : {cmd: "turnRight", btnName: "right-turn-btn", input: "rotation-input"},
    STOP : {cmd: "stop", btnName: "stop-btn"},
    SEND_SPEED : {cmd: "speed", btnName: "send-speed-btn", input: "speed-input"},
    CAL_TURNING : {cmd: "turning", btnName: "cal-turning-btn", input: "turning-cal-input"},
    CAL_WHEELS : {cmd: "wheelSpeed", btnName: "cal-wheels-btn", input: ["left-wheel-input", "right-wheel-input"]},
    CAL_FRICTION : {cmd: "friction", btnName: "cal-friction-btn", input: "friction-input"},
    RESET_FAIL : {cmd: "reset", btnName: "cal-reset-fail-btn"},
    TARGET_LOCATION : {cmd: "moveToTarget", btnName: "location-btn"},
    TARGET_ROTATION : {cmd: "rotateToTarget", btnName: "rotation-btn"}
};

JoystickEnum = {
    JOY_FWD : { cmd: "forward", btnName: "joy-fwd-btn"},
    JOY_LEFT : { cmd: "turnLeft", btnName: "joy-left-btn"},
    JOY_RIGHT : { cmd: "turnRight", btnName: "joy-right-btn"},
    JOY_BACK : { cmd: "backward", btnName: "joy-back-btn"}
};

InputEnum = {
    DISTANCE : "distance-input",
    SPEED : "speed-input",
    ROTATION:  "rotation-input",
    UNIT : "unit-input",
    CAL_LEFT_WHEEL : "left-wheel-input",
    CAL_RIGHT_WHEEL : "right-wheel-input",
    CAL_TURNING : "turning-cal-input",
    CAL_FRICTION : "friction-input",
    DIST_FRONT : "dist-front-output",
    EVENTS : "event-area",
    CAL_DIR_LEFT: "left-direction-input",
    CAL_DIR_RIGHT: "right-direction-input",
    TARGET_LOCATION_X: "target-x-input",
    TARGET_LOCATION_Y: "target-y-input",
    CURRENT_LOCATION_X: "current-x-output",
    CURRENT_LOCATION_Y: "current-y-output",
    TARGET_ROTATION: "target-rotation-input",
    CURRENT_ROTATION: "current-rotation-output"
};

var gyroOutputMap = {gyroGX: "gyro-x-output", gyroGY: "gyro-y-output", gyroGZ: "gyro-z-output",
                     gyroAX: "accel-x-output", gyroAY: "accel-y-output", gyroAZ: "accel-z-output"};


/*************************
 * CLOUD COMMS FUNCTIONS *
 *************************/
function getFromCloud(url, callback, noDeviceName) {
    if (selectedDeviceName && !noDeviceName) {
        $.ajax({
            method: "GET",
            url: "http://localhost:3000/" + url,
            headers: {deviceName: selectedDeviceName},
            contentType: "application/json",
            dataType: "json"
        }).done(function (data) {callback(data)});
    } else {
        $.ajax({
            method: "GET",
            url: "http://localhost:3000/" + url,
            contentType: "application/json",
            dataType: "json"
        }).done(function (data) {callback(data)});
    }
}

function postToCloud(url, data, callback, noDeviceName) {
    if ((typeof data) == "object") {
        data = JSON.stringify(data);
    }
    if (selectedDeviceName && !noDeviceName) {
        $.ajax({
            method: "POST",
            url: "http://localhost:3000/" + url,
            headers: {deviceName: selectedDeviceName},
            contentType: "application/json",
            data: data,
            dataType: "json"
        }).done(function (data) { if (callback != null) callback(data)});
    } else {
        $.ajax({
            method: "POST",
            url: "http://localhost:3000/" + url,
            contentType: "application/json",
            data: data,
            dataType: "json"
        }).done(function (data) { if (callback != null) callback(data)});
    }
}

/*************************
 * MAIN STARTUP FUNCTION *
 *************************/
$(document).ready(function() {
    for (var btnEnumStr in ButtonEnum) {
        var buttonOpt = ButtonEnum[btnEnumStr];
        (function (buttonOpt) {
            $("#" + buttonOpt.btnName).click(function (event) {
                var name = event.target.id;
                var values = [];
                if (buttonOpt.input instanceof Array) {
                    for (var property in buttonOpt.input) {
                        if (buttonOpt.input.hasOwnProperty(property)) {
                            values.push(getInput(buttonOpt.input[property]));
                        }
                    }
                } else {
                    values.push(getInput(buttonOpt.input));
                }
                switch (name) {
                    case ButtonEnum.SEND_SPEED.btnName:
                    case ButtonEnum.CAL_TURNING.btnName:
                    case ButtonEnum.CAL_FRICTION.btnName:
                        if (values.length != 1) return;
                        sendCalibration(getCmd(name), values[0]);
                        break;
                    case ButtonEnum.FORWARD.btnName:
                    case ButtonEnum.BACKWARD.btnName:
                    case ButtonEnum.TURN_LEFT.btnName:
                    case ButtonEnum.TURN_RIGHT.btnName:
                        makeMove(getCmd(name), values[0], values[1]);
                        changeButtons(true);
                        break;
                    case ButtonEnum.CAL_WHEELS.btnName:
                        if (values.length != 2) return;
                        sendCalibration(getCmd(name), values[0], values[1]);
                        break;
                    case ButtonEnum.STOP.btnName:
                        makeMove(getCmd(name));
                        changeButtons(false);
                        break;
                    case ButtonEnum.RESET_FAIL.btnName:
                        postToCloud(getCmd(name), "");
                        changeButtons(false);
                        break;
                    case ButtonEnum.TARGET_ROTATION.btnName:
                        var rotateObj = {degrees: getInput(InputEnum.TARGET_ROTATION)};
                        if (!isNaN(rotateObj.degrees)) {
                            postToCloud(getCmd(name), rotateObj);
                        }
                        break;
                    case ButtonEnum.TARGET_LOCATION.btnName:
                        var locationObj = {coordinates: {
                            x: getInput(InputEnum.TARGET_LOCATION_X),
                            y: getInput(InputEnum.TARGET_LOCATION_Y)}};
                        if (!isNaN(locationObj.coordinates.x) && !isNaN(locationObj.coordinates.y)) {
                            postToCloud(getCmd(name), locationObj);
                        }
                        break;
                }
            });
        })(buttonOpt);
    }

    for (var joyEnumStr in JoystickEnum) {
        var button = JoystickEnum[joyEnumStr];
        $("#" + button.btnName).mousedown(function() {
            var name = event.target.id;
            makeMove(getCmd(name));
            waitForLift = true;
        });
        $("#" + button.btnName).mouseup(function() {
            if (waitForLift) {
                makeMove("stop");
                waitForLift = false;
            }
        });
    }


    getFromCloud("devices", function(data) {
        if ("deviceNames" in data) {
            for (var name in data.deviceNames) {
                $("#robotDropDownList").append("<li class=\"element\"><a href=\"#\">" + data.deviceNames[name].value + "</a></li>");
            }
            $(".dropdown-menu li a").click(function () {
                var dropdown = $("#robotDropDown:first-child");
                dropdown.text($(this).text());
                dropdown.val($(this).text());
                selectedDeviceName = $(this).text();
                newDeviceSelected();
            });
        }
    });

    $("#left-direction-input").change(function() {
        sendUpdatedDirection();
    });

    $("#right-direction-input").change(function() {
        sendUpdatedDirection();
    });
});

/******************
 * INIT FUNCTIONS *
 ******************/
function newDeviceSelected() {
    /* remove the set historical events */
    $("#" + InputEnum.EVENTS).val("");
    changeButtons(false);

    getFromCloud(EndpointsEnum.CALIBRATION_VALUES, function (data){
        outputCalibration(data);
    });

    getFromCloud(EndpointsEnum.EVENTS, function (data) {
        outputEvent(data);
    });

    openWebSocket();
}

function openWebSocket() {
    if (webSocketOpened) return;
    webSocketOpened = true;
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    var connection = new WebSocket('ws://localhost:4201');

    connection.onopen = function () {
        var obj = {deviceName: selectedDeviceName};
        connection.send(JSON.stringify(obj));
    };

    connection.onerror = function (error) {
    };

    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
            if ("distance" in json) {
                outputDistances(json.distance);
            } else if ("gyroReading" in json) {
                outputGyroReadings(json.gyroReading);
            } else if ("event" in json) {
                outputEvent(json.event);
            } else if ("location" in json) {
                outputLocation(json.location);
            } else if ("rotation" in json) {
                outputRotation(json.rotation);
            }
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
        }
    };
}

/*****************************
 * HIGH LEVEL POST FUNCTIONS *
 *****************************/
function makeMove(direction, distance, unit) {
    var moveObj = {direction: direction};
    if (distance != null) {
        if (direction == ButtonEnum.TURN_LEFT || direction == ButtonEnum.TURN_RIGHT) {
            moveObj.degrees = distance;
        } else {
            moveObj.distance = distance;
            moveObj.unit = unit;
        }
    }
    postToCloud(EndpointsEnum.MOVE, moveObj);
}

function sendCalibration(property, value, valueTwo) {
    var calibrationObj = {};
    if (valueTwo == null) {
        calibrationObj[property] = value;
    } else {
        calibrationObj[property] = {left : value, right : valueTwo};
    }
    postToCloud(EndpointsEnum.CALIBRATE, calibrationObj);
}

function sendUpdatedDirection() {
    var postObj = {};
    postObj.directionLeft = getInput(InputEnum.CAL_DIR_LEFT);
    postObj.directionRight = getInput(InputEnum.CAL_DIR_RIGHT);

    postToCloud(EndpointsEnum.CALIBRATE, postObj);
}

/********************
 * OUTPUT FUNCTIONS *
 ********************/
function outputEventFromName(eventName, timestamp) {
    if (eventName == "failed" || eventName == "hasFailed") {
        wasFail = true;
        changeButtons(true);
    } else if (eventName == "reset") {
        changeButtons(false);
        wasFail = false;
    }
    var textArea = $("#" + InputEnum.EVENTS);
    textArea.val(textArea.val() + eventName + " at: " + timestamp + "\n");
}

function outputEvent(event) {
    var array = [];
    for (var property in event) {
        /* special case for web socket events */
        if (property == "type") {
            outputEventFromName(event.type, event.attributes.timestamp);
            return;
        }
        if (event.hasOwnProperty(property)) {
            if (event[property] instanceof Array) {
                for (var element in event[property]) {
                    if (event[property].hasOwnProperty(element)) {
                        event[property][element].type = property;
                        array.push(event[property][element]);
                    }
                }
            } else {
                event[property].type = property;
                array.push(event[property]);
            }
        }
    }
    array.sort(function(a,b) {
        return a.rawTimestamp - b.rawTimestamp;
    });
    for (var element in array) {
        if (array.hasOwnProperty(element)) {
            outputEventFromName(array[element].type, array[element].timestamp);
        }
    }
}

function outputCalibration(data) {
    for (var property in data) {
        if (data.hasOwnProperty(property)) {
            switch (property) {
                case "speed":
                    setInput(InputEnum.SPEED, data.speed.value);
                    break;
                case "rightWheel":
                    setInput(InputEnum.CAL_RIGHT_WHEEL, data.rightWheel.value);
                    break;
                case "leftWheel":
                    setInput(InputEnum.CAL_LEFT_WHEEL, data.leftWheel.value);
                    break;
                case "turning":
                    setInput(InputEnum.CAL_TURNING, data.turning.value);
                    break;
                case "friction":
                    setInput(InputEnum.CAL_FRICTION, data.friction.value);
                    break;
                case "directionLeft":
                    setInput(InputEnum.CAL_DIR_LEFT, data.directionLeft.value);
                    break;
                case "directionRight":
                    setInput(InputEnum.CAL_DIR_RIGHT, data.directionRight.value);
                    break;
            }
        }
    }
}

function outputDistances(json) {
    if (!(json instanceof Array)) {
        setInput(InputEnum.DIST_FRONT, json.attributes.value + "cm");
    } else {
        throw "Not implemented currently!";
    }
}

function outputLocation(json) {
    if (!(json instanceof Array)) {
        setInput(InputEnum.CURRENT_LOCATION_X, json.coordinates.x);
        setInput(InputEnum.CURRENT_LOCATION_Y, json.coordinates.y);
    } else {
        throw "Not implemented currently!";
    }
}

function outputRotation(json) {
    if (!(json instanceof Array)) {
        setInput(InputEnum.CURRENT_ROTATION, json.rotation);
    } else {
        throw "Not implemented currently!";
    }
}

function outputGyroReadings(json) {
    if (json instanceof Array) {
        for (var property in json) {
            if (json.hasOwnProperty(property)) {
                var type = json[property].type;
                setInput(gyroOutputMap[type], json[property].attributes.value);
            }
        }
    } else {
        throw "Not all data available!";
    }
}

/*********************
 * UTILITY FUNCTIONS *
 *********************/
function getCmd(btnName) {
    for (var btnEnumStr in ButtonEnum) {
        var button = ButtonEnum[btnEnumStr];
        if (button.btnName == btnName) {
            return button.cmd;
        }
    }
    for (var joyEnumStr in JoystickEnum){
        var button = JoystickEnum[joyEnumStr];
        if (button.btnName == btnName){
            return button.cmd;
        }
    }
    return null;
}

function changeButtons(disabled) {
    for (var btnEnumStr in ButtonEnum) {
        var button = ButtonEnum[btnEnumStr];
        if (disabled && ((!wasFail && button.btnName == ButtonEnum.STOP.btnName) ||
          (wasFail && button.btnName == ButtonEnum.RESET_FAIL.btnName))){
            continue;
        }

        $("#" + button.btnName).prop('disabled', disabled);
    }

    for (var joyEnumStr in JoystickEnum){
        var button = JoystickEnum[joyEnumStr];
        $("#" + button.btnName).prop('disabled', disabled);
    }
    wasFail = false;
}

function getInput(inputName) {
    var value;
    if (inputName == InputEnum.CAL_DIR_LEFT || inputName == InputEnum.CAL_DIR_RIGHT) {
        value = $("#" + inputName + " option:selected")[0].value;
        if (value === "forward") {
            value = MotorDirectionEnum.DIRECTION_FORWARD;
        } else {
            value = MotorDirectionEnum.DIRECTION_BACKWARD;
        }
    } else if (inputName == InputEnum.UNIT) {
        value = $("#" + inputName + " option:selected")[0].value;
        if (value == noSelected) {
            value = null;
        }
    } else {
        value = $("#" + inputName).val();
        if (value == "") value = null;
    }
    return value;
}

function setInput(inputName, value) {
    if (inputName == InputEnum.CAL_DIR_LEFT || inputName == InputEnum.CAL_DIR_RIGHT) {
        var string = value == MotorDirectionEnum.DIRECTION_FORWARD ? "forward" : "backward";
        $("#"+inputName+" option:contains(" + string + ")").prop({selected: true});
    } else {
        $("#" + inputName).val(value);
    }
}