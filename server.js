// Remember to source paths.sh before running server
require('dotenv').config();
var express = require('express');
var app = express();
var async = require('async');
var bodyParser = require('body-parser');
var multer  = require('multer')
var glob = require('glob');
var spawn = require("child_process").spawn;
var exec = require("child_process").exec;
var converter = require('convert-csv-to-array');
var fs = require('fs');
var db = require('./db');
var energyEvaluator = require('./energyEvaluator');

// Check environmetal variables are loaded
if (!process.env.ORKA_HOME) {
  throw new Error("Need to export ORKA_HOME");
}
if (!process.env.JAVA_HOME) {
  throw new Error("Need to export JAVA_HOME");
}

if (db.db) {
  console.log("DB loaded.");
} else {
  console.log("DB null");
}

function filenameHandler(req, file, cb) {
    let ext = ''; // set default extension (if any)
    // checking if there is an extension or not
    if (file.originalname.split(".").length > 1) {
      ext = file.originalname.substring(file.originalname.lastIndexOf('.'),
               file.originalname.length);
    }
    cb(null, Date.now() + ext);
}

// Set upload locations
var apkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/apps')
  },
  filename: filenameHandler
});

var monkeyrunnerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/monkeyrunner_scripts')
  },
  filename: filenameHandler
});

var apkUpload = multer({ storage: apkStorage })
var monkeyrunerUpload = multer({ storage: monkeyrunnerStorage })

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, x-requested-with');
    next();
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/file-upload/apk', apkUpload.single('file'), function (req, res) {
  console.log("Received an apk file upload POST request");
  console.log(req.file);
  res.send({
    'message': 'Recieved file successfully',
    'filename': req.file.filename
  });
})

app.post('/file-upload/monkeyrunner', monkeyrunerUpload.single('file'), function (req, res) {
  console.log("Received a monkeyrunner file upload POST request");
  console.log(req.file);
  res.send({
    'message': 'Recieved file successfully',
    'filename': req.file.filename
  });
})

app.post('/energy-eval/', function(req, res) {
  let parameters = req.body;
  console.log(parameters);
  let parametersValid = energyEvaluator.checkParameters(res, parameters);
  if (!parametersValid) {
    return;
  }
  console.log(`Received energy evaluation request for:\nFilename: ${parameters.filename}\nScript: ${parameters.script}\nCategory: ${parameters.category}\n`);
  energyEvaluator.evaluateEnergy(res, parameters, db);

});


var server = app.listen(8081, function () {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
});
server.timeout = 300000;
