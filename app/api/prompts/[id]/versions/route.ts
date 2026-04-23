import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";
import { hashPromptContent, nextVersionNumber } from "@/lib/git-operations";

const createVersionSchema = z.object({
  content: z.string().min(20),
  notes: z.string().min(4).max(300),
  createdBy: z.string().min(2).max(80).default("Prompt Engineer")
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;

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
    [id]
  );

  return NextResponse.json({ versions: versions.rows });
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const body = await request.json();
  const parsed = createVersionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const promptExists = await sql<{ id: string }>(
    `
    SELECT id
    FROM prompts
    WHERE id = $1
    LIMIT 1;
    `,
    [id]
  );

  if (!promptExists.rows[0]) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  const latestVersion = await sql<{
    id: number;
    version_number: number;
    content_hash: string;
  }>(
    `
    SELECT id, version_number, content_hash
    FROM prompt_versions
    WHERE prompt_id = $1
    ORDER BY version_number DESC
    LIMIT 1;
    `,
    [id]
  );

  const newest = latestVersion.rows[0];
  const contentHash = hashPromptContent(parsed.data.content);

  if (newest && newest.content_hash === contentHash) {
    return NextResponse.json(
      { error: "No changes detected. Version content hash matches latest commit." },
      { status: 409 }
    );
  }

  const inserted = await sql<{
    id: number;
    prompt_id: string;
    version_number: number;
    content: string;
    notes: string;
    content_hash: string;
    created_by: string;
    created_at: string;
  }>(
    `
    INSERT INTO prompt_versions (prompt_id, version_number, content, notes, content_hash, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, prompt_id, version_number, content, notes, content_hash, created_by, created_at;
    `,
    [
      id,
      nextVersionNumber(newest?.version_number ?? 0),
      parsed.data.content,
      parsed.data.notes,
      contentHash,
      parsed.data.createdBy
    ]
  );

  await sql(
    `
    UPDATE prompts
    SET updated_at = NOW()
    WHERE id = $1;
    `,
    [id]
  );

  return NextResponse.json({ version: inserted.rows[0] }, { status: 201 });
}
