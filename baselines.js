categories= require('./categories');

function getBaseline(category) {
  let baseline = {
    "Reddit_Browsers": {"baseline": 296, "width": 50},
    "Web_Browsers": {"baseline": 145, "width": 80},
  };
  let categoryMapping = categories.categoryMapping();
  return baseline[categoryMapping[category]];
}

module.exports = {
  getBaseline: getBaseline
}
