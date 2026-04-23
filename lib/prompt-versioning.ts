import { createId, initDatabase, query } from "@/lib/database";

export type Prompt = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  latestScore: number | null;
  latestLatencyMs: number | null;
};

export type PromptVersion = {
  id: string;
  promptId: string;
  versionNumber: number;
  content: string;
  notes: string;
  model: string;
  temperature: number;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
};

type PromptRow = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  latest_version_id: string | null;
  latest_version_number: number | null;
  latest_score: string | null;
  latest_latency_ms: number | null;
};

type PromptVersionRow = {
  id: string;
  prompt_id: string;
  version_number: number;
  content: string;
  notes: string;
  model: string;
  temperature: string;
  created_at: string;
  created_by: string;
  metadata: Record<string, unknown>;
};

function mapPromptRow(row: PromptRow): Prompt {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived,
    latestVersionId: row.latest_version_id,
    latestVersionNumber: row.latest_version_number,
    latestScore: row.latest_score ? Number(row.latest_score) : null,
    latestLatencyMs: row.latest_latency_ms
  };
}

function mapVersionRow(row: PromptVersionRow): PromptVersion {
  return {
    id: row.id,
    promptId: row.prompt_id,
    versionNumber: row.version_number,
    content: row.content,
    notes: row.notes,
    model: row.model,
    temperature: Number(row.temperature),
    createdAt: row.created_at,
    createdBy: row.created_by,
    metadata: row.metadata ?? {}
  };
}

export async function listPrompts(): Promise<Prompt[]> {
  await initDatabase();

  const result = await query<PromptRow>(
    `
    SELECT
      p.id,
      p.name,
      p.description,
      p.created_at,
      p.updated_at,
      p.archived,
      pv.id AS latest_version_id,
      pv.version_number AS latest_version_number,
      (
        SELECT pe.score::text
        FROM performance_events pe
        WHERE pe.prompt_id = p.id AND pe.score IS NOT NULL
        ORDER BY pe.created_at DESC
        LIMIT 1
      ) AS latest_score,
      (
        SELECT pe.latency_ms
        FROM performance_events pe
        WHERE pe.prompt_id = p.id AND pe.latency_ms IS NOT NULL
        ORDER BY pe.created_at DESC
        LIMIT 1
      ) AS latest_latency_ms
    FROM prompts p
    LEFT JOIN LATERAL (
      SELECT id, version_number
      FROM prompt_versions
      WHERE prompt_id = p.id
      ORDER BY version_number DESC
      LIMIT 1
    ) pv ON TRUE
    WHERE p.archived = FALSE
    ORDER BY p.updated_at DESC
    `
  );

  return result.rows.map(mapPromptRow);
}

export async function getPromptById(promptId: string): Promise<Prompt | null> {
  await initDatabase();

  const result = await query<PromptRow>(
    `
    SELECT
      p.id,
      p.name,
      p.description,
      p.created_at,
      p.updated_at,
      p.archived,
      pv.id AS latest_version_id,
      pv.version_number AS latest_version_number,
      (
        SELECT pe.score::text
        FROM performance_events pe
        WHERE pe.prompt_id = p.id AND pe.score IS NOT NULL
        ORDER BY pe.created_at DESC
        LIMIT 1
      ) AS latest_score,
      (
        SELECT pe.latency_ms
        FROM performance_events pe
        WHERE pe.prompt_id = p.id AND pe.latency_ms IS NOT NULL
        ORDER BY pe.created_at DESC
        LIMIT 1
      ) AS latest_latency_ms
    FROM prompts p
    LEFT JOIN LATERAL (
      SELECT id, version_number
      FROM prompt_versions
      WHERE prompt_id = p.id
      ORDER BY version_number DESC
      LIMIT 1
    ) pv ON TRUE
    WHERE p.id = $1
    LIMIT 1
    `,
    [promptId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapPromptRow(result.rows[0]);
}

export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  await initDatabase();

  const result = await query<PromptVersionRow>(
    `
    SELECT
      id,
      prompt_id,
      version_number,
      content,
      notes,
      model,
      temperature::text,
      created_at,
      created_by,
      metadata
    FROM prompt_versions
    WHERE prompt_id = $1
    ORDER BY version_number DESC
    `,
    [promptId]
  );

  return result.rows.map(mapVersionRow);
}

export async function createPrompt(input: {
  name: string;
  description: string;
  content: string;
  notes: string;
  model: string;
  temperature: number;
  createdBy?: string;
}): Promise<{ prompt: Prompt; initialVersion: PromptVersion }> {
  await initDatabase();

  const promptId = createId("prm");
  const versionId = createId("ver");

  await query(
    `
    INSERT INTO prompts (id, name, description)
    VALUES ($1, $2, $3)
    `,
    [promptId, input.name, input.description]
  );

  await query(
    `
    INSERT INTO prompt_versions
      (id, prompt_id, version_number, content, notes, model, temperature, created_by)
    VALUES
      ($1, $2, 1, $3, $4, $5, $6, $7)
    `,
    [
      versionId,
      promptId,
      input.content,
      input.notes,
      input.model,
      input.temperature,
      input.createdBy ?? "owner"
    ]
  );

  await query(
    `
    UPDATE prompts
    SET updated_at = NOW()
    WHERE id = $1
    `,
    [promptId]
  );

  const prompt = await getPromptById(promptId);
  const versions = await getPromptVersions(promptId);

  if (!prompt || versions.length === 0) {
    throw new Error("Failed to create prompt");
  }

  return {
    prompt,
    initialVersion: versions[versions.length - 1]
  };
}

export async function createPromptVersion(input: {
  promptId: string;
  content: string;
  notes: string;
  model: string;
  temperature: number;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<PromptVersion> {
  await initDatabase();

  const latestVersionResult = await query<{ version_number: number }>(
    `
    SELECT version_number
    FROM prompt_versions
    WHERE prompt_id = $1
    ORDER BY version_number DESC
    LIMIT 1
    `,
    [input.promptId]
  );

  const nextVersionNumber =
    latestVersionResult.rows[0]?.version_number !== undefined
      ? latestVersionResult.rows[0].version_number + 1
      : 1;

  const versionId = createId("ver");

  const insertResult = await query<PromptVersionRow>(
    `
    INSERT INTO prompt_versions
      (id, prompt_id, version_number, content, notes, model, temperature, created_by, metadata)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    RETURNING
      id,
      prompt_id,
      version_number,
      content,
      notes,
      model,
      temperature::text,
      created_at,
      created_by,
      metadata
    `,
    [
      versionId,
      input.promptId,
      nextVersionNumber,
      input.content,
      input.notes,
      input.model,
      input.temperature,
      input.createdBy ?? "owner",
      JSON.stringify(input.metadata ?? {})
    ]
  );

  await query(
    `
    UPDATE prompts
    SET updated_at = NOW()
    WHERE id = $1
    `,
    [input.promptId]
  );

  return mapVersionRow(insertResult.rows[0]);
}

export async function getVersionById(versionId: string): Promise<PromptVersion | null> {
  await initDatabase();

  const result = await query<PromptVersionRow>(
    `
    SELECT
      id,
      prompt_id,
      version_number,
      content,
      notes,
      model,
      temperature::text,
      created_at,
      created_by,
      metadata
    FROM prompt_versions
    WHERE id = $1
    LIMIT 1
    `,
    [versionId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapVersionRow(result.rows[0]);
}
