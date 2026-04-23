import { createId, initDatabase, query } from "@/lib/database";

export type PromptAnalyticsOverview = {
  totalPrompts: number;
  totalVersions: number;
  totalTests: number;
  totalRuns: number;
  avgScore: number;
  avgLatencyMs: number;
  monthlyCostUsd: number;
};

export type PromptPerformancePoint = {
  date: string;
  avgScore: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  runs: number;
};

export type VersionPerformance = {
  versionId: string;
  versionNumber: number;
  avgScore: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  runs: number;
};

export function computeOutputQualityScore(
  output: string,
  evaluationNotes: string
): number {
  const text = output.trim();
  const notes = evaluationNotes.trim().toLowerCase();

  if (text.length === 0) {
    return 0;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));

  let score = 50;
  score += Math.min(words.length, 120) * 0.18;
  score += Math.min(uniqueWords.size, 80) * 0.22;

  if (notes.length > 0) {
    const noteWords = notes.split(/\s+/).filter(Boolean);
    if (noteWords.length > 0) {
      const overlap = noteWords.filter((word) =>
        uniqueWords.has(word.replace(/[^a-z0-9]/g, ""))
      ).length;
      const coverage = overlap / noteWords.length;
      score += coverage * 22;
    }
  }

  const punctuationCount = (text.match(/[.!?]/g) ?? []).length;
  score += Math.min(punctuationCount, 8) * 0.8;

  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

export async function recordPerformanceEvent(input: {
  promptId: string;
  versionId: string;
  eventType: string;
  score: number | null;
  latencyMs: number | null;
  tokenUsage: number | null;
  costUsd: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await initDatabase();

  await query(
    `
    INSERT INTO performance_events
      (id, prompt_id, version_id, event_type, score, latency_ms, token_usage, cost_usd, metadata)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      createId("evt"),
      input.promptId,
      input.versionId,
      input.eventType,
      input.score,
      input.latencyMs,
      input.tokenUsage,
      input.costUsd,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function getAnalyticsOverview(): Promise<PromptAnalyticsOverview> {
  await initDatabase();

  const result = await query<{
    total_prompts: string;
    total_versions: string;
    total_tests: string;
    total_runs: string;
    avg_score: string | null;
    avg_latency_ms: string | null;
    monthly_cost_usd: string | null;
  }>(
    `
    SELECT
      (SELECT COUNT(*) FROM prompts WHERE archived = FALSE) AS total_prompts,
      (SELECT COUNT(*) FROM prompt_versions) AS total_versions,
      (SELECT COUNT(*) FROM ab_tests) AS total_tests,
      (SELECT COUNT(*) FROM test_runs) AS total_runs,
      (SELECT AVG(score) FROM performance_events WHERE score IS NOT NULL) AS avg_score,
      (SELECT AVG(latency_ms) FROM performance_events WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
      (
        SELECT COALESCE(SUM(cost_usd), 0)
        FROM performance_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
      ) AS monthly_cost_usd
    `
  );

  const row = result.rows[0];

  return {
    totalPrompts: Number(row.total_prompts),
    totalVersions: Number(row.total_versions),
    totalTests: Number(row.total_tests),
    totalRuns: Number(row.total_runs),
    avgScore: row.avg_score ? Number(Number(row.avg_score).toFixed(2)) : 0,
    avgLatencyMs: row.avg_latency_ms ? Number(Number(row.avg_latency_ms).toFixed(0)) : 0,
    monthlyCostUsd: row.monthly_cost_usd
      ? Number(Number(row.monthly_cost_usd).toFixed(4))
      : 0
  };
}

export async function getPromptPerformanceSeries(
  promptId: string
): Promise<PromptPerformancePoint[]> {
  await initDatabase();

  const result = await query<{
    bucket: string;
    avg_score: string | null;
    avg_latency_ms: string | null;
    avg_cost_usd: string | null;
    runs: string;
  }>(
    `
    SELECT
      DATE_TRUNC('day', created_at)::date::text AS bucket,
      AVG(score) AS avg_score,
      AVG(latency_ms) AS avg_latency_ms,
      AVG(cost_usd) AS avg_cost_usd,
      COUNT(*) AS runs
    FROM performance_events
    WHERE prompt_id = $1
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at)::date::text
    ORDER BY bucket ASC
    `,
    [promptId]
  );

  return result.rows.map((row) => ({
    date: row.bucket,
    avgScore: row.avg_score ? Number(Number(row.avg_score).toFixed(2)) : 0,
    avgLatencyMs: row.avg_latency_ms ? Number(Number(row.avg_latency_ms).toFixed(0)) : 0,
    avgCostUsd: row.avg_cost_usd ? Number(Number(row.avg_cost_usd).toFixed(6)) : 0,
    runs: Number(row.runs)
  }));
}

export async function getVersionPerformance(
  promptId: string
): Promise<VersionPerformance[]> {
  await initDatabase();

  const result = await query<{
    version_id: string;
    version_number: number;
    avg_score: string | null;
    avg_latency_ms: string | null;
    avg_cost_usd: string | null;
    runs: string;
  }>(
    `
    SELECT
      pv.id AS version_id,
      pv.version_number,
      AVG(pe.score) AS avg_score,
      AVG(pe.latency_ms) AS avg_latency_ms,
      AVG(pe.cost_usd) AS avg_cost_usd,
      COUNT(pe.id) AS runs
    FROM prompt_versions pv
    LEFT JOIN performance_events pe ON pe.version_id = pv.id
    WHERE pv.prompt_id = $1
    GROUP BY pv.id, pv.version_number
    ORDER BY pv.version_number DESC
    `,
    [promptId]
  );

  return result.rows.map((row) => ({
    versionId: row.version_id,
    versionNumber: row.version_number,
    avgScore: row.avg_score ? Number(Number(row.avg_score).toFixed(2)) : 0,
    avgLatencyMs: row.avg_latency_ms ? Number(Number(row.avg_latency_ms).toFixed(0)) : 0,
    avgCostUsd: row.avg_cost_usd ? Number(Number(row.avg_cost_usd).toFixed(6)) : 0,
    runs: Number(row.runs)
  }));
}
