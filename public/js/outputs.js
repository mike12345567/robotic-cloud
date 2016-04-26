var gyroOutputMap = {
  gyroAX: {output: "accel-x-output"}, gyroAY: {output: "accel-y-output"}, gyroAZ: {output: "accel-z-output"},
  gyroGX: {output: "gyro-x-output"}, gyroGY: {output: "gyro-y-output"}, gyroGZ: {output: "gyro-z-output"}
};

function configureOutputs() {
  for (var property in gyroOutputMap) {
    if (gyroOutputMap.hasOwnProperty(property)) {
      gyroOutputMap[property].normlisation = 0;
    }
  }
}

function outputEventFromName(eventName, timestamp) {
  if (eventName == "failed" || eventName == "hasFailed") {
    wasFail = true;
    $("#" + ButtonEnum.RESET_FAIL.btnName).prop("disabled", false);
    changeButtons(true);

  } else if (eventName == "reset") {
    changeButtons(false);
    wasFail = false;
  } else if (!wasFail && eventName == "complete") {
    changeButtons(false);
    normaliseAgain = true;
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
  array.sort(function (a, b) {
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
  if (json instanceof Object) {
    setInput(InputEnum.CURRENT_LOCATION_X, json.x);
    setInput(InputEnum.CURRENT_LOCATION_Y, json.y);
  } else {
    throw "Not implemented currently!";
  }
}

function outputRotation(json) {
  if (json != null) {
    setInput(InputEnum.CURRENT_ROTATION, json);
  } else {
    throw "Not implemented currently!";
  }
}

function outputGyroReadings(json) {
  if (json instanceof Array) {
    for (var property in json) {
      if (json.hasOwnProperty(property)) {
        var type = json[property].type;
        var value = json[property].attributes.value - gyroOutputMap[type].normlisation;
        setInput(gyroOutputMap[type].output, value);
      }
    }
  } else {
    throw "Not all data available!";
  }
}

function normaliseGyroReadings(data) {
  if (normaliseAgain) {
    for (var property in data) {
      if (data.hasOwnProperty(property)) {
        var type = data[property].type;
        gyroOutputMap[type].normlisation = data[property].attributes.value;
      }
    }
    normaliseAgain = false;
  }
}

function outputHazards(data) {
  var textArea = $("#" + InputEnum.HAZARDS);
  textArea.val("");

  if (data == null) return;
  /* only one hazard, this is transformed by serialiser */
  if ("location" in data) {
    outputString(data.location);
    return;
  }
  for (var hazardCount in data) {
    outputString(data[hazardCount].location);
  }

  function outputString(hazardElement) {
    var outputString = "Hazard at: x - " + hazardElement.x + ", y - " + hazardElement.y +
      ", width - " + hazardElement.width + ", height - " + hazardElement.height;
    textArea.val(textArea.val() + outputString + "\n");
  }
}
