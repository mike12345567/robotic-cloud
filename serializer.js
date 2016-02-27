var obj;

function addToJsonObject(arg) {
  if (!"type" in arg) {
    return;
  }
  if ("attributes" in arg) {
    var temp = {};
    temp[arg.type] = arg.attributes;
    obj.push(temp);
  } else if ("value" in arg) {
    var temp = {};
    temp[arg.type] = arg.value;
    obj.push(temp);
  }
}

function addJsonBlock(key, block) {
  var temp = {};
  temp.type = key;
  temp.values = [];
  for (var i = 0; i < block.length; i++) {
    temp.values.push(block[i]);
  }
  obj.push(temp);
}

function addNoData() {
  var temp = {status : "failed", reason : "NO DATA AVAILABLE"};
  obj.push(temp);
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
        if (arg.length == 0) {
          addNoData();
          return;
        }
        for (var i = 0; i < arg.length; i++) {
          addToJsonObject(arg[i]);
        }
      }
    }
  },

  addJsonBlock: function(block) {
    if (!block instanceof Array || !"attributes" in block ||
        !"type" in block) {
      return;
    }
    var tempArray = [];
    var finalType = null;
    for (var idx in block) {
      if (finalType == null) {
        finalType = block[idx].type;
      // all the keys must be same for a block
      } else if (finalType != block[idx].type) {
        return;
      }
      tempArray.push(block[idx].attributes);
    }
    addJsonBlock(finalType, tempArray);
  },

  endJson: function(res) {
    var response = JSON.stringify(obj);
    res.contentType('application/json');
    res.send(response);
    res.end();
  },

  genKeyPair: function (key, value) {
    if (value instanceof Object && "value" in value && "timestamp" in value) {
      var pair = {"type" : key, "attributes" : {"value" : value.value, "timestamp" : value.timestamp}};
    } else {
      var pair = {"type": key, "value": value};
    }
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