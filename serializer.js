var obj;

function addToJsonObject(arg) {
  if (arg == null || !("type" in arg)) {
    return;
  }
  if ("attributes" in arg) {
    obj[arg.type] = arg.attributes;
  } else if ("value" in arg) {
    obj[arg.type] = arg.value;
  }
}

function addJsonBlock(key, block) {
  obj[key] = block;
}

function addNoData() {
  obj["error"] = {status : "failed", reason : "NO DATA AVAILABLE"};
}

module.exports = {
  startJson: function() {
    obj = {};
  },

  addJson: function() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (!(arg instanceof Array)) {
        addToJsonObject(arg);
      } else {
        if (arg.length == 0) {
          addNoData();
          return;
        }
        for (var j = 0; j < arg.length; j++) {
          addToJsonObject(arg[j]);
        }
      }
    }
  },

  addJsonBlock: function(block, type) {
    if (block == null || !block instanceof Array || !"type" in block) {
      return;
    }
    var oneTypeSpecified = (type != null);
    var tempArray = [];
    var finalObj;
    for (var idx in block) {
      if (type == null) {
        type = block[idx].type;
      }
      if (!oneTypeSpecified && block[idx].attributes != null) {
        tempArray.push(block[idx].attributes);
      } else {
        tempArray.push(block[idx]);
      }
      if (tempArray.length <= 1) {
        finalObj = {};
        finalObj = tempArray[0];
      } else {
        finalObj = tempArray;
      }
    }
    addJsonBlock(type, finalObj);
  },

  setError: function(status, message) {
    obj["error"] = {status : status, reason : message};
  },

  endJson: function(res) {
    if (obj.length == 1) {
      obj = obj[0]; // don"t need it to be JSON array if its single object
    }
    var response = JSON.stringify(obj);
    if (res != null) {
      res.contentType("application/json");
      res.send(response);
      res.end();
    } else {
      return response;
    }
  },

  currentKeys: function() {
    return Object.keys(obj).length;
  },

  genKeyPair: function (key, value) {
    if (value == null) return;
    var pair = {};
    if (value instanceof Object && "value" in value) {
      if ("timestamp" in value) {
        pair = {"type" : key, "attributes" : {"value" : value.value, "timestamp" : value.timestamp}};
      } else {
        pair = {"type": key, "attributes" : {"value": value.value}};
      }
      if ("rawTimestamp" in value) {
        pair.attributes.rawTimestamp = value.rawTimestamp;
      }
    } else {
      pair = value;
      if (key != null && key != "type" && key != "value" && key != "attribute") {
        pair.type = key;
      }
    }
    return pair;
  },

  genKeyPairs: function(key, values) {
    if (!(values instanceof Array)) {
      return null;
    }
    var array = [];
    if (key != null) {
      for (var i = 0; i < values.length; i++) {
        array.push(module.exports.genKeyPair(key, values[i]));
      }
    } else {
      for (var property in values) {
        array.push(module.exports.genKeyPair(property, values[property]));
      }
    }
    return array;
  }
};