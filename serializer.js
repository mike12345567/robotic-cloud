var obj;

function addToJsonObject(arg) {
  if ("type" in arg && "value" in arg) {
    var temp = {};
    temp[arg.type] = arg.value;
    obj.push(temp);
  }
}

module.exports = {
  startJson: function() {
    obj = [];
  },

  addJson: function() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (!arg instanceof Array) {
        addToJsonObject(arg);
      } else {
        for (var i = 0; i < arg.length; i++) {
          addToJsonObject(arg[i]);
        }
      }
    }
  },

  endJson: function(res) {
    var response = JSON.stringify(obj);
    res.contentType('application/json');
    res.send(response);
    res.end();
  },

  genKeyPair: function (key, value) {
    var pair = {"type" : key, "value" : value};
    return pair;
  },

  genKeyPairs: function(key, values) {
    if (!values instanceof Array) {
      return null;
    }
    var array = new Array;
    for (var i = 0; i < values.length; i++) {
      array.push(module.exports.genKeyPair(key, values[i]));
    }
    return array;
  }
};