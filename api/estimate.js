const { loadDataset } = require("../server/dataset");
const { estimateRange } = require("../server/estimate");

function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.json({ error: "Method not allowed." });
    return;
  }

  const input = parseBody(req);
  if (!input.category || !input.jobType || !input.siteType || !input.urgency) {
    res.statusCode = 400;
    res.json({ error: "Missing required fields." });
    return;
  }

  const normalizedInput = {
    ...input,
    locationFactor: input.locationFactor ? Number(input.locationFactor) : 1
  };

  const dataset = loadDataset();
  const estimate = estimateRange(normalizedInput, dataset);
  res.statusCode = 200;
  res.json(estimate);
};
