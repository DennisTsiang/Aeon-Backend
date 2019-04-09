const specificCategories = [
  "Alarm Clocks", "Dictionary", "Reddit Browsers", "Web Browsers"
];

const generalCategories = [
  "News", "Gaming", "Business", "Social Media", "Lifestyle", "Productivity",
  "Photography", "Video Players & Editors"
]

function categoryMapping() {
  let sortedCategories = specificCategories.sort()
    .concat(generalCategories.sort());
  let map = {};
  sortedCategories.forEach((category, index) => {
    map[index] = category.replace("& ", "").replace(/ /g, "_");
  });
  return map;
}

module.exports = {
  categoryMapping: categoryMapping,
}
