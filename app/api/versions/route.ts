import { NextResponse } from "next/server";
import { z } from "zod";

import { createPromptVersion, getPromptVersions } from "@/lib/prompt-versioning";
import { requireApiAccess } from "@/lib/paywall";

const createVersionSchema = z.object({
  promptId: z.string().min(4),
  content: z.string().min(10),
  notes: z.string().max(320).default("Updated prompt revision"),
  model: z.string().min(2).default("gpt-4.1"),
  temperature: z.coerce.number().min(0).max(2).default(0.2)
});

export async function GET(request: Request) {
  try {
    await requireApiAccess();

    const url = new URL(request.url);
    const promptId = url.searchParams.get("promptId");

    if (!promptId) {
      return NextResponse.json(
        {
          message: "promptId is required"
        },
        { status: 400 }
      );
    }

    const versions = await getPromptVersions(promptId);

    return NextResponse.json({ versions });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load prompt versions right now"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireApiAccess();
    const payload = createVersionSchema.parse(await request.json());

    const version = await createPromptVersion({
      promptId: payload.promptId,
      content: payload.content,
      notes: payload.notes,
      model: payload.model,
      temperature: payload.temperature,
      createdBy: ownerEmail
    });

    return NextResponse.json(
      {
        message: `Version ${version.versionNumber} saved.`,
        version
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid version payload"
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create prompt version right now"
      },
      { status: 500 }
    );
  }
}
