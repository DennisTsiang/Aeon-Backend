require('dotenv').config();
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);
const categories = require('./categories');

function sum(x, y) {
  return x + y;
}

function saveEnergyResults(csvData, categoryValue) {
  let categoryMapping = categories.categoryMapping();
  let hardwareTotal = csvData.hardwareData
    .map(csvPair => csvPair[1])
    .reduce(sum, 0);
  let routineTotal = csvData.apiData
    .map(csvPair => csvPair[1])
    .reduce(sum, 0);
  console.log("hardware total:"+hardwareTotal);
  console.log("routine total:"+routineTotal);
  let table = categoryMapping[categoryValue];
  // TODO: Grab rating
  db.none('INSERT INTO '+table+'('+
    'total_hardware_energy, total_routine_energy, rating) VALUES($1, $2, $3)',
    [hardwareTotal, routineTotal, "A"])
  .then(() => {
    console.log("Sucessfully inserted energy result.");
  })
  .catch(err => {
    console.log(err);
    console.log("Failed to insert energy result.");
  });
}

module.exports = {
  db: db,
  saveEnergyResults: saveEnergyResults,
}
