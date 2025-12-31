const fs = require("fs");
const path = require("path");
const { generateDataset } = require("./seed");

const dataPath = path.join(__dirname, "..", "data", "jobs.json");

function loadDataset() {
  if (fs.existsSync(dataPath)) {
    const raw = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  }

  const dataset = generateDataset({ count: 220, seed: 42 });
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(dataset, null, 2));
  return dataset;
}

module.exports = {
  loadDataset,
  dataPath
};
