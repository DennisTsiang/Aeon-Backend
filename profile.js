function appendTestProfile(category) {
  let parameters = ["--delay"];
  switch (category) {
    case "Reddit Browsers":
      parameters.push("100")
      break;
    default:
      parameters.push("1000");
      break;
  }
  return parameters;
}


module.exports = {
  appendTestProfile: appendTestProfile
}
