import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createABTest,
  finalizeTest,
  getTestSummary,
  listRuns,
  listTestsForPrompt,
  recordRun
} from "@/lib/ab-testing";
import { requireApiAccess } from "@/lib/paywall";

const createTestSchema = z.object({
  action: z.literal("create"),
  promptId: z.string().min(4),
  versionAId: z.string().min(4),
  versionBId: z.string().min(4),
  trafficSplit: z.coerce.number().min(1).max(99).default(50)
});

const runTestSchema = z.object({
  action: z.literal("run"),
  testId: z.string().min(4),
  selectedVersion: z.enum(["A", "B"]).nullable().optional(),
  inputPayload: z.record(z.unknown()).default({}),
  outputText: z.string().min(3),
  score: z.coerce.number().min(0).max(100).nullable().optional(),
  latencyMs: z.coerce.number().min(0).nullable().optional(),
  tokenUsage: z.coerce.number().min(0).nullable().optional(),
  costUsd: z.coerce.number().min(0).nullable().optional(),
  evaluationNotes: z.string().max(320).optional().default("")
});

const finalizeSchema = z.object({
  action: z.literal("finalize"),
  testId: z.string().min(4),
  winner: z.enum(["A", "B"])
});

const postSchema = z.discriminatedUnion("action", [
  createTestSchema,
  runTestSchema,
  finalizeSchema
]);

export async function GET(request: Request) {
  try {
    await requireApiAccess();

    const url = new URL(request.url);
    const promptId = url.searchParams.get("promptId");
    const testId = url.searchParams.get("testId");

    if (!promptId && !testId) {
      return NextResponse.json(
        {
          message: "Either promptId or testId is required"
        },
        { status: 400 }
      );
    }

    if (promptId) {
      const tests = await listTestsForPrompt(promptId);
      return NextResponse.json({ tests });
    }

    const [summary, runs] = await Promise.all([
      getTestSummary(testId ?? ""),
      listRuns(testId ?? "")
    ]);

    return NextResponse.json({ summary, runs });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load tests right now"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireApiAccess();

    const payload = postSchema.parse(await request.json());

    if (payload.action === "create") {
      const test = await createABTest({
        promptId: payload.promptId,
        versionAId: payload.versionAId,
        versionBId: payload.versionBId,
        trafficSplit: payload.trafficSplit
      });

      return NextResponse.json(
        {
          message: "A/B test started.",
          test
        },
        { status: 201 }
      );
    }

    if (payload.action === "run") {
      const run = await recordRun({
        testId: payload.testId,
        selectedVersion: payload.selectedVersion ?? undefined,
        inputPayload: payload.inputPayload,
        outputText: payload.outputText,
        score: payload.score ?? null,
        latencyMs: payload.latencyMs ?? null,
        tokenUsage: payload.tokenUsage ?? null,
        costUsd: payload.costUsd ?? null,
        evaluationNotes: payload.evaluationNotes
      });

      return NextResponse.json(
        {
          message: "Test run recorded.",
          run
        },
        { status: 201 }
      );
    }

    const test = await finalizeTest({
      testId: payload.testId,
      winnerLabel: payload.winner
    });

    return NextResponse.json({
      message: "Test finalized and winner declared.",
      test
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid test payload"
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
            : "Unable to process test request right now"
      },
      { status: 500 }
    );
  }
}
