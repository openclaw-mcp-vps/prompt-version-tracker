import { NextResponse } from "next/server";

import {
  getAnalyticsOverview,
  getPromptPerformanceSeries,
  getVersionPerformance
} from "@/lib/analytics";
import { listPrompts } from "@/lib/prompt-versioning";
import { requireApiAccess } from "@/lib/paywall";

export async function GET(request: Request) {
  try {
    await requireApiAccess();

    const url = new URL(request.url);
    const promptId = url.searchParams.get("promptId");

    const [overview, prompts] = await Promise.all([
      getAnalyticsOverview(),
      listPrompts()
    ]);

    if (!promptId) {
      return NextResponse.json({ overview, prompts });
    }

    const [performanceSeries, versionPerformance] = await Promise.all([
      getPromptPerformanceSeries(promptId),
      getVersionPerformance(promptId)
    ]);

    return NextResponse.json({
      overview,
      prompts,
      performanceSeries,
      versionPerformance
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load analytics right now"
      },
      { status: 500 }
    );
  }
}
