var spawn = require("child_process").spawn;
var execSync = require("child_process").execSync;

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

module.exports = {
  instrumentAPKToIncludeStatementCoverage: instrumentAPKToIncludeStatementCoverage
}
