module.exports = {
  MoveDirectionEnum: {
    DIRECTION_TURN_LEFT:  "turnLeft",
    DIRECTION_TURN_RIGHT: "turnRight",
    DIRECTION_FORWARD:    "forward",
    DIRECTION_BACKWARD:   "backward",
    DIRECTION_STOP:       "stop"
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
    if (string in object) {
      return object[string];
    } else {
      return null;
    }
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
        return this.MoveDirectionEnum.DIRECTION_TURN_RIGHT;
      case "turnleft":
      case "left":
      case "leftturn":
        return this.MoveDirectionEnum.DIRECTION_TURN_LEFT;
      case "forward":
      case "moveforward":
      case "forwardmove":
        return this.MoveDirectionEnum.DIRECTION_FORWARD;
      case "stop":
      case "stopmove":
      case "stopping":
        return this.MoveDirectionEnum.DIRECTION_STOP;
      case "backward":
      case "backwards":
      case "movebackward":
      case "backwardmove":
        return this.MoveDirectionEnum.DIRECTION_BACKWARD;
      default:
        return null;
    }
  }
};