import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deriveTestInsight } from "@/lib/ab-testing";
import { sql } from "@/lib/db";

const createTestSchema = z.object({
  mode: z.literal("create"),
  promptId: z.string().uuid(),
  name: z.string().min(4).max(120),
  versionAId: z.number().int().positive(),
  versionBId: z.number().int().positive(),
  trafficSplit: z.number().int().min(5).max(95).default(50)
});

const recordSchema = z.object({
  mode: z.literal("record"),
  testId: z.number().int().positive(),
  variant: z.enum(["A", "B"]),
  impressions: z.number().int().min(0),
  conversions: z.number().int().min(0),
  avgLatencyMs: z.number().min(0),
  qualityScore: z.number().min(0).max(100),
  complete: z.boolean().optional()
});

const testRequestSchema = z.union([createTestSchema, recordSchema]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const promptId = request.nextUrl.searchParams.get("promptId");

  const tests = await sql<{
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
  }>(
    `
    SELECT
      t.id,
      t.prompt_id,
      t.name,
      t.version_a_id,
      t.version_b_id,
      va.version_number AS version_a_number,
      vb.version_number AS version_b_number,
      t.traffic_split,
      t.status,
      t.created_at,
      t.ended_at,
      COALESCE(ra.impressions, 0)::int AS a_impressions,
      COALESCE(ra.conversions, 0)::int AS a_conversions,
      COALESCE(ra.avg_latency_ms, 0)::float AS a_latency,
      COALESCE(ra.quality_score, 0)::float AS a_quality,
      COALESCE(rb.impressions, 0)::int AS b_impressions,
      COALESCE(rb.conversions, 0)::int AS b_conversions,
      COALESCE(rb.avg_latency_ms, 0)::float AS b_latency,
      COALESCE(rb.quality_score, 0)::float AS b_quality
    FROM ab_tests t
    INNER JOIN prompt_versions va ON va.id = t.version_a_id
    INNER JOIN prompt_versions vb ON vb.id = t.version_b_id
    LEFT JOIN ab_test_results ra ON ra.test_id = t.id AND ra.variant = 'A'
    LEFT JOIN ab_test_results rb ON rb.test_id = t.id AND rb.variant = 'B'
    WHERE ($1::text IS NULL OR t.prompt_id = $1)
    ORDER BY t.created_at DESC;
    `,
    [promptId]
  );

  const data = tests.rows.map((test) => ({
    ...test,
    insight: deriveTestInsight(
      {
        impressions: test.a_impressions,
        conversions: test.a_conversions,
        avgLatencyMs: test.a_latency,
        qualityScore: test.a_quality
      },
      {
        impressions: test.b_impressions,
        conversions: test.b_conversions,
        avgLatencyMs: test.b_latency,
        qualityScore: test.b_quality
      }
    )
  }));

  return NextResponse.json({ tests: data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = testRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.mode === "create") {
    const prompt = await sql<{ id: string }>(
      `
      SELECT id
      FROM prompts
      WHERE id = $1
      LIMIT 1;
      `,
      [parsed.data.promptId]
    );

    if (!prompt.rows[0]) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    const versions = await sql<{ id: number }>(
      `
      SELECT id
      FROM prompt_versions
      WHERE prompt_id = $1
        AND id IN ($2, $3);
      `,
      [parsed.data.promptId, parsed.data.versionAId, parsed.data.versionBId]
    );

    if (versions.rows.length < 2) {
      return NextResponse.json({ error: "Both version IDs must belong to the same prompt." }, { status: 400 });
    }

    const inserted = await sql<{
      id: number;
      prompt_id: string;
      name: string;
      version_a_id: number;
      version_b_id: number;
      traffic_split: number;
      status: "running";
      created_at: string;
    }>(
      `
      INSERT INTO ab_tests (prompt_id, name, version_a_id, version_b_id, traffic_split)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, prompt_id, name, version_a_id, version_b_id, traffic_split, status, created_at;
      `,
      [
        parsed.data.promptId,
        parsed.data.name,
        parsed.data.versionAId,
        parsed.data.versionBId,
        parsed.data.trafficSplit
      ]
    );

    await sql(
      `
      INSERT INTO ab_test_results (test_id, variant, impressions, conversions, avg_latency_ms, quality_score)
      VALUES
        ($1, 'A', 0, 0, 0, 0),
        ($1, 'B', 0, 0, 0, 0);
      `,
      [inserted.rows[0].id]
    );

    return NextResponse.json({ test: inserted.rows[0] }, { status: 201 });
  }

  const current = await sql<{
    id: number;
    impressions: number;
    conversions: number;
    avg_latency_ms: number;
    quality_score: number;
  }>(
    `
    SELECT id, impressions, conversions, avg_latency_ms::float, quality_score::float
    FROM ab_test_results
    WHERE test_id = $1
      AND variant = $2
    LIMIT 1;
    `,
    [parsed.data.testId, parsed.data.variant]
  );

  if (!current.rows[0]) {
    return NextResponse.json({ error: "Test result row not found." }, { status: 404 });
  }

  const row = current.rows[0];
  const newImpressions = row.impressions + parsed.data.impressions;
  const latencyWeighted =
    newImpressions === 0
      ? 0
      : (row.avg_latency_ms * row.impressions + parsed.data.avgLatencyMs * parsed.data.impressions) /
        newImpressions;

  const qualityWeighted =
    newImpressions === 0
      ? 0
      : (row.quality_score * row.impressions + parsed.data.qualityScore * parsed.data.impressions) /
        newImpressions;

  const updated = await sql<{
    id: number;
    test_id: number;
    variant: "A" | "B";
    impressions: number;
    conversions: number;
    avg_latency_ms: number;
    quality_score: number;
  }>(
    `
    UPDATE ab_test_results
    SET
      impressions = $1,
      conversions = $2,
      avg_latency_ms = $3,
      quality_score = $4
    WHERE id = $5
    RETURNING id, test_id, variant, impressions, conversions, avg_latency_ms::float, quality_score::float;
    `,
    [
      newImpressions,
      row.conversions + parsed.data.conversions,
      Number(latencyWeighted.toFixed(2)),
      Number(qualityWeighted.toFixed(2)),
      row.id
    ]
  );

  if (parsed.data.complete) {
    await sql(
      `
      UPDATE ab_tests
      SET status = 'completed', ended_at = NOW()
      WHERE id = $1;
      `,
      [parsed.data.testId]
    );
  }

  return NextResponse.json({ result: updated.rows[0] });
}
