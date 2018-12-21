// Remember to source paths.sh before running server
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer  = require('multer')
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
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
var upload = multer({ storage: storage })
var fs = require('fs');

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, x-requested-with');
    next();
});
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/file-upload', upload.single('file'), function (req, res) {
  console.log("Received a file upload POST request");
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
  const orkaProcess = spawn('python',["vendor/orka/src/main.py", "--app", 
    "uploads/"+req.params.filename]);
  orkaProcess.stdout.setEncoding('utf-8');
  orkaProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  orkaProcess.on('close', function(exitCode) {
    console.log("Orka process has finished");
    console.log(`Deleting apk file ${req.params.filename} ...`);
    fs.unlink("uploads/"+req.params.filename, function (err) {
      if (err) {
        res.send("An error occurred while trying to delete the apk file from server");
      } else {
        res.send("Energy evaluation finished");
      }
    });
  });
});

var server = app.listen(8081, function () {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
})
