var Twitterus = require('./Twitterus');
var FamousEngine = require('famous/core/FamousEngine');
 FamousEngine.init()
 //create the app and pass in the target element
var twitterus = FamousEngine.createScene().addChild(new Twitterus());
