var fs = require('fs-extra');
var async = require('async');

const APP_DIRECTORY = "uploads/apps/";
const SCRIPT_DIRECTORY = "uploads/monkeyrunner_scripts/";

function deleteFiles(files) {
  return new Promise((resolve, reject) => {
    async.each(files, function(file, asyncEachCb) {
      console.log("Deleting file " + file);
      fs.unlink(file, function(err) {
        if (!err) {
          console.log("Deleted " + file);
        }
        asyncEachCb(err);
      });
    }, function(err){
      if (err) {
        console.log(err);
        return resolve(false);
      } else {
        console.log("All files deleted successfully.");
        return resolve(true);
      }
    });
  });
}

function completePaths(filesObj) {
  let appsFilenames = filesObj.apps;
  let appsPaths = appsFilenames.map(filename => APP_DIRECTORY+filename);

  let scriptFilenames = filesObj.scripts;
  let scriptPaths = scriptFilenames.map(filename => SCRIPT_DIRECTORY+filename);
  return appsPaths.concat(scriptPaths);
}

function createWorkingDir(instrumentationDir) {
  if (fs.existsSync(instrumentationDir)) {
    fs.removeSync(instrumentationDir);
  }
  fs.mkdirSync(instrumentationDir);
}

async function retrieveFile(filepath) {
  return new Promise(async (resolve, reject) => {
    fs.readFile(filepath, (err, data) => {
      fs.stat(filepath, (err, stats) => {
        let size = stats.size;
        return resolve([data, size]);
      });
    });
  });
}

module.exports = {
  deleteFiles: deleteFiles,
  completePaths: completePaths,
  createWorkingDir: createWorkingDir,
  retrieveFile: retrieveFile,
}
