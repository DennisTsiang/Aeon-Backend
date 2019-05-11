require('dotenv').config();
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL);
const categories = require('./categories');

function saveEnergyResults(
  hardwareTotal,
  routineTotal,
  rating,
  categoryValue,
  statementCoverage,
  runtime) {
  if (statementCoverage == null) {
    statementCoverage = 0;
  }
  let categoryMapping = categories.categoryMapping();
  let table = categoryMapping[categoryValue];
  db.none('INSERT INTO '+table+'('+
    'total_hardware_energy, total_routine_energy, rating, statementCoverage, timeTaken)'+
    ' VALUES($1, $2, $3, $4, $5)',
    [hardwareTotal, routineTotal, rating, statementCoverage, runtime])
  .then(() => {
    console.log("Sucessfully inserted energy result.");
  })
  .catch(err => {
    console.log(err);
    console.log("Failed to insert energy result.");
  });
}

function getEnergyResultsByCategory(categoryValue, statementCoverage, timeTaken) {
  let categoryMapping = categories.categoryMapping();
  let table = categoryMapping[categoryValue];
  if (statementCoverage != null && timeTaken != null) {
    let sql = `SELECT * FROM ${table} WHERE statementCoverage >= `+
      `${statementCoverage}-10 AND statementCoverage <= ${statementCoverage}+10 `+
      `AND timeTaken >= ${timeTaken}-20 AND timeTaken <= ${timeTaken}+20`;
    console.log(sql);
    return db.any(sql);
  } else if (statementCoverage != null) {
    return db.any(`SELECT * FROM ${table} WHERE statementCoverage >= `+
      `${statementCoverage}-10 AND statementCoverage <= ${statementCoverage}+10`);
  } else if (timeTaken != null) {
    return db.any(`SELECT * FROM ${table} WHERE `+
      `timeTaken >= ${timeTaken}-20 AND timeTaken <= ${timeTaken}+20`);
  } else {
    return db.any('SELECT * FROM '+table)
  }
}

module.exports = {
  db: db,
  saveEnergyResults: saveEnergyResults,
  getEnergyResultsByCategory: getEnergyResultsByCategory,
}
