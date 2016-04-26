var urlPrefix = "api/v1/";
var baseURL = window.location.href;

function configureURL() {
  if (baseURL.substr(baseURL.length - 1) != "/") {
    baseURL = baseURL + "/" + urlPrefix;
  } else {
    baseURL = baseURL + urlPrefix;
  }
}

function getFromCloud(url, callback, noDeviceName) {
  if (selectedDeviceName && !noDeviceName) {
    $.ajax({
      method: "GET",
      url: baseURL + url,
      headers: {deviceName: selectedDeviceName},
      contentType: "application/json",
      dataType: "json"
    }).done(function (data) {
      callback(data)
    });
  } else {
    $.ajax({
      method: "GET",
      url: baseURL + url,
      contentType: "application/json",
      dataType: "json"
    }).done(function (data) {
      callback(data)
    });
  }
}

function postToCloud(url, data, callback, noDeviceName) {
  if ((typeof data) == "object") {
    data = JSON.stringify(data);
  } else if ((typeof data) == "null") {
    data = "{}";
  }
  if (selectedDeviceName && !noDeviceName) {
    $.ajax({
      method: "POST",
      url: baseURL + url,
      headers: {deviceName: selectedDeviceName},
      contentType: "application/json",
      data: data,
      dataType: "json"
    }).done(function (data) {
      if (callback != null) callback(data)
    });
  } else {
    $.ajax({
      method: "POST",
      url: baseURL + url,
      contentType: "application/json",
      data: data,
      dataType: "json"
    }).done(function (data) {
      if (callback != null) callback(data)
    });
  }
}