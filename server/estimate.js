function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDiff(value, target, range) {
  if (range === 0) {
    return 0;
  }
  return Math.abs(value - target) / range;
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[index];
}

function buildRanges(dataset) {
  const hours = dataset.map((job) => job.hours);
  const materials = dataset.map((job) => job.materialsCost);
  const techs = dataset.map((job) => job.techCount);
  const locations = dataset.map((job) => job.locationFactor);
  return {
    hours: Math.max(...hours) - Math.min(...hours),
    materials: Math.max(...materials) - Math.min(...materials),
    techs: Math.max(...techs) - Math.min(...techs),
    locations: Math.max(...locations) - Math.min(...locations)
  };
}

function scoreJob(input, job, ranges) {
  const categoryScore = input.category === job.category ? 1 : 0;
  const jobTypeScore = input.jobType === job.jobType ? 1 : 0;
  const siteScore = input.siteType === job.siteType ? 1 : 0;
  const urgencyScore = input.urgency === job.urgency ? 1 : 0;

  const techScore = 1 - normalizeDiff(input.techCount, job.techCount, ranges.techs);
  const hoursScore =
    input.hours == null ? 0.6 : 1 - normalizeDiff(input.hours, job.hours, ranges.hours);
  const materialsScore =
    input.materialsCost == null
      ? 0.6
      : 1 - normalizeDiff(input.materialsCost, job.materialsCost, ranges.materials);
  const locationScore = 1 - normalizeDiff(input.locationFactor, job.locationFactor, ranges.locations);

  const score =
    categoryScore * 0.3 +
    jobTypeScore * 0.25 +
    siteScore * 0.15 +
    urgencyScore * 0.1 +
    techScore * 0.08 +
    hoursScore * 0.07 +
    materialsScore * 0.05 +
    locationScore * 0.05;

  return clamp(score, 0, 1);
}

function estimateRange(input, dataset) {
  const ranges = buildRanges(dataset);
  const scored = dataset
    .map((job) => ({
      job,
      score: scoreJob(input, job, ranges)
    }))
    .sort((a, b) => b.score - a.score);

  const similar = scored.slice(0, 10).filter((item) => item.score > 0.35);
  const usable = similar.length >= 5 ? similar : scored.slice(0, 8);

  const totalScore = usable.reduce((sum, item) => sum + item.score, 0) || 1;
  const weightedExpected =
    usable.reduce((sum, item) => sum + item.job.totalPrice * item.score, 0) / totalScore;

  const priceSamples = usable.map((item) => item.job.totalPrice);
  const p20 = percentile(priceSamples, 20);
  const p80 = percentile(priceSamples, 80);

  let rangeMultiplier = 1;
  if (input.complexity === "unknown") {
    rangeMultiplier += 0.25;
  } else if (input.complexity === "complex") {
    rangeMultiplier += 0.12;
  }
  if (input.urgency === "same-day") {
    rangeMultiplier += 0.08;
  } else if (input.urgency === "after-hours") {
    rangeMultiplier += 0.12;
  }
  if (input.materialsCost == null) {
    rangeMultiplier += 0.1;
  }

  const midpoint = weightedExpected;
  const baseHalfRange = (p80 - p20) / 2 || midpoint * 0.15;
  const halfRange = baseHalfRange * rangeMultiplier;

  const low = Math.max(0, midpoint - halfRange);
  const high = midpoint + halfRange;

  const avgSimilarity = usable.reduce((sum, item) => sum + item.score, 0) / usable.length;
  let confidence = 78;
  if (usable.length < 6) {
    confidence -= 12;
  }
  if (avgSimilarity < 0.6) {
    confidence -= 18;
  }
  if (input.complexity === "unknown") {
    confidence -= 12;
  } else if (input.complexity === "complex") {
    confidence -= 6;
  }
  if (input.materialsCost == null) {
    confidence -= 8;
  }
  if (input.hours == null) {
    confidence -= 8;
  }
  if (input.urgency !== "normal") {
    confidence -= 4;
  }

  confidence = clamp(Math.round(confidence), 22, 92);

  const materialRatio =
    usable.reduce((sum, item) => sum + item.job.materialsCost / item.job.totalPrice, 0) /
    usable.length;
  const materialShare = clamp(materialRatio, 0.12, 0.5);
  const overheadShare = 0.12;
  const materialsEstimate = midpoint * materialShare;
  const overheadEstimate = midpoint * overheadShare;
  const laborEstimate = Math.max(0, midpoint - materialsEstimate - overheadEstimate);

  return {
    expected: Math.round(midpoint),
    low: Math.round(low),
    high: Math.round(high),
    confidence,
    breakdown: {
      labor: Math.round(laborEstimate),
      materials: Math.round(materialsEstimate),
      overhead: Math.round(overheadEstimate)
    },
    similarJobs: usable.slice(0, 7).map((item) => ({
      id: item.job.id,
      category: item.job.category,
      jobType: item.job.jobType,
      siteType: item.job.siteType,
      urgency: item.job.urgency,
      techCount: item.job.techCount,
      hours: item.job.hours,
      materialsCost: item.job.materialsCost,
      totalPrice: item.job.totalPrice,
      score: Number(item.score.toFixed(2)),
      notes: item.job.notes
    })),
    meta: {
      avgSimilarity: Number(avgSimilarity.toFixed(2)),
      similarCount: usable.length
    }
  };
}

module.exports = {
  estimateRange
};
