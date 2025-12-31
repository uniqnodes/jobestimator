const path = require("path");

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function weightedPick(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1].value;
}

function randBetween(rng, min, max) {
  return min + (max - min) * rng();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const CATEGORY_PROFILES = {
  HVAC: {
    baseRate: 115,
    jobTypes: {
      install: { hours: [8, 20], materialRatio: [0.35, 0.6] },
      repair: { hours: [2, 8], materialRatio: [0.1, 0.35] },
      maintenance: { hours: [1, 4], materialRatio: [0.05, 0.2] },
      inspection: { hours: [1, 3], materialRatio: [0.05, 0.15] },
      emergency: { hours: [2, 6], materialRatio: [0.1, 0.3] }
    }
  },
  Plumbing: {
    baseRate: 100,
    jobTypes: {
      install: { hours: [6, 16], materialRatio: [0.25, 0.55] },
      repair: { hours: [2, 6], materialRatio: [0.1, 0.35] },
      maintenance: { hours: [1, 3], materialRatio: [0.05, 0.2] },
      "drain-cleaning": { hours: [2, 5], materialRatio: [0.1, 0.25] },
      emergency: { hours: [2, 6], materialRatio: [0.1, 0.3] }
    }
  },
  Electrical: {
    baseRate: 110,
    jobTypes: {
      install: { hours: [6, 14], materialRatio: [0.25, 0.55] },
      repair: { hours: [1.5, 5], materialRatio: [0.1, 0.3] },
      maintenance: { hours: [1, 3], materialRatio: [0.05, 0.2] },
      "panel-upgrade": { hours: [4, 10], materialRatio: [0.2, 0.5] },
      emergency: { hours: [2, 6], materialRatio: [0.1, 0.3] }
    }
  }
};

const NOTE_BANK = [
  "access difficulty",
  "old unit",
  "parts delay",
  "tight crawlspace",
  "code compliance upgrade",
  "tenant occupied",
  "rusted fittings",
  "limited parking",
  "noise restrictions",
  "long material lead time"
];

const REGION_BANK = ["North", "South", "West", "Midwest", "East"];

function generateDataset({ count = 200, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  const categories = Object.keys(CATEGORY_PROFILES);
  const urgencyOptions = ["normal", "same-day", "after-hours"];
  const siteOptions = ["residential", "commercial"];

  const dataset = [];

  for (let i = 0; i < count; i += 1) {
    const category = pick(rng, categories);
    const profile = CATEGORY_PROFILES[category];
    const jobType = pick(rng, Object.keys(profile.jobTypes));
    const jobProfile = profile.jobTypes[jobType];
    const siteType = weightedPick(rng, [
      { value: "residential", weight: 0.65 },
      { value: "commercial", weight: 0.35 }
    ]);
    const urgency = weightedPick(rng, [
      { value: "normal", weight: 0.6 },
      { value: "same-day", weight: 0.25 },
      { value: "after-hours", weight: 0.15 }
    ]);
    const techCount = weightedPick(rng, [
      { value: 1, weight: 0.5 },
      { value: 2, weight: 0.35 },
      { value: 3, weight: 0.12 },
      { value: 4, weight: 0.03 }
    ]);

    const hours = clamp(randBetween(rng, jobProfile.hours[0], jobProfile.hours[1]), 1, 24);
    const locationFactor = weightedPick(rng, [
      { value: 0.9, weight: 0.15 },
      { value: 1.0, weight: 0.45 },
      { value: 1.1, weight: 0.25 },
      { value: 1.2, weight: 0.15 }
    ]);

    const urgencyMultiplier = urgency === "normal" ? 1 : urgency === "same-day" ? 1.2 : 1.35;
    const siteMultiplier = siteType === "commercial" ? 1.12 : 1;
    const baseRate = profile.baseRate + (siteType === "commercial" ? 15 : 0);

    const labor = hours * techCount * baseRate * urgencyMultiplier * locationFactor * siteMultiplier;

    const materialRatio = randBetween(rng, jobProfile.materialRatio[0], jobProfile.materialRatio[1]);
    const materialsCost = labor * materialRatio * randBetween(rng, 0.8, 1.2);

    const overhead = randBetween(rng, 0.08, 0.15);
    const margin = randBetween(rng, 0.1, 0.2);
    const subtotal = labor + materialsCost;
    const noise = randBetween(rng, -0.05, 0.05) * subtotal;
    const totalPrice = subtotal * (1 + overhead + margin) + noise;

    const monthsBack = Math.floor(randBetween(rng, 0, 18));
    const date = new Date();
    date.setMonth(date.getMonth() - monthsBack);
    date.setDate(Math.max(1, Math.floor(randBetween(rng, 1, 28))));

    dataset.push({
      id: `job-${i + 1}`,
      category,
      jobType,
      siteType,
      urgency,
      techCount,
      hours: Number(hours.toFixed(1)),
      materialsCost: Math.round(materialsCost),
      locationFactor,
      totalPrice: Math.round(totalPrice),
      notes: pick(rng, NOTE_BANK),
      date: date.toISOString().slice(0, 10),
      region: pick(rng, REGION_BANK)
    });
  }

  return dataset;
}

module.exports = {
  CATEGORY_PROFILES,
  generateDataset,
  mulberry32
};
