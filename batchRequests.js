var energyEvaluator = require('./energyEvaluator');

async function evaluateAllEnergyRequests(res, db, energyRequests) {
  let csvDataResults = [];
  console.log(energyRequests);
  for (let i=0; i < energyRequests.length; i++) {
    let parameters = energyRequests[i];
    console.log(parameters);
    let parametersValid = energyEvaluator.checkParameters(res, parameters);
    if (!parametersValid) {
      return;
    }
    let csvData = await energyEvaluator.evaluateEnergy(res, parameters, db);
    csvDataResults.push(csvData);
  }
  console.log(csvDataResults);
  res.send(csvDataResults);
}

module.exports = {
  evaluateAllEnergyRequests: evaluateAllEnergyRequests
}
