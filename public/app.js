const jobTypesByCategory = {
  HVAC: ["install", "repair", "maintenance", "inspection", "emergency"],
  Plumbing: ["install", "repair", "maintenance", "drain-cleaning", "emergency"],
  Electrical: ["install", "repair", "maintenance", "panel-upgrade", "emergency"]
};

const form = document.getElementById("estimate-form");
const categoryEl = document.getElementById("category");
const jobTypeEl = document.getElementById("jobType");
const siteTypeEl = document.getElementById("siteType");
const urgencyEl = document.getElementById("urgency");
const techCountEl = document.getElementById("techCount");
const hoursEl = document.getElementById("hours");
const materialsEl = document.getElementById("materialsCost");
const complexityEl = document.getElementById("complexity");
const locationEl = document.getElementById("locationFactor");
const explainButton = document.getElementById("explain-btn");
const copyButton = document.getElementById("copy-summary");
const summaryEl = document.getElementById("result-summary");
const demoButton = document.getElementById("demo-toggle");
const demoStatus = document.getElementById("demo-status");

let latestInput = null;
let latestEstimate = null;
let demoRunning = false;
let demoTimer = null;
let demoIndex = 0;

const demoSequence = [
  { key: "hvac-emergency", label: "HVAC emergency: wide range, lower confidence" },
  { key: "plumbing-maint", label: "Plumbing maintenance: tight range, high confidence" },
  { key: "commercial-install", label: "Commercial install: materials-heavy, higher total" }
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function setJobTypes(category) {
  jobTypeEl.innerHTML = "";
  jobTypesByCategory[category].forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type.replace("-", " ");
    jobTypeEl.appendChild(option);
  });
}

function getInput() {
  return {
    category: categoryEl.value,
    jobType: jobTypeEl.value,
    siteType: siteTypeEl.value,
    urgency: urgencyEl.value,
    techCount: Number(techCountEl.value),
    hours: hoursEl.value ? Number(hoursEl.value) : null,
    materialsCost: materialsEl.value ? Number(materialsEl.value) : null,
    complexity: complexityEl.value,
    locationFactor: Number(locationEl.value)
  };
}

function updateResults(estimate) {
  document.getElementById("low").textContent = formatCurrency(estimate.low);
  document.getElementById("expected").textContent = formatCurrency(estimate.expected);
  document.getElementById("high").textContent = formatCurrency(estimate.high);
  document.getElementById("labor").textContent = formatCurrency(estimate.breakdown.labor);
  document.getElementById("materials").textContent = formatCurrency(estimate.breakdown.materials);
  document.getElementById("overhead").textContent = formatCurrency(estimate.breakdown.overhead);

  const confidenceValue = document.getElementById("confidence-value");
  confidenceValue.textContent = `${estimate.confidence}%`;
  document.getElementById("confidence-bar").style.width = `${estimate.confidence}%`;

  summaryEl.textContent = `Based on ${estimate.meta.similarCount} similar jobs, avg similarity ${estimate.meta.avgSimilarity}.`;

  const similarList = document.getElementById("similar-list");
  similarList.innerHTML = "";
  estimate.similarJobs.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job-card";
    card.innerHTML = `
      <strong>${job.category} ${job.jobType.replace("-", " ")}</strong>
      <span>${job.siteType} · ${job.urgency} · ${job.techCount} techs</span>
      <span>Hours ${job.hours} · Materials ${formatCurrency(job.materialsCost)}</span>
      <span>Total ${formatCurrency(job.totalPrice)} · Score ${job.score}</span>
      <span>Note: ${job.notes}</span>
    `;
    similarList.appendChild(card);
  });
}

function updateExplanation(bullets) {
  const list = document.getElementById("explain-list");
  list.innerHTML = "";
  bullets.forEach((bullet) => {
    const li = document.createElement("li");
    li.textContent = bullet;
    list.appendChild(li);
  });
}

