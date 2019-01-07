require('dotenv').config();
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);
const categories = require('./categories');

function saveEnergyResults(hardwareTotal, routineTotal, rating, categoryValue) {
  let categoryMapping = categories.categoryMapping();
  let table = categoryMapping[categoryValue];
  db.none('INSERT INTO '+table+'('+
    'total_hardware_energy, total_routine_energy, rating) VALUES($1, $2, $3)',
    [hardwareTotal, routineTotal, rating])
  .then(() => {
    console.log("Sucessfully inserted energy result.");
  })
  .catch(err => {
    console.log(err);
    console.log("Failed to insert energy result.");
  });
}

function getEnergyResultsByCategory(categoryValue) {
  let categoryMapping = categories.categoryMapping();
  let table = categoryMapping[categoryValue];
  return db.any('SELECT * FROM '+table)
}

module.exports = {
  db: db,
  saveEnergyResults: saveEnergyResults,
  getEnergyResultsByCategory: getEnergyResultsByCategory,
}
