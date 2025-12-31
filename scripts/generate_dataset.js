const fs = require("fs");
const path = require("path");
const { generateDataset } = require("../server/seed");

const outputPath = path.join(__dirname, "..", "data", "jobs.json");
const dataset = generateDataset({ count: 220, seed: 42 });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

console.log(`Generated ${dataset.length} jobs at ${outputPath}`);
