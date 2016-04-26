var express = require("express");
var utils = require("../utils.js");
var path = require("path");
var routerView = express.Router();

/**
 * Gets the homepage from the node server, this version uses the API instead of direct Particle calls
 * not attached to the /api/v1 prefix like all API calls
 * @return a static web page with controls on it
 */
routerView.get("/", function(req, res) {
  utils.dateLog("Page access! (Main page)");
  res.sendFile(path.resolve("../views/index.html"));
});

module.exports = routerView;