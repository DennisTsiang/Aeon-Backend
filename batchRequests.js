var energyEvaluator = require('./energyEvaluator');
var exec = require('child_process').exec;
var locks = require('locks');
const retry = require('async-retry');

const APP_DIRECTORY = "uploads/apps/";
var mutexLockAVD = locks.createMutex();
var mutexLockRequestsQueue = locks.createMutex();
var availableAVDs = null;
var requestsQueue = [];

async function evaluateAllEnergyRequests(res, db, energyRequests) {
  let csvDataResults = [];
  console.log("Energy Requests");
  console.log(energyRequests);
  if (availableAVDs == null) {
    availableAVDs = await getAvailableAVDs();
  }
  let listOfEnergyRequestPromises = energyRequests.map((parameters) => {
    return new Promise(async (resolve, reject) => {
      let parametersValid = energyEvaluator.checkParameters(res, parameters);
      if (!parametersValid) {
        return reject();
      }
      // Get package name
      let app = APP_DIRECTORY+parameters.filename;
      let appName = energyEvaluator.extractPackageName(app);
      if (appName == null) {
        res.status("500");
        res.send("Error occurred extracting package name");
        return reject();
      }
      // Check if that app is already queued up. Need this so Orka
      // doesn't override the files
      await retry(async bail => {
        let appended = await appendRequestToQueue(appName);
        console.log(`Appended: ${appended}`);
        if (!appended) {
          // throw error in order to retry
          // will be caught by retry method
          throw new Error();
        } else {
          console.log("Requests queue:\n" + requestsQueue);
          await retry(async (bail, attemptNumber) => {
            console.log(`Attempt number ${attemptNumber}`);
            let nextFreeAVD = await getNextFreeAVD();
            if (!nextFreeAVD) {
              throw new Error();
            }
            parameters.AVD = nextFreeAVD;
            parameters.appName = appName;
            parameters.app = app;
            console.log(parameters);
            let err = null;
            let csvData = null;
            try {
              csvData = await energyEvaluator.evaluateEnergy(res, parameters, db);
            } catch (rejectErr){
              err = rejectErr;
            } finally {
              console.log("Finished Orka");
              await appendNextFreeAVD(nextFreeAVD);
              console.log("Finished appending next free AVD");
              await removeRequestFromQueue(appName);
              console.log("Finished removing from queue");
              if (err) {
                return resolve(null);
              }
              return resolve(csvData);
            }
          }, {
            forever: true,
            onRetry: (err) => {
              console.log(err);
            },
          });
        }
      }, {
        forever: true,
      })
    });
  });

  for (let promise of listOfEnergyRequestPromises) {
    try {
      const csvData = await promise;
      if (csvData != null) {
        csvDataResults.push(csvData);
      }
    } catch (err) {

    }
  }

  //console.log(csvDataResults);
  res.send(csvDataResults);
}

function getAvailableAVDs() {
  return new Promise((resolve, reject) => {
    exec(process.env.ANDROID_HOME+"/tools/emulator -list-avds",
      (error, stdout, stderr) => {
        let availableAVDs = stdout.trim().split("\n");
        let portNumber = 5554;
        let avdPairs = availableAVDs.map(avdName => {
          let avdPair = {avdName: avdName, port: portNumber};
          // Increment by 2 as ADB connections should be odd numbered
          // and consoles should be even numbered
          portNumber += 2;
          return avdPair;
        });
        resolve(avdPairs);
      });
  });
}

function getNextFreeAVD() {
  return new Promise((resolve, reject) => {
    // If it stop working try adding async back to this inner function
    mutexLockAVD.lock(() => {
      console.log(availableAVDs);
      let nextAVD = availableAVDs.shift();
      mutexLockAVD.unlock();
      resolve(nextAVD);
    });
  });
}

function appendNextFreeAVD(avd) {
  return new Promise((resolve, reject) => {
    mutexLockAVD.lock(() => {
      availableAVDs.push(avd);
      mutexLockAVD.unlock();
      resolve();
    });
  });
}

function checkRequestsQueue(appName) {
  return new Promise((resolve, reject) => {
    mutexLockRequestsQueue.lock(() => {
      let appRequestExists = requestsQueue.indexOf(appName) >= 0;
      mutexLockRequestsQueue.unlock();
      resolve(appRequestExists);
    });
  });
}

function appendRequestToQueue(appName) {
  return new Promise((resolve, reject) => {
    mutexLockRequestsQueue.lock(() => {
      let appended = false;
      if (requestsQueue.indexOf(appName) == -1) {
        requestsQueue.push(appName);
        appended = true;
      }
      mutexLockRequestsQueue.unlock();
      resolve(appended);
    });
  });
}

function removeRequestFromQueue(appName) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to remove ${appName} from queue`);
    mutexLockRequestsQueue.lock(() => {
      let appIndex = requestsQueue.indexOf(appName);
      requestsQueue.splice(appIndex, 1);
      mutexLockRequestsQueue.unlock();
      resolve();
    });
  });
}

module.exports = {
  evaluateAllEnergyRequests: evaluateAllEnergyRequests
}
