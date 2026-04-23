import { computeOutputQualityScore, recordPerformanceEvent } from "@/lib/analytics";
import { createId, initDatabase, query } from "@/lib/database";
import { getVersionById } from "@/lib/prompt-versioning";

export type ABTest = {
  id: string;
  promptId: string;
  versionAId: string;
  versionBId: string;
  status: "draft" | "running" | "completed";
  trafficSplit: number;
  winnerVersionId: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type TestRun = {
  id: string;
  testId: string;
  selectedVersion: "A" | "B";
  inputPayload: Record<string, unknown>;
  outputText: string;
  score: number | null;
  latencyMs: number | null;
  tokenUsage: number | null;
  costUsd: number | null;
  createdAt: string;
};

export type TestSummary = {
  testId: string;
  runsA: number;
  runsB: number;
  avgScoreA: number;
  avgScoreB: number;
  avgLatencyA: number;
  avgLatencyB: number;
  declaredWinner: "A" | "B" | "none";
};

type TestRow = {
  id: string;
  prompt_id: string;
  version_a_id: string;
  version_b_id: string;
  status: ABTest["status"];
  traffic_split: number;
  winner_version_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

type TestRunRow = {
  id: string;
  test_id: string;
  selected_version: "A" | "B";
  input_payload: Record<string, unknown>;
  output_text: string;
  score: string | null;
  latency_ms: number | null;
  token_usage: number | null;
  cost_usd: string | null;
  created_at: string;
};

function mapTestRow(row: TestRow): ABTest {
  return {
    id: row.id,
    promptId: row.prompt_id,
    versionAId: row.version_a_id,
    versionBId: row.version_b_id,
    status: row.status,
    trafficSplit: row.traffic_split,
    winnerVersionId: row.winner_version_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

function mapTestRunRow(row: TestRunRow): TestRun {
  return {
    id: row.id,
    testId: row.test_id,
    selectedVersion: row.selected_version,
    inputPayload: row.input_payload ?? {},
    outputText: row.output_text,
    score: row.score !== null ? Number(row.score) : null,
    latencyMs: row.latency_ms,
    tokenUsage: row.token_usage,
    costUsd: row.cost_usd !== null ? Number(row.cost_usd) : null,
    createdAt: row.created_at
  };
}

export async function createABTest(input: {
  promptId: string;
  versionAId: string;
  versionBId: string;
  trafficSplit: number;
}): Promise<ABTest> {
  await initDatabase();

  const testId = createId("abt");

  const versionA = await getVersionById(input.versionAId);
  const versionB = await getVersionById(input.versionBId);

  if (!versionA || !versionB) {
    throw new Error("Both version ids must exist before creating an A/B test");
  }

  if (versionA.promptId !== input.promptId || versionB.promptId !== input.promptId) {
    throw new Error("Selected versions do not belong to this prompt");
  }

  const result = await query<TestRow>(
    `
    INSERT INTO ab_tests
      (id, prompt_id, version_a_id, version_b_id, status, traffic_split, started_at)
    VALUES
      ($1, $2, $3, $4, 'running', $5, NOW())
    RETURNING
      id,
      prompt_id,
      version_a_id,
      version_b_id,
      status,
      traffic_split,
      winner_version_id,
      created_at,
      started_at,
      ended_at
    `,
    [testId, input.promptId, input.versionAId, input.versionBId, input.trafficSplit]
  );

  return mapTestRow(result.rows[0]);
}

export async function listTestsForPrompt(promptId: string): Promise<ABTest[]> {
  await initDatabase();

  const result = await query<TestRow>(
    `
    SELECT
      id,
      prompt_id,
      version_a_id,
      version_b_id,
      status,
      traffic_split,
      winner_version_id,
      created_at,
      started_at,
      ended_at
    FROM ab_tests
    WHERE prompt_id = $1
    ORDER BY created_at DESC
    `,
    [promptId]
  );

  return result.rows.map(mapTestRow);
}

export async function getTestById(testId: string): Promise<ABTest | null> {
  await initDatabase();

  const result = await query<TestRow>(
    `
    SELECT
      id,
      prompt_id,
      version_a_id,
      version_b_id,
      status,
      traffic_split,
      winner_version_id,
      created_at,
      started_at,
      ended_at
    FROM ab_tests
    WHERE id = $1
    LIMIT 1
    `,
    [testId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapTestRow(result.rows[0]);
}

function pickVersionLabel(trafficSplit: number): "A" | "B" {
  const roll = Math.random() * 100;
  return roll <= trafficSplit ? "A" : "B";
}

export async function recordRun(input: {
  testId: string;
  selectedVersion?: "A" | "B";
  inputPayload?: Record<string, unknown>;
  outputText: string;
  score?: number | null;
  latencyMs?: number | null;
  tokenUsage?: number | null;
  costUsd?: number | null;
  evaluationNotes?: string;
}): Promise<TestRun> {
  await initDatabase();

  const test = await getTestById(input.testId);

  if (!test) {
    throw new Error("A/B test not found");
  }

  if (test.status !== "running") {
    throw new Error("This A/B test is not currently running");
  }

  const selectedVersion = input.selectedVersion ?? pickVersionLabel(test.trafficSplit);

  const score =
    input.score ??
    computeOutputQualityScore(input.outputText, input.evaluationNotes ?? "");

  const runId = createId("run");

  const runResult = await query<TestRunRow>(
    `
    INSERT INTO test_runs
      (id, test_id, selected_version, input_payload, output_text, score, latency_ms, token_usage, cost_usd)
    VALUES
      ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
    RETURNING
      id,
      test_id,
      selected_version,
      input_payload,
      output_text,
      score::text,
      latency_ms,
      token_usage,
      cost_usd::text,
      created_at
    `,
    [
      runId,
      input.testId,
      selectedVersion,
      JSON.stringify(input.inputPayload ?? {}),
      input.outputText,
      score,
      input.latencyMs ?? null,
      input.tokenUsage ?? null,
      input.costUsd ?? null
    ]
  );

  const versionId = selectedVersion === "A" ? test.versionAId : test.versionBId;

  await recordPerformanceEvent({
    promptId: test.promptId,
    versionId,
    eventType: "test_run",
    score,
    latencyMs: input.latencyMs ?? null,
    tokenUsage: input.tokenUsage ?? null,
    costUsd: input.costUsd ?? null,
    metadata: {
      testId: input.testId,
      selectedVersion,
      runId,
      source: "ab-test"
    }
  });

  return mapTestRunRow(runResult.rows[0]);
}

export async function listRuns(testId: string): Promise<TestRun[]> {
  await initDatabase();

  const result = await query<TestRunRow>(
    `
    SELECT
      id,
      test_id,
      selected_version,
      input_payload,
      output_text,
      score::text,
      latency_ms,
      token_usage,
      cost_usd::text,
      created_at
    FROM test_runs
    WHERE test_id = $1
    ORDER BY created_at DESC
    `,
    [testId]
  );

  return result.rows.map(mapTestRunRow);
}

export async function getTestSummary(testId: string): Promise<TestSummary | null> {
  await initDatabase();

  const test = await getTestById(testId);

  if (!test) {
    return null;
  }

  const result = await query<{
    selected_version: "A" | "B";
    runs: string;
    avg_score: string | null;
    avg_latency: string | null;
  }>(
    `
    SELECT
      selected_version,
      COUNT(*) AS runs,
      AVG(score) AS avg_score,
      AVG(latency_ms) AS avg_latency
    FROM test_runs
    WHERE test_id = $1
    GROUP BY selected_version
    `,
    [testId]
  );

  const bucketA = result.rows.find((row) => row.selected_version === "A");
  const bucketB = result.rows.find((row) => row.selected_version === "B");

  const avgScoreA = bucketA?.avg_score ? Number(Number(bucketA.avg_score).toFixed(2)) : 0;
  const avgScoreB = bucketB?.avg_score ? Number(Number(bucketB.avg_score).toFixed(2)) : 0;
  const runsA = bucketA ? Number(bucketA.runs) : 0;
  const runsB = bucketB ? Number(bucketB.runs) : 0;

  let declaredWinner: "A" | "B" | "none" = "none";

  if (test.winnerVersionId === test.versionAId) {
    declaredWinner = "A";
  } else if (test.winnerVersionId === test.versionBId) {
    declaredWinner = "B";
  } else if (runsA + runsB >= 10) {
    declaredWinner = avgScoreA >= avgScoreB ? "A" : "B";
  }

  return {
    testId,
    runsA,
    runsB,
    avgScoreA,
    avgScoreB,
    avgLatencyA: bucketA?.avg_latency ? Number(Number(bucketA.avg_latency).toFixed(0)) : 0,
    avgLatencyB: bucketB?.avg_latency ? Number(Number(bucketB.avg_latency).toFixed(0)) : 0,
    declaredWinner
  };
}

export async function finalizeTest(input: {
  testId: string;
  winnerLabel: "A" | "B";
}): Promise<ABTest> {
  await initDatabase();

  const test = await getTestById(input.testId);

  if (!test) {
    throw new Error("A/B test not found");
  }

  const winnerVersionId =
    input.winnerLabel === "A" ? test.versionAId : test.versionBId;

  const result = await query<TestRow>(
    `
    UPDATE ab_tests
    SET
      status = 'completed',
      winner_version_id = $2,
      ended_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      prompt_id,
      version_a_id,
      version_b_id,
      status,
      traffic_split,
      winner_version_id,
      created_at,
      started_at,
      ended_at
    `,
    [input.testId, winnerVersionId]
  );

  return mapTestRow(result.rows[0]);
}