async function runEstimate() {
  const input = getInput();
  latestInput = input;
  updateExplanation(["Generating estimate..."]);

  const response = await fetch("/api/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    updateExplanation(["Unable to generate estimate. Check required fields."]);
    return null;
  }

  const estimate = await response.json();
  latestEstimate = estimate;
  updateResults(estimate);
  updateExplanation([
    "Estimate ready. Click Explain estimate to generate the reasoning."
  ]);
  return estimate;
}

async function runExplain() {
  if (!latestInput || !latestEstimate) {
    updateExplanation(["Run an estimate first."]);
    return [];
  }

  updateExplanation(["Generating explanation..."]);

  const response = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: latestInput, estimate: latestEstimate })
  });

  const data = await response.json();
  const bullets = data.bullets && data.bullets.length ? data.bullets : [
    "Estimate explanation unavailable."
  ];
  updateExplanation(bullets);
  return bullets;
}

function applyScenario(key) {
  if (key === "hvac-emergency") {
    categoryEl.value = "HVAC";
    setJobTypes("HVAC");
    jobTypeEl.value = "repair";
    siteTypeEl.value = "residential";
    urgencyEl.value = "same-day";
    techCountEl.value = "2";
    hoursEl.value = "5";
    materialsEl.value = "";
    complexityEl.value = "unknown";
    locationEl.value = "1.1";
  }

  if (key === "plumbing-maint") {
    categoryEl.value = "Plumbing";
    setJobTypes("Plumbing");
    jobTypeEl.value = "maintenance";
    siteTypeEl.value = "residential";
    urgencyEl.value = "normal";
    techCountEl.value = "1";
    hoursEl.value = "2";
    materialsEl.value = "250";
    complexityEl.value = "standard";
    locationEl.value = "1";
  }

  if (key === "commercial-install") {
    categoryEl.value = "Electrical";
    setJobTypes("Electrical");
    jobTypeEl.value = "install";
    siteTypeEl.value = "commercial";
    urgencyEl.value = "normal";
    techCountEl.value = "3";
    hoursEl.value = "10";
    materialsEl.value = "4200";
    complexityEl.value = "complex";
    locationEl.value = "1.1";
  }

  return runEstimate();
}

categoryEl.addEventListener("change", (event) => {
  setJobTypes(event.target.value);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runEstimate();
});

explainButton.addEventListener("click", runExplain);

copyButton.addEventListener("click", () => {
  if (!latestEstimate) {
    return;
  }
  const text = `Estimate range ${formatCurrency(latestEstimate.low)} - ${formatCurrency(
    latestEstimate.high
  )}, expected ${formatCurrency(latestEstimate.expected)} with ${latestEstimate.confidence}% confidence.`;
  navigator.clipboard.writeText(text);
});

document.querySelectorAll("[data-scenario]").forEach((button) => {
  button.addEventListener("click", () => applyScenario(button.dataset.scenario));
});

setJobTypes(categoryEl.value);

async function runDemoStep() {
  const scenario = demoSequence[demoIndex];
  demoStatus.textContent = scenario.label;
  await applyScenario(scenario.key);
  await runExplain();
  demoIndex = (demoIndex + 1) % demoSequence.length;
}

function scheduleNextDemo() {
  if (!demoRunning) {
    return;
  }
  runDemoStep().finally(() => {
    demoTimer = setTimeout(scheduleNextDemo, 2500);
  });
}

function toggleDemo() {
  demoRunning = !demoRunning;
  if (demoRunning) {
    demoButton.textContent = "Stop demo mode";
    demoStatus.textContent = "Demo running...";
    demoIndex = 0;
    scheduleNextDemo();
  } else {
    demoButton.textContent = "Proposal demo mode";
    demoStatus.textContent = "Demo mode ready.";
    if (demoTimer) {
      clearTimeout(demoTimer);
      demoTimer = null;
    }
  }
}

if (demoButton) {
  demoButton.addEventListener("click", toggleDemo);
}
