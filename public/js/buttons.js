ButtonEnum = {
  FORWARD: {cmd: "forward", btnName: "forward-btn", input: ["distance-input", "unit-input"]},
  BACKWARD: {cmd: "backward", btnName: "backward-btn", input: ["distance-input", "unit-input"]},
  TURN_LEFT: {cmd: "turnLeft", btnName: "left-turn-btn", input: "rotation-input"},
  TURN_RIGHT: {cmd: "turnRight", btnName: "right-turn-btn", input: "rotation-input"},
  STOP: {cmd: "stop", btnName: "stop-btn"},
  SEND_SPEED: {cmd: "speed", btnName: "send-speed-btn", input: "speed-input"},
  CAL_TURNING: {cmd: "turning", btnName: "cal-turning-btn", input: "turning-cal-input"},
  CAL_WHEELS: {cmd: "wheelSpeed", btnName: "cal-wheels-btn", input: ["left-wheel-input", "right-wheel-input"]},
  CAL_FRICTION: {cmd: "friction", btnName: "cal-friction-btn", input: "friction-input"},
  RESET_FAIL: {cmd: "reset", btnName: "cal-reset-fail-btn"},
  TARGET_LOCATION: {cmd: "moveToTarget", btnName: "location-btn"},
  TARGET_ROTATION: {cmd: "rotateToTarget", btnName: "rotation-btn"},
  LED_ON: {cmd: "ledOn", btnName: "led-on-btn"},
  LED_OFF: {cmd: "ledOff", btnName: "led-off-btn"}
};

JoystickEnum = {
  JOY_FWD: {cmd: "forward", btnName: "joy-fwd-btn"},
  JOY_LEFT: {cmd: "turnLeft", btnName: "joy-left-btn"},
  JOY_RIGHT: {cmd: "turnRight", btnName: "joy-right-btn"},
  JOY_BACK: {cmd: "backward", btnName: "joy-back-btn"}
};

function attachHandlers() {
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
            normaliseAgain = true;
            changeButtons(false);
            break;
          case ButtonEnum.RESET_FAIL.btnName:
            postToCloud(getCmd(name), "");
            changeButtons(false);
            break;
          case ButtonEnum.TARGET_ROTATION.btnName:
            var rotateObj = {degrees: getInput(InputEnum.TARGET_ROTATION)};
            if (!isNaN(rotateObj.degrees)) {
              var degrees = parseInt(rotateObj.degrees);
              if (degrees >= 0 && degrees <= 360) {
                postToCloud(getCmd(name), rotateObj);
                changeButtons(true);
              } else {
                alertDegrees();
              }
            } else {
              alertDegrees();
            }
            break;
          case ButtonEnum.TARGET_LOCATION.btnName:
            var locationObj = {
              coordinates: {
                x: getInput(InputEnum.TARGET_LOCATION_X),
                y: getInput(InputEnum.TARGET_LOCATION_Y)
              }
            };
            if (!isNaN(locationObj.coordinates.x) && !isNaN(locationObj.coordinates.y)) {
              var x = parseInt(locationObj.coordinates.x);
              var y = parseInt(locationObj.coordinates.y);
              if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                postToCloud(getCmd(name), locationObj);
                changeButtons(true);
              } else {
                alertCoords();
              }
            } else {
              alertCoords();
            }
            break;
          case ButtonEnum.LED_ON.btnName:
          case ButtonEnum.LED_OFF.btnName:
            postToCloud(getCmd(name));
            break;
        }
      });
    })(buttonOpt);
  }

  for (var joyEnumStr in JoystickEnum) {
    if (JoystickEnum.hasOwnProperty(joyEnumStr)) {
      var button = JoystickEnum[joyEnumStr];
      var selector = $("#" + button.btnName);
      selector.mousedown(onPress);
      selector.bind("touchend", onLeave);
      selector.mouseup(onLeave);
      function onLeave() {
        if (waitForLift) {
          makeMove("stop");
          waitForLift = false;
        }
      }
      function onPress() {
        var name = event.target.id;
        makeMove(getCmd(name));
        waitForLift = true;
      }
    } else {
      throw "JoystickEnum is not Init'd correctly";
    }
  }
}