function processResults(data, newTestTotalEnergy) {
  return new Promise(resolve => {
    let total_energies = getTotalEnergies(data);
    let labels = assignEfficiencyClasses(total_energies, 5);
    let rating = assignRating(labels, newTestTotalEnergy);
    let percentile = computePercentile(total_energies, newTestTotalEnergy);
    resolve([rating, percentile]);
  });
}

// Return hardware + routine energies
function getTotalEnergies(rows) {
  return rows.map(row => row.total_hardware_energy +
    row.total_routine_energy);
}

// rows - the rows of the table
function assignEfficiencyClasses(total_energies, numberOfClasses) {
  console.log("Total Energies");
  console.log(total_energies);
  let minEnergy = Math.min(...total_energies);
  let maxEnergy = Math.max(...total_energies);
  let range = maxEnergy - minEnergy;
  let width = range / numberOfClasses;
  console.log("Max Energy: " + maxEnergy);
  console.log("Min Energy: " + minEnergy);
  console.log("Width: " + width);
  let labels = [];
  for (i=0; i < numberOfClasses; i++) {
    let ACharCode = 65;
    let label = String.fromCharCode(i + ACharCode);
    labels.push({label: label, lowerBound: minEnergy + i*width});
  }
  console.log(labels);
  return labels;
}

function assignRating(labels, newTestTotalEnergy) {
  let index = 0;
  let currentLabel = labels[0];
  console.log("New total energy: " + newTestTotalEnergy);
  while (index+1 < labels.length &&
         newTestTotalEnergy >= labels[index+1].lowerBound) {
    currentLabel = labels[index+1];
    index++;
  }
  return currentLabel.label;
}

function computePercentile(totalEnergies, newTestTotalEnergy) {
  let index = 0;
  sortedTotalEnergies = totalEnergies.sort();
  while (index < sortedTotalEnergies.length &&
    newTestTotalEnergy > sortedTotalEnergies[index]) {
    index++;
  }
  let percentile = index/sortedTotalEnergies.length * 100;
  console.log("Percentile: " + percentile.toFixed(1));
  return percentile.toFixed(1);
}

module.exports = {
  processResults: processResults,
}
