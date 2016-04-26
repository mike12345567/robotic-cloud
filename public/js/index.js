var selectedDeviceName = null;
var devices = [];
var noSelected = "none";
var waitForLift = false;
var wasFail = false;
var connection = null;
var isMoving = false;
var normaliseAgain = true;
var greenCircle = "<div class=\"green-circle\"></div>";
var redCircle = "<div class=\"red-circle\"></div>";
var minX = 100, maxX = 650, minY = 100, maxY = 400;

EndpointsEnum = {
  MOVE: "move",
  CALIBRATE: "calibrate",
  DEVICES: "devices",
  EVENTS: "events",
  CALIBRATION_VALUES: "calibrationValues"
};

MotorDirectionEnum = {
  DIRECTION_FORWARD: 1 << 0,
  DIRECTION_BACKWARD: 1 << 1,
  DIRECTION_MAX: 1 << 2
};

InputEnum = {
  DISTANCE: "distance-input",
  SPEED: "speed-input",
  ROTATION: "rotation-input",
  UNIT: "unit-input",
  CAL_LEFT_WHEEL: "left-wheel-input",
  CAL_RIGHT_WHEEL: "right-wheel-input",
  CAL_TURNING: "turning-cal-input",
  CAL_FRICTION: "friction-input",
  DIST_FRONT: "dist-front-output",
  EVENTS: "event-area",
  HAZARDS: "hazard-area",
  CAL_DIR_LEFT: "left-direction-input",
  CAL_DIR_RIGHT: "right-direction-input",
  TARGET_LOCATION_X: "target-x-input",
  TARGET_LOCATION_Y: "target-y-input",
  CURRENT_LOCATION_X: "current-x-output",
  CURRENT_LOCATION_Y: "current-y-output",
  TARGET_ROTATION: "target-rotation-input",
  CURRENT_ROTATION: "current-rotation-output"
};

/*************************
 * MAIN STARTUP FUNCTION *
 *************************/
$(document).ready(function () {
  $("[name=\"local-checkbox\"]").bootstrapSwitch();
  $(".checkbox").hide();
  configureURL();
  configureOutputs();
  attachHandlers();

  refreshDevices();
  setInterval(refreshDevices, 20000);

  $("#left-direction-input").change(function () {
    sendUpdatedDirection();
  });

  $("#right-direction-input").change(function () {
    sendUpdatedDirection();
  });
});

/******************
 * INIT FUNCTIONS *
 ******************/
function refreshDevices() {
  getFromCloud("devices", function (data) {
    if ("devices" in data) {
      var dropdown = $("#robotDropDownList");
      dropdown.empty();
      for (var element in data.devices) {
        var value = data.devices[element];
        var circle = value.online ? greenCircle : redCircle;
        devices[value.deviceName] = value;
        dropdown.append("<li class=\"robot-name\"><a href=\"javascript:void(0)\">" + value.deviceName + circle + "</a></li>");
      }
    }
    if (selectedDeviceName != null) {
      setValue(selectedDeviceName);
    }
    $(".dropdown-menu li a").click(function () {
      setValue($(this).text());
      selectedDeviceName = $(this).text();
      $("#id-output").text(devices[selectedDeviceName].id);
      newDeviceSelected();
    });
  });
  function setValue(device) {
    var circle = devices[device].online ? greenCircle : redCircle;
    var dropdown = $("#robotDropDown:first-child");
    dropdown.text(device);
    dropdown.val(device);
    dropdown.append(circle);
  }

  openWebSocket();
}

function newDeviceSelected() {
  /* remove the set historical events */
  $("#" + InputEnum.EVENTS).val("");
  changeButtons(false);

  getFromCloud(EndpointsEnum.CALIBRATION_VALUES, function (data) {
    outputCalibration(data);
  });

  getFromCloud(EndpointsEnum.EVENTS, function (data) {
    outputEvent(data);
  });

  openWebSocket();

  getFromCloud("isUsingLocal", function(data) {
    var checkbox = $("[name=\"local-checkbox\"]");
    checkbox.bootstrapSwitch("state", data.isLocal);
    checkbox.on("switchChange.bootstrapSwitch", function(event, state) {
      var url = !state ? "useWeb" : "useLocal";
      postToCloud(url, {}, null, false);
    });
  });
  $(".checkbox").show();
}

function openWebSocket() {
  if (selectedDeviceName == null) return;

  if (connection != null) {
    if (connection.readyState == 1) {
      sendDeviceName();
      return;
    } else {
      connection.close();
      connection = null;
    }
  }

  window.WebSocket = window.WebSocket || window.MozWebSocket;

  connection = new WebSocket('ws://localhost:4201');

  connection.onopen = function () {
    sendDeviceName();
  };

  connection.onerror = function (error) {
    connection.close();
    connection = null;
  };

  connection.onmessage = function (message) {
    try {
      var json = JSON.parse(message.data);
      if ("distance" in json) {
        outputDistances(json.distance);
      } else if ("gyroReading" in json) {
        normaliseGyroReadings(json.gyroReading);
        outputGyroReadings(json.gyroReading);
      } else if ("event" in json) {
        outputEvent(json.event);
      } else if ("location" in json) {
        outputLocation(json.location);
        outputHazards(null);
      } else if ("rotation" in json) {
        outputRotation(json.rotation);
      } else if ("hazards" in json) {
        outputHazards(json.hazards);
      }
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', message.data);
    }

    connection.onclose = function (event) {
      connection = null;
    }
  };

  function sendDeviceName() {
    var obj = {deviceName: selectedDeviceName};
    connection.send(JSON.stringify(obj));
  }

}