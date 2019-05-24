var baselines = require('./baselines.js');

function processResults(data, newTestTotalEnergy, method, category) {
  return new Promise(resolve => {
    let labels = null;
    let total_energies = getTotalEnergies(data);
    if (method == 'DroidMate-2' &&
        baselines.getBaseline(category) != undefined) {
      labels = assignEfficiencyClassesFromBaseline(
        baselines.getBaseline(category), 5);
    } else {
      labels = assignEfficiencyClasses(total_energies, 5);
    }
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
  let iqrResult = interquartileRange(total_energies);
  let q1 = iqrResult[0];
  let q3 = iqrResult[1];
  let iqr = iqrResult[2];
  let upperOutlierBoundary = q3 + 1.5 * iqr;
  let bottomOutlierBoundary = Math.max(q1 - 1.5 * iqr, 0);
  //let minEnergy = Math.min(...total_energies);
  //let maxEnergy = Math.max(...total_energies);

  let range = upperOutlierBoundary - bottomOutlierBoundary;
  let width = range / numberOfClasses;
  console.log("Max Energy: " + upperOutlierBoundary);
  console.log("Min Energy: " + bottomOutlierBoundary);
  console.log("Width: " + width);
  let labels = [];
  for (i=0; i < numberOfClasses; i++) {
    let ACharCode = 65;
    let label = String.fromCharCode(i + ACharCode);
    labels.push({label: label, lowerBound: bottomOutlierBoundary + i*width});
  }
  console.log(labels);
  return labels;
}

function assignEfficiencyClassesFromBaseline(baseline, numberOfClasses) {
  let labels = [];
  let ACharCode = 65;
  for (var i=0; i < numberOfClasses; i++) {
    let label = String.fromCharCode(i + ACharCode);
    labels.push({
      label: label,
      lowerBound: baseline.baseline - Math.floor(numberOfClasses / 2) * baseline.width + i * baseline.width,
    });
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

function medianIndex(startIndex, endIndex) {
  let length = (endIndex - startIndex) + 1;
  let offsetFromStart = (length + 1)/2 - 1;
  return Math.floor(offsetFromStart) + startIndex;
}

function median(array, startIndex, endIndex) {
  let index = medianIndex(startIndex, endIndex);
  let length = (endIndex - startIndex) + 1;
  if (length % 2 == 0) {
    return (array[index] + array[index+1]) / 2;
  } else {
    return array[index];
  }
}

function interquartileRange(array) {
  if (array.length == 1) {
    return [array[0], array[0], 0];
  }
  array.sort((a, b) => a - b);
  let index = medianIndex(0, array.length-1);
  let q1 = median(array, 0, index);
  let q3 = median(array, index+1, array.length-1);
  return [q1, q3, q3 - q1];
}

module.exports = {
  processResults: processResults,
}
