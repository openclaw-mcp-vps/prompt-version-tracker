import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPromptById,
  listPrompts,
  createPrompt,
  getPromptVersions
} from "@/lib/prompt-versioning";
import { getPromptPerformanceSeries, getVersionPerformance } from "@/lib/analytics";
import { requireApiAccess } from "@/lib/paywall";

const createPromptSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(6).max(280),
  content: z.string().min(10),
  notes: z.string().max(320).default("Initial version"),
  model: z.string().min(2).default("gpt-4.1"),
  temperature: z.coerce.number().min(0).max(2).default(0.2)
});

export async function GET(request: Request) {
  try {
    await requireApiAccess();

    const url = new URL(request.url);
    const promptId = url.searchParams.get("id");
    const includePerformance =
      url.searchParams.get("includePerformance") === "true";

    if (promptId) {
      const prompt = await getPromptById(promptId);

      if (!prompt) {
        return NextResponse.json({ message: "Prompt not found" }, { status: 404 });
      }

      if (includePerformance) {
        const [performanceSeries, versionPerformance] = await Promise.all([
          getPromptPerformanceSeries(promptId),
          getVersionPerformance(promptId)
        ]);

        return NextResponse.json({
          prompt,
          performanceSeries,
          versionPerformance
        });
      }

      const versions = await getPromptVersions(promptId);

      return NextResponse.json({ prompt, versions });
    }

    const prompts = await listPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load prompts right now"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireApiAccess();
    const payload = createPromptSchema.parse(await request.json());

    const result = await createPrompt({
      name: payload.name,
      description: payload.description,
      content: payload.content,
      notes: payload.notes,
      model: payload.model,
      temperature: payload.temperature,
      createdBy: ownerEmail
    });

    return NextResponse.json(
      {
        message: `Prompt ${result.prompt.name} created with version 1.`,
        prompt: result.prompt,
        version: result.initialVersion
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid prompt payload"
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
          error instanceof Error ? error.message : "Unable to create prompt right now"
      },
      { status: 500 }
    );
  }
}
