var glob = require('glob');
var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;
var converter = require('convert-csv-to-array');
var async = require('async');
var fs = require('fs-extra');
var ratings = require('./ratings');
var instrumention = require('./instrumentation');
var fileHandler = require('./fileHandler');
var profile = require('./profile');

const APP_DIRECTORY = "uploads/apps/";
const SCRIPT_DIRECTORY = "uploads/monkeyrunner_scripts/";

async function evaluateEnergy(res, parameters, db) {
  return new Promise(async (resolve, reject) => {
    // Parameters
    let app = parameters.app;
    let monkeyrunnerScript = ""
    let method = parameters.method;
    if (method == "Monkeyrunner") {
      monkeyrunnerScript = SCRIPT_DIRECTORY+parameters.scriptname;
    }
    let category = parameters.category;
    let avd = parameters.AVD.avdName;
    let port = parameters.AVD.port;
    let appName = parameters.appName;

    let statementCoverage = true;

    console.log("Calling setupOrkaParameters");
    // Execute Orka Process
    let orkaParameters = await setupOrkaParameters(appName, method, category,
      app, monkeyrunnerScript, statementCoverage, avd, port);
    await executeOrkaProcess(db, res, appName, method, app, monkeyrunnerScript,
      category, orkaParameters);
    try {
      let csvData = await getCSVData(db, res, avd, appName, category);
      return resolve(csvData);
    } catch (err) {
      return reject();
    }
    //res.send(csvData);
  });
}

function getCSVData(db, res, emulator, appName, category) {
  return new Promise((resolve, reject) => {
    let hardwareData = null;
    let apiData = null;
    let totalCoverage = null;
    let reportFilename = null;
    let sourcelineFeedbackFilename = null;
    async.parallel([
      function (callback) {
        fs.readFile("vendor/orka/results_"+emulator+"/"+appName+"/hardwareCosts.csv",
          (err, data) => {
            if (err) {
              console.log(err)
              callback(err);
              return;
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
              return;
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
      function(callback) {
        fs.readFile("vendor/orka/results_"+emulator+"/"+appName+"/"+appName+
          "/report/total_coverage.txt",
          (err, data) => {
            if (err || !data) {
              console.log("No coverage data found")
              callback();
              return;
            }
            totalCoverage = data.toString().trim();
            let archiveFilename = appName + Date.now() + ".tar.gz";
            let output = `reports/${archiveFilename}`;
            cmd = `tar -zcvf ${archiveFilename} -C vendor/orka/results_` +
                  `${emulator}/${appName}/${appName}/ report ` +
                  `&& mv ${archiveFilename} ${output}`;
            console.log("Running cmd: " + cmd);
            let stdout = execSync(cmd);
            reportFilename = archiveFilename;
            callback();
          })
      },
      function(callback) {
        inputFilepath = "vendor/orka/results_"+emulator+"/"+appName+
          "/sourcelineFeedback.txt";
        fs.access(inputFilepath, fs.constants.R_OK,
          (err) => {
            if (err) {
              console.log("No source line feedback data found")
              callback();
              return;
            }
            let outputFilename = appName+Date.now()+"_srcf.txt";
            let outputFilepath = `sourcelineFeedbacks/${outputFilename}`;
            cmd = `mv ${inputFilepath} ${outputFilepath}`;
            console.log("Running cmd: " + cmd);
            let stdout = execSync(cmd);
            sourcelineFeedbackFilename = outputFilename;
            callback();
          })
      },
    ], function(err) {
          if (err) {
            console.log("Error retrieving csv data");
            return reject();
          }
          apiData.sort((a,b) => b[1] - a[1]);
          hardwareData.sort((a,b) => b[1] - a[1]);
          let csvData = {
            hardwareData: hardwareData,
            apiData: apiData,
            rating: null,
            percentile: null,
            statementCoverage: totalCoverage,
            reportFilename: reportFilename,
            sourcelineFeedbackFilename: sourcelineFeedbackFilename
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
            .then(result => {
              let rating = result[0];
              console.log("Assigned new test rating: " + rating);
              csvData.rating = rating;
              csvData.percentile = result[1];
              db.saveEnergyResults(hardwareTotal, routineTotal, rating,
                category, totalCoverage);
              return resolve(csvData);
            });
          })
          .catch(err => {
            console.log(err);
            console.log("Failed to get energy results.");
            res.status(500);
            res.send("Error retrieving energy results");
            return reject();
          });
      }
    );
  });
}

async function executeStatementCoverageInstrumentation(
  appName, method,
  app, monkeyrunnerScript, orkaParameters) {
  return new Promise(async (resolve, reject) => {
    let instrumentationDir = "working/"+appName
    let apkFilename = app.split("/").pop();
    fileHandler.createWorkingDir(instrumentationDir);

    // Instrument APK for statement coverage
    try {
      instrumentedAPKFile = await instrumention.instrumentAPKToIncludeStatementCoverage(
          instrumentationDir,
          app,
          apkFilename
      );
      orkaParameters = orkaParameters.concat(["--pickle",
        instrumentationDir+"/metadata/"+apkFilename.slice(0,-4)+".pickle",
        "--app", instrumentedAPKFile]);
    } catch(err) {
      console.log(err);
      orkaParameters = orkaParameters.concat(["--app", app]);
    }
    return resolve(orkaParameters);
  });
}

async function setupOrkaParameters(
  appName, method, category, app, monkeyrunnerScript,
  statementCoverage, avd, port) {
    return new Promise(async (resolve, reject) => {
      let orkaParameters = ["vendor/orka/src/main.py","--skip-graph",
        "--method", method, "--avd", avd, "--port", port];
      if (method == "Monkeyrunner") {
        if (statementCoverage) {
          orkaParameters = await executeStatementCoverageInstrumentation(
            appName, method, app,
            monkeyrunnerScript, orkaParameters);
        } else {
          orkaParameters = orkaParameters.concat(["--app", app]);
        }
        orkaParameters = orkaParameters.concat(["--mr", monkeyrunnerScript]);
      } else if (method == "DroidMate-2") {
        orkaParameters = orkaParameters.concat(["--app", app]);
        orkaParameters = orkaParameters
          .concat(profile.appendTestProfile(category));
      }
      return resolve(orkaParameters);
    });
}

function executeOrkaProcess(
  db, res, appName, method,
  app, monkeyrunnerScript, category, orkaParameters) {
  return new Promise((resolve, reject) => {
    console.log("Executing Orka process with parameters\n" + orkaParameters.join(" "));
    const orkaProcess = spawn('python', orkaParameters);
    orkaProcess.stdout.setEncoding('utf-8');
    orkaProcess.stdout.on('data', function(data) {
      console.log(data);
    });
    orkaProcess.stderr.on('data', (data) => {
      if (Buffer.isBuffer(data)) {
        console.log(data.toString());
      } else {
        console.log(data);
      }
    });
    orkaProcess.on('close', function(exitCode) {
      console.log("Orka process has finished");

      // Delete files
      let files = [app, monkeyrunnerScript];
      if (method != "Monkeyrunner") {
        files.pop();
      }
      fileHandler.deleteFiles(files);
      return resolve();
    });
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
  extractPackageName: extractPackageName,
}
