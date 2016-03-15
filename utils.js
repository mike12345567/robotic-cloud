/* different options which can be passed in as JSON and will be considered for the calibration */
var speedOptions = ["speed", "calibrateSpeed", "setSpeed"];
var turnSpeedOptions = ["turnSpeed", "turnTime", "turnCalibration",
                        "turnTimeMs", "turningCalibration", "calibrateTurnTime",
                        "calibrateTurnTimeMs", "calibrateTurning", "calibrateTurnSpeed", "setTurnSpeed"];
var wheelSpeedOptions = ["wheelSpeed", "calibrateWheelSpeed", "calibrateWheels",
                         "calibrateSpeedDifference", "calibrateSpeedDiff", "speedDifference", "speedDiff",
                         "setWheelSpeed"];
var frictionOptions = ["friction", "calibrateFriction", "frictionDelta", "frictionValue", "frictionCalibration",
                       "setFriction"];
var directionOptions = ["direction", "setDirection", "calibrateDirection", "directionCalibration", "motorDirection",
                        "setMotorDirection", "calibrateMotorDirection", "motorDirectionCalibration"];

module.exports = {
  MovementEndpointsEnum: {
    DIRECTION_TURN_LEFT:  "turnLeft",
    DIRECTION_TURN_RIGHT: "turnRight",
    DIRECTION_FORWARD:    "forward",
    DIRECTION_BACKWARD:   "backward",
    DIRECTION_STOP:       "stop"
  },

  CalibrationEndpointsEnum: {
    SPEED       : "setSpeed",
    TURNING     : "calibrateTurning",
    WHEEL_SPEED : "calibrateSpeed",
    FRICTION    : "calibrateFriction",
    DIRECTION   : "calibrateDirection"
  },

  OtherEndpointsEnum: {
    RESET_FAILED    : "resetFailed",
    GET_CALIBRATION : "sendCalibration"
  },


  isNoRepeatEndpoint: function (endpoint) {
    var noRepeat = [this.MovementEndpointsEnum.DIRECTION_STOP, this.OtherEndpointsEnum.RESET_FAILED,
                    this.OtherEndpointsEnum.GET_CALIBRATION];
    return noRepeat.indexOf(endpoint) > -1;
  },

  getDateStringFormat: function(date){
    var today = date;
    var dd = today.getDate();
    var mm = today.getMonth()+1;
    var yyyy = today.getFullYear();
    var hour = today.getHours();
    var min = today.getMinutes();
    var sec = today.getSeconds();
    if (dd<10){
      dd="0"+dd;
    }
    if (mm<10){
      mm="0"+mm;
    }
    if (hour<10){
      hour="0"+hour;
    }
    if (min<10){
      min="0"+min;
    }
    if (sec<10){
      sec="0"+sec;
    }
    return dd+'/'+mm+'/'+yyyy+" "+hour+":"+min+":"+sec+"GMT";
  },

  dateLog: function(string){
    var today = "["+this.getDateNow()+"] ";
    console.log(today + string);
  },

  getDateNow: function() {
    return this.getDateStringFormat(new Date());
  },

  getParameter: function(string, object) {
    var lcString = string.toLowerCase();
    if (string in object) {
      return object[string];
    } else if (lcString in object) {
      return object[lcString];
    }
    return null;
  },

  getParameterWithOptions: function(object) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i] instanceof Array) {
        for (var j = 0; j < arguments[i].length; j++) {
          var element = arguments[i][j];
          var parameter = this.getParameter(element, object);
          if (parameter != null) {
            return parameter;
          }
        }
      } else {
        var parameter = this.getParameter(arguments[i], object);
        if (parameter != null) {
          return parameter;
        }
      }
    }
  },

  getCalibrationPost: function(object) {
    var array = [];
    var optionCount = 0;

    var speed = this.getParameterWithOptions(object, speedOptions);
    if (speed != null) {
      array[optionCount] = {};
      array[optionCount].endpoint = this.CalibrationEndpointsEnum.SPEED;
      array[optionCount].value = speed;
      optionCount++;
    }

    var turnSpeed = this.getParameterWithOptions(object, turnSpeedOptions);
    if (turnSpeed != null) {
      array[optionCount] = {};
      array[optionCount].endpoint = this.CalibrationEndpointsEnum.TURNING;
      array[optionCount].value = turnSpeed;
      optionCount++;
    }

    var wheelSpeed = this.getParameterWithOptions(object, wheelSpeedOptions);
    if (wheelSpeed != null) {
      array[optionCount] = {};
      array[optionCount].endpoint = this.CalibrationEndpointsEnum.WHEEL_SPEED;
      array[optionCount].valueLeft = wheelSpeed.left;
      array[optionCount].valueRight = wheelSpeed.right;
      optionCount++;
    }

    var friction = this.getParameterWithOptions(object, frictionOptions);
    if (friction != null) {
      array[optionCount] = {};
      array[optionCount].endpoint = this.CalibrationEndpointsEnum.FRICTION;
      array[optionCount].value = friction;
      optionCount++;
    }

    var direction = this.getParameterWithOptions(object, directionOptions);
    if (direction != null) {
      array[optionCount] = {};
      array[optionCount].endpoint = this.CalibrationEndpointsEnum.DIRECTION;
      array[optionCount].valueLeft = direction.left;
      array[optionCount].valueRight = direction.right;
      optionCount++;
    }

    return array;
  },

  getTrueDirection: function(passedIn) {
    if (passedIn == null || passedIn == undefined) {
      return null;
    }
    passedIn = passedIn.toLowerCase();
    switch (passedIn) {
      case "turnright":
      case "right":
      case "rightturn":
        return this.MovementEndpointsEnum.DIRECTION_TURN_RIGHT;
      case "turnleft":
      case "left":
      case "leftturn":
        return this.MovementEndpointsEnum.DIRECTION_TURN_LEFT;
      case "forward":
      case "moveforward":
      case "forwardmove":
        return this.MovementEndpointsEnum.DIRECTION_FORWARD;
      case "stop":
      case "stopmove":
      case "stopping":
        return this.MovementEndpointsEnum.DIRECTION_STOP;
      case "backward":
      case "backwards":
      case "movebackward":
      case "backwardmove":
        return this.MovementEndpointsEnum.DIRECTION_BACKWARD;
      default:
        return null;
    }
  }
};