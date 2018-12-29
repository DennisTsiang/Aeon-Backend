const categories = [
  "News", "Gaming", "Business", "Social Media", "Lifestyle", "Productivity",
  "Photography", "Video Players & Editors"
]

function categoryMapping() {
  let sortedCategories = categories.sort();
  let map = {};
  sortedCategories.forEach((category, index) => {
    map[index] = category.replace(/ /g, "_");
  });
  return map;
}

module.exports = {
  categoryMapping: categoryMapping,
}
