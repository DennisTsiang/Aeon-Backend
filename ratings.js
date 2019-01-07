function processResults(data, newTestTotalEnergy) {
  return new Promise(resolve => {
    let labels = assignEfficiencyClasses(data, 5);
    let rating = assignRating(labels, newTestTotalEnergy);
    resolve(rating);
  });
}

// rows - the rows of the table
function assignEfficiencyClasses(rows, numberOfClasses) {
  let total_energies = rows.map(row => row.total_hardware_energy +
    row.total_routine_energy);
  let minEnergy = Math.min(total_energies);
  let maxEnergy = Math.max(total_energies);
  let range = maxEnergy - minEnergy;
  let width = range / numberOfClasses;
  let labels = [];
  for (i=0; i < numberOfClasses; i++) {
    let ACharCode = 65;
    let label = String.fromCharCode(i + ACharCode);
    labels.push({label: label, lowerBound: minEnergy + i*width});
  }
  return labels;
}

function assignRating(labels, newTestTotalEnergy) {
  let index = 0;
  let currentLabel = labels[0];
  while (index+1 < labels.length &&
         newTestTotalEnergy >= labels[index+1].lowerBound) {
    currentLabel = labels[index+1];
    index++;
  }
  return currentLabel.label;
}

module.exports = {
  processResults: processResults,
}
