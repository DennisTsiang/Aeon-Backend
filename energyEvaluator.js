var glob = require('glob');
var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;
var converter = require('convert-csv-to-array');
var async = require('async');
var fs = require('fs-extra');
var ratings = require('./ratings');
var instrumention = require('./instrumentation');

const EMULATOR = "Nexus_5X_API_24";
const APP_DIRECTORY = "uploads/apps/";
const SCRIPT_DIRECTORY = "uploads/monkeyrunner_scripts/";

function evaluateEnergy(res, parameters, db) {
  // Parameters
  let app = APP_DIRECTORY+parameters.filename;
  let monkeyrunnerScript = ""
  let method = parameters.method;
  if (method == "Monkeyrunner") {
    monkeyrunnerScript = SCRIPT_DIRECTORY+parameters.scriptname;
  }
  let category = parameters.category;

  // Get package name
  let appName = extractPackageName(app);
  if (appName == null) {
    res.status("500");
    res.send("Error occurred extracting package name");
    return;
  }

  console.log("Calling setupOrkaParameters");
  // Execute Orka Process
  setupOrkaParameters(db, res, appName, method, app, monkeyrunnerScript, category);
}

function getCSVData(db, res, emulator, appName, category) {
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
        apiData.sort((a,b) => b[1] - a[1]);
        hardwareData.sort((a,b) => b[1] - a[1]);
        let csvData = {
          hardwareData: hardwareData,
          apiData: apiData,
          rating: null,
        };
        let hardwareTotal = csvData.hardwareData
          .map(csvPair => csvPair[1])
          .reduce((x,y) => x+y, 0);
        let routineTotal = csvData.apiData
          .map(csvPair => csvPair[1])
          .reduce((x,y) => x+y, 0);
        console.log("hardware total:"+hardwareTotal);
        console.log("routine total:"+routineTotal);
        db.getEnergyResultsByCategory(category)
        .then(data => {
          console.log("Successfully retrieved energy results");
          ratings.processResults(data, hardwareTotal + routineTotal)
          .then((rating) => {
            console.log("Assigned new test rating: " + rating);
            csvData.rating = rating;
            res.send(csvData);
            db.saveEnergyResults(hardwareTotal, routineTotal, rating, category);
          });
        })
        .catch(err => {
          console.log(err);
          console.log("Failed to get energy results.");
          res.status(500);
          res.send("Error retrieving energy results");
          return;
        });
    }
  );
}

function setupOrkaParameters(
    db, res, appName, method,
    app, monkeyrunnerScript, category) {

    let orkaParameters = ["vendor/orka/src/main.py","--skip-graph",
      "--method", method, "--app"];
    if (method == "Monkeyrunner") {
      orkaParameters = orkaParameters.concat([app, "--mr", monkeyrunnerScript]);
      executeOrkaProcess(db, res, appName, method, app, monkeyrunnerScript,
        category, orkaParameters);
    } else if (method == "DroidMate-2") {
      let instrumentationDir = "working/"+appName
      if (fs.existsSync(instrumentationDir)) {
        fs.removeSync(instrumentationDir);
      }
      fs.mkdirSync(instrumentationDir);
      // Copy apk file over
      appFilename= app.split("/").slice(-1)[0];
      fs.copyFileSync(app, instrumentationDir+"/"+appFilename);
      instrumentProcess = instrumention.instrumentAPKToIncludeStatementCoverage(
          instrumentationDir,
          appFilename,
      );
      instrumentProcess.on('close', (exitCode) => {
        console.log("Finished instrumenting apk");
        let instrumentedApkFilepath = instrumentationDir + "/" + 
          appFilename.slice(0, -4) + "-instrumented.apk";
        console.log("Looking for " + instrumentedApkFilepath);

        // Check that the instrumented file exists
        if (!fs.pathExistsSync(instrumentedApkFilepath)) {
          msg = "Instrumented APK could not be found";
          console.log(msg);
          res.status(500);
          res.send(msg);
          return;
        }

        orkaParameters.push(instrumentedApkFilepath);
        executeOrkaProcess(db, res, appName, method, app, monkeyrunnerScript,
          category, orkaParameters);
      });
    }
}

function executeOrkaProcess(
  db, res, appName, method,
  app, monkeyrunnerScript, category, orkaParameters) {
  console.log("Executing Orka process with parameters\n" + orkaParameters.join(" "));
  const orkaProcess = spawn('python', orkaParameters);
  orkaProcess.stdout.setEncoding('utf-8');
  orkaProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  orkaProcess.on('close', function(exitCode) {
    console.log("Orka process has finished");

    // Delete files
    let files = [app, monkeyrunnerScript];
    if (method != "Monkeyrunner") {
      files.pop();
    }
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
      } else {
        console.log("All files deleted successfully.");
        if (appName == "") {
          //Something has gone wrong getting appName
          res.status(500);
          res.send("Could not retrieve appName");
          return;
        }
        getCSVData(db, res, EMULATOR, appName, category);
      }
    } );
  });

}

function checkParameters(res, parameters) {
  return checkParameter(res, parameters['filename'],
    "There was an error parsing the filename parameter") &&
  checkParameter(res, parameters['category'],
    "There was an error parsing  the category parameter") &&
  checkParameter(res, parameters['method'],
    "There was an error parsing  the category parameter") &&
  parameters['method'] == 'Monkeyrunner'?
    checkParameter(res, parameters['scriptname'],
    "There was an error parsing the script parameter"): true;
}

function checkParameter(res, parameter, nullMessage) {
  if (parameter == null) {
    res.status(400);
    res.send(nullMessage);
    return false;
  }
  return true;
}

function extractPackageName(app) {
  const ANDROID_HOME = process.env.ANDROID_HOME;
  const AAPTS = glob.sync(ANDROID_HOME + '/build-tools/*/aapt');
  if (AAPTS == null || AAPTS.length == 0) {
    console.log("Could not find aapt");
    return null;
  }
  AAPT = AAPTS[0];
  let cmd = AAPT + " dump badging " + app;
  cmd += " |  grep -oP \"(?<=package: name=')\\S+\"";
  try {
    let stdout = execSync(cmd);
    let appName = stdout.toString('utf-8').slice(0, -2);
    console.log(appName);
    return appName;
  } catch (error) {
    console.log(error);
  };
}


module.exports = {
  evaluateEnergy: evaluateEnergy,
  checkParameters: checkParameters,
}
