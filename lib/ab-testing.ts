import crypto from "crypto";

export type VariantMetrics = {
  impressions: number;
  conversions: number;
  avgLatencyMs: number;
  qualityScore: number;
};

export type TestInsight = {
  conversionRateA: number;
  conversionRateB: number;
  latencyDeltaMs: number;
  qualityDelta: number;
  confidence: number;
  winner: "A" | "B" | "tie";
};

function safeRate(conversions: number, impressions: number): number {
  if (impressions <= 0) {
    return 0;
  }
  return conversions / impressions;
}

function pseudoConfidence(rateA: number, rateB: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const delta = Math.abs(rateA - rateB);
  const sampleWeight = Math.min(1, total / 5000);
  return Number(Math.min(0.999, delta * 4 + sampleWeight * 0.4).toFixed(3));
}

export function deriveTestInsight(a: VariantMetrics, b: VariantMetrics): TestInsight {
  const rateA = safeRate(a.conversions, a.impressions);
  const rateB = safeRate(b.conversions, b.impressions);
  const confidence = pseudoConfidence(rateA, rateB, a.impressions + b.impressions);

  let winner: "A" | "B" | "tie" = "tie";
  if (confidence >= 0.55) {
    if (rateA > rateB) {
      winner = "A";
    }
    if (rateB > rateA) {
      winner = "B";
    }
  }

  return {
    conversionRateA: Number((rateA * 100).toFixed(2)),
    conversionRateB: Number((rateB * 100).toFixed(2)),
    latencyDeltaMs: Number((a.avgLatencyMs - b.avgLatencyMs).toFixed(2)),
    qualityDelta: Number((a.qualityScore - b.qualityScore).toFixed(2)),
    confidence,
    winner
  };
}

export function assignVariant(seed: string, trafficSplit: number): "A" | "B" {
  const digest = crypto.createHash("sha1").update(seed).digest("hex");
  const bucket = parseInt(digest.slice(0, 8), 16) % 100;
  return bucket < Math.max(0, Math.min(trafficSplit, 100)) ? "A" : "B";
}
