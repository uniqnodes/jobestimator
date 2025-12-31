const FALLBACK_BULLETS = [
  "Estimate is anchored to similar jobs with the closest category and job type.",
  "Urgency adds a premium and widens the range to reflect schedule risk.",
  "Unknown conditions expand the range and reduce confidence.",
  "Differences in hours or materials vs. similar jobs shift the midpoint.",
  "Final pricing can change after an on-site inspection."
];

async function generateExplanation({ input, estimate }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return FALLBACK_BULLETS;
  }

  const similarJobsSummary = estimate.similarJobs.slice(0, 5).map((job) => ({
    id: job.id,
    jobType: job.jobType,
    siteType: job.siteType,
    urgency: job.urgency,
    totalPrice: job.totalPrice,
    notes: job.notes
  }));

  const prompt = [
    {
      role: "system",
      content:
        "You are a pricing assistant. Provide 4-6 concise bullet points (80-120 words total) explaining the estimate. Must mention urgency impact, unknown conditions risk, and how this job differs from similar jobs. Be factual, avoid guarantees, and include a final inspection caveat."
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          input,
          estimate: {
            low: estimate.low,
            expected: estimate.expected,
            high: estimate.high,
            confidence: estimate.confidence,
            breakdown: estimate.breakdown
          },
          similarJobs: similarJobsSummary
        },
        null,
        2
      )
    }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: prompt,
      temperature: 0.4
    })
  });

  if (!response.ok) {
    return FALLBACK_BULLETS;
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const bullets = text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return bullets.length ? bullets : FALLBACK_BULLETS;
}

module.exports = {
  generateExplanation
};
