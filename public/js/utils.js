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
    calibrationObj[property] = {left: value, right: valueTwo};
  }
  postToCloud(EndpointsEnum.CALIBRATE, calibrationObj);
}

function sendUpdatedDirection() {
  var postObj = {direction: {}};
  postObj.direction.left = getInput(InputEnum.CAL_DIR_LEFT);
  postObj.direction.right = getInput(InputEnum.CAL_DIR_RIGHT);

  postToCloud(EndpointsEnum.CALIBRATE, postObj);
}

function getCmd(btnName) {
  for (var btnEnumStr in ButtonEnum) {
    var button = ButtonEnum[btnEnumStr];
    if (button.btnName == btnName) {
      return button.cmd;
    }
  }
  for (var joyEnumStr in JoystickEnum) {
    var button = JoystickEnum[joyEnumStr];
    if (button.btnName == btnName) {
      return button.cmd;
    }
  }
  return null;
}

function changeButtons(disabled) {
  isMoving = disabled; // if disabling buttons then we are moving
  for (var btnEnumStr in ButtonEnum) {
    var button = ButtonEnum[btnEnumStr];
    if (disabled && ((!wasFail && button.btnName == ButtonEnum.STOP.btnName) ||
      (wasFail && button.btnName == ButtonEnum.RESET_FAIL.btnName))) {
      continue;
    }

    $("#" + button.btnName).prop('disabled', disabled);
  }

  for (var joyEnumStr in JoystickEnum) {
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
    $("#" + inputName + " option:contains(" + string + ")").prop({selected: true});
  } else {
    $("#" + inputName).val(value);
  }
}

function alertCoords() {
  alert("X coordinate must be within " + minX +  " to " + maxX + "." +
    "\nY coordinate must be within " + minY + " to " + maxY + ".");
}

function alertDegrees() {
  alert("Degrees must be within 0 - 360.");
}