export const schemaStatements = [
  `
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS prompt_versions (
    id BIGSERIAL PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    notes TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(prompt_id, version_number)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ab_tests (
    id BIGSERIAL PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version_a_id BIGINT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
    version_b_id BIGINT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
    traffic_split INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'running',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ab_test_results (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
    impressions INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(test_id, variant)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    customer_id TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_ab_tests_prompt_id ON ab_tests(prompt_id);
  `
];

export type PromptRow = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PromptVersionRow = {
  id: number;
  prompt_id: string;
  version_number: number;
  content: string;
  notes: string;
  content_hash: string;
  created_by: string;
  created_at: string;
};

export type AbTestRow = {
  id: number;
  prompt_id: string;
  name: string;
  version_a_id: number;
  version_b_id: number;
  traffic_split: number;
  status: "running" | "paused" | "completed";
  created_at: string;
  ended_at: string | null;
};

export type AbTestResultRow = {
  id: number;
  test_id: number;
  variant: "A" | "B";
  impressions: number;
  conversions: number;
  avg_latency_ms: number;
  quality_score: number;
  created_at: string;
};
