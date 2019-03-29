var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;
var fs = require('fs-extra');

function instrumentAPKToIncludeStatementCoverage(apkDir, apkFilename) {
  let parameters = ["-jar", "vendor/orka/dependencies/DM-2-mod.jar",
    "--Exploration-apksDir="+apkDir, "--ExecutionMode-explore=false",
    "--ExecutionMode-coverage=true"]
  const droidMateInstrumentatorProcess = spawn('java', parameters);
  droidMateInstrumentatorProcess.stdout.setEncoding('utf-8');
  droidMateInstrumentatorProcess.stdout.on('data', function(data) {
    console.log(data);
  });
  return droidMateInstrumentatorProcess;
}

function createWorkingDir(instrumentationDir, app) {
  if (fs.existsSync(instrumentationDir)) {
    fs.removeSync(instrumentationDir);
  }
  fs.mkdirSync(instrumentationDir);
  // Copy apk file over
  appFilename= app.split("/").slice(-1)[0];
  fs.copyFileSync(app, instrumentationDir+"/"+appFilename);
}

module.exports = {
  instrumentAPKToIncludeStatementCoverage: instrumentAPKToIncludeStatementCoverage,
  createWorkingDir: createWorkingDir
}
