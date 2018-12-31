
function processResults(data) {
  return new Promise(resolve => {
    console.log(data);
    resolve();
  });
}

module.exports = {
  processResults: processResults,
}
