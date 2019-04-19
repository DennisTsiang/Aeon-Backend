var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;
var fs = require('fs-extra');

const ACV_INSTRUMENTED_APK_DIR = "/home/den/acvtool/"

function instrumentAPKToIncludeStatementCoverage(
  instrumentationDir,
  appPath,
  apkFilename
) {
  return new Promise((resolve, reject) => {
    let parameters = ["instrument", appPath,
      "-f", "--wd", instrumentationDir]
    console.log("calling avc " + parameters.join(" "));
    const instrumentProcess = spawn('acv', parameters);
    instrumentProcess.stdout.setEncoding('utf-8');
    instrumentProcess.stdout.on('data', function(data) {
      console.log(data);
    });
    instrumentProcess.stderr.on('data', function(data) {
      if (Buffer.isBuffer(data)) {
        console.log(data.toString());
      } else {
        console.log(data);
      }
    });

    instrumentProcess.on('close', (exitCode) => {
      console.log("Finished instrumenting apk");
      let instrumentedApkFilepath = instrumentationDir + "/" +
        "instr_"+apkFilename;
      console.log("Looking for " + instrumentedApkFilepath);

      // Check that the instrumented file exists
      if (!fs.pathExistsSync(instrumentedApkFilepath)) {
        msg = "Instrumented APK could not be found";
        return reject(msg);
      }
      return resolve(instrumentedApkFilepath);
    });
  });
}

module.exports = {
  instrumentAPKToIncludeStatementCoverage: instrumentAPKToIncludeStatementCoverage,
}
