module.exports = {
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
  }
};