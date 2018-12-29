// Remember to source paths.sh before running server
var express = require('express');
var app = express();
var async = require('async');
var bodyParser = require('body-parser');
var multer  = require('multer')
var glob = require('glob');
var spawn = require("child_process").spawn;
var exec = require("child_process").exec;
var converter = require('convert-csv-to-array');
var db = require('./db');

if (db.db) {
  console.log("DB loaded.");
} else {
  console.log("DB null");
}

// Set upload locations
var apkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/apps')
  },
  filename: function (req, file, cb) {
    let ext = ''; // set default extension (if any)
    // checking if there is an extension or not
    if (file.originalname.split(".").length > 1) {
      ext = file.originalname.substring(file.originalname.lastIndexOf('.'),
               file.originalname.length);
    }
    cb(null, Date.now() + ext);
  }
});
var monkeyrunnerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/monkeyrunner_scripts')
  },
  filename: function (req, file, cb) {
    let ext = '';
    if (file.originalname.split(".").length > 1) {
      ext = file.originalname.substring(file.originalname.lastIndexOf('.'),
               file.originalname.length);
    }
    cb(null, Date.now() + ext);
  }
});
var apkUpload = multer({ storage: apkStorage })
var monkeyrunerUpload = multer({ storage: monkeyrunnerStorage })
var fs = require('fs');

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, x-requested-with');
    next();
});
app.use(bodyParser.urlencoded({ extended: false }));

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

function getCSVData(emulator, appName, res, category) {
  let hardwareData = null;
  let apiData = null;
  async.parallel([
    function (callback) {
      fs.readFile("vendor/orka/results_"+emulator+"/"+appName+"/hardwareCosts.csv",
        (err, data) => {
          if (err) {
            callback(err);
          }
          console.log("hardware costs:\n"+data);
          if (!data) {
            callback("No hardware data found");
            return;
          }
          hardwareData = converter.convertCSVToArray(data.toString(), {
            header: false,
            type: 'array',
            separator: ',',
          });
          callback(err);
        }
      );
    },
    function(callback) {
      fs.readFile("vendor/orka/results_"+emulator+"/"+appName+"/routineCosts.csv",
        (err, data) => {
          if (err) {
            callback(err);
          }
          console.log("routine costs:\n"+data);
          if (!data) {
            callback("No routine data found");
            return;
          }
          apiData = converter.convertCSVToArray(data.toString(), {
            header: false,
            type: 'array',
            separator: ',',
          });
          callback(err);
        }
      );
    },
  ], function(err) {
        if (err) {
          res.status(500);
          res.send("Error retrieving csv data");
          return;
        }
        let csvData = {
          hardwareData: hardwareData,
          apiData: apiData,
        }
        res.send(csvData);
        db.saveEnergyResults(csvData, category);
    }
  );
}

app.get('/energy-eval/:filename/:script/:category', function(req, res) {
  const EMULATOR = "Nexus_5X_API_24";
  if (req.params.filename == null) {
    res.status(400);
    res.send("There was an error parsing the filename parameter");
    return;
  }
  if (req.params.script == null) {
    res.status(400);
    res.send("There was an error parsing the script parameter");
    return;
  }
  console.log(`Received energy evaluation request for:\nFilename: ${req.params.filename}\nScript: ${req.params.script}\nCategory: ${req.params.category}\n`);

  let app = "uploads/apps/"+req.params.filename;
  let monkeyrunnerScript = "uploads/monkeyrunner_scripts/"+req.params.script;
  let category = req.params.category;
  let appName = "";

  // Get package name
  const ANDROID_HOME = process.env.ANDROID_HOME;
  const AAPTS = glob.sync(ANDROID_HOME + '/build-tools/*/aapt');
  if (AAPTS == null || AAPTS.length == 0) {
    console.log("Could not find aapt");
    res.status("500");
    res.send("Could not find aapt");
    return;
  }
  AAPT = AAPTS[0];
  let cmd = AAPT + " dump badging " + app;
  cmd += " |  grep -oP \"(?<=package: name=')\\S+\"";
  let cmdProcess = exec(cmd, null, function(error, stdout, stderr) {
    if (error) {
      console.log(error);
    } else {
      appName = stdout.slice(0, -2);
      console.log(appName);
    }
  });

  //Execute the Orka process
  const orkaProcess = spawn('python',["vendor/orka/src/main.py","--skip-graph",
    "--app", app, "--mr", monkeyrunnerScript]);
  orkaProcess.stdout.setEncoding('utf-8');
  orkaProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  orkaProcess.on('close', function(exitCode) {
    console.log("Orka process has finished");
    let files = [app, monkeyrunnerScript];
    async.each(files, function(file, callback) {
      console.log("Deleting file " + file);
      fs.unlink(file, function(err) {
        if (!err) {
          console.log("Deleted " + file);
        }
        callback(err);
      });
    }, function(err){
      if (err) {
        console.log(err);
        res.send("Error occurred.");
      } else {
        console.log("All files deleted successfully.");
        if (appName == "") {
          //Something has gone wrong getting appName
          res.status(500);
          res.send("Could not retrieve appName");
          return;
        }
        getCSVData(EMULATOR, appName, res, category);
      }
    } );
  });
});


var server = app.listen(8081, function () {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
})
