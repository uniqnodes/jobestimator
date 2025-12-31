const path = require("path");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const { loadDataset } = require("./dataset");
const { estimateRange } = require("./estimate");
const { generateExplanation } = require("./explain");

const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const app = express();
const dataset = loadDataset();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/estimate", (req, res) => {
  const input = req.body || {};
  if (!input.category || !input.jobType || !input.siteType || !input.urgency) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const normalizedInput = {
    ...input,
    locationFactor: input.locationFactor ? Number(input.locationFactor) : 1
  };
  const estimate = estimateRange(normalizedInput, dataset);
  res.json(estimate);
});

app.post("/api/explain", async (req, res) => {
  const { input, estimate } = req.body || {};
  if (!input || !estimate) {
    res.status(400).json({ error: "Missing input or estimate." });
    return;
  }

  try {
    const bullets = await generateExplanation({ input, estimate });
    res.json({ bullets });
  } catch (error) {
    res.json({ bullets: [] });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Job Estimator PoC running at http://localhost:${port}`);
});
