const { generateExplanation } = require("../server/explain");

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.json({ error: "Method not allowed." });
    return;
  }

  const body = parseBody(req);
  const input = body.input;
  const estimate = body.estimate;

  if (!input || !estimate) {
    res.statusCode = 400;
    res.json({ error: "Missing input or estimate." });
    return;
  }

  try {
    const bullets = await generateExplanation({ input, estimate });
    res.statusCode = 200;
    res.json({ bullets });
  } catch (error) {
    res.statusCode = 200;
    res.json({ bullets: [] });
  }
};
