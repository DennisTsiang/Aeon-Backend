// Remember to source paths.sh before running server
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

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
  res.send('Received file successfully');
})

app.get('/energy-eval', function(req, res) {
  const spawn = require("child_process").spawn;
  const orkaProcess = spawn('python',["vendor/orka/src/main.py"]);
  orkaProcess.stdout.setEncoding('utf-8');
  orkaProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  orkaProcess.on('close', function(exitCode) {
    console.log("Orka process has finished");
    res.send("Energy evaluation finished");
  });
});

var server = app.listen(8081, function () {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
})
