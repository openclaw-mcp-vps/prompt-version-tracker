import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deriveTestInsight } from "@/lib/ab-testing";
import { sql } from "@/lib/db";
import { hashPromptContent } from "@/lib/git-operations";

const createPromptSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(500),
  initialContent: z.string().min(20),
  createdBy: z.string().min(2).max(80).default("Prompt Engineer"),
  notes: z.string().min(4).max(240).default("Initial prompt baseline")
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const promptId = request.nextUrl.searchParams.get("id");

  if (!promptId) {
    const prompts = await sql<{
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
    }>(
      `
      SELECT
        p.id,
        p.title,
        p.description,
        p.created_by,
        p.created_at,
        p.updated_at,
        v.version_number AS latest_version,
        v.content AS latest_content,
        COALESCE(t.tests_count, 0)::int AS tests_count,
        COALESCE(t.running_tests, 0)::int AS running_tests
      FROM prompts p
      LEFT JOIN LATERAL (
        SELECT version_number, content
        FROM prompt_versions
        WHERE prompt_id = p.id
        ORDER BY version_number DESC
        LIMIT 1
      ) v ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS tests_count,
          COUNT(*) FILTER (WHERE status = 'running') AS running_tests
        FROM ab_tests
        WHERE prompt_id = p.id
      ) t ON TRUE
      ORDER BY p.updated_at DESC;
      `
    );

    return NextResponse.json({
      prompts: prompts.rows
    });
  }

  const prompt = await sql<{
    id: string;
    title: string;
    description: string;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT *
    FROM prompts
    WHERE id = $1
    LIMIT 1;
    `,
    [promptId]
  );

  if (!prompt.rows[0]) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  const versions = await sql<{
    id: number;
    version_number: number;
    content: string;
    notes: string;
    content_hash: string;
    created_by: string;
    created_at: string;
  }>(
    `
    SELECT
      id,
      version_number,
      content,
      notes,
      content_hash,
      created_by,
      created_at
    FROM prompt_versions
    WHERE prompt_id = $1
    ORDER BY version_number DESC;
    `,
    [promptId]
  );

  const tests = await sql<{
    id: number;
    name: string;
    traffic_split: number;
    status: "running" | "paused" | "completed";
    created_at: string;
    ended_at: string | null;
    version_a_id: number;
    version_b_id: number;
    version_a_number: number;
    version_b_number: number;
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
      t.name,
      t.traffic_split,
      t.status,
      t.created_at,
      t.ended_at,
      t.version_a_id,
      t.version_b_id,
      va.version_number AS version_a_number,
      vb.version_number AS version_b_number,
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
    WHERE t.prompt_id = $1
    ORDER BY t.created_at DESC;
    `,
    [promptId]
  );

  const mappedTests = tests.rows.map((row) => ({
    ...row,
    insight: deriveTestInsight(
      {
        impressions: row.a_impressions,
        conversions: row.a_conversions,
        avgLatencyMs: row.a_latency,
        qualityScore: row.a_quality
      },
      {
        impressions: row.b_impressions,
        conversions: row.b_conversions,
        avgLatencyMs: row.b_latency,
        qualityScore: row.b_quality
      }
    )
  }));

  return NextResponse.json({
    prompt: prompt.rows[0],
    versions: versions.rows,
    tests: mappedTests
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = createPromptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, initialContent, createdBy, notes } = parsed.data;
  const promptId = crypto.randomUUID();

  await sql(
    `
    INSERT INTO prompts (id, title, description, created_by)
    VALUES ($1, $2, $3, $4);
    `,
    [promptId, title, description, createdBy]
  );

  const version = await sql<{
    id: number;
    version_number: number;
    content: string;
    notes: string;
    content_hash: string;
    created_by: string;
    created_at: string;
  }>(
    `
    INSERT INTO prompt_versions (prompt_id, version_number, content, notes, content_hash, created_by)
    VALUES ($1, 1, $2, $3, $4, $5)
    RETURNING id, version_number, content, notes, content_hash, created_by, created_at;
    `,
    [promptId, initialContent, notes, hashPromptContent(initialContent), createdBy]
  );

  return NextResponse.json(
    {
      prompt: {
        id: promptId,
        title,
        description,
        created_by: createdBy
      },
      version: version.rows[0]
    },
    { status: 201 }
  );
}
