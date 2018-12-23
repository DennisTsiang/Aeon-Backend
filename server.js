// Remember to source paths.sh before running server
var express = require('express');
var app = express();
var async = require('async');
var bodyParser = require('body-parser');
var multer  = require('multer')
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

app.get('/energy-eval/:filename/:script', function(req, res) {
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
  const spawn = require("child_process").spawn;
  const orkaProcess = spawn('python',["vendor/orka/src/main.py","--skip-graph",
    "--app", "uploads/apps/"+req.params.filename, "--mr",
    "uploads/monkeyrunner_scripts/"+req.params.script]);
  orkaProcess.stdout.setEncoding('utf-8');
  orkaProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  orkaProcess.on('close', function(exitCode) {
    console.log("Orka process has finished");
    let files = [
      "uploads/apps/"+req.params.filename,
      "uploads/monkeyrunner_scripts/"+req.params.script
    ];
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
        res.send("Energy evaluation finished");
      }
    } );
  });
});

var server = app.listen(8081, function () {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
})
