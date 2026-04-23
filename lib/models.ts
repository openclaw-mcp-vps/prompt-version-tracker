export type PromptSummary = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  latest_version: number | null;
  latest_content: string | null;
  tests_count: number;
  running_tests: number;
};

export type PromptVersion = {
  id: number;
  version_number: number;
  content: string;
  notes: string;
  content_hash: string;
  created_by: string;
  created_at: string;
};

export type PromptDetail = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TestInsight = {
  conversionRateA: number;
  conversionRateB: number;
  latencyDeltaMs: number;
  qualityDelta: number;
  confidence: number;
  winner: "A" | "B" | "tie";
};

export type PromptTest = {
  id: number;
  prompt_id: string;
  name: string;
  version_a_id: number;
  version_b_id: number;
  version_a_number: number;
  version_b_number: number;
  traffic_split: number;
  status: "running" | "paused" | "completed";
  created_at: string;
  ended_at: string | null;
  a_impressions: number;
  a_conversions: number;
  a_latency: number;
  a_quality: number;
  b_impressions: number;
  b_conversions: number;
  b_latency: number;
  b_quality: number;
  insight: TestInsight;
};
