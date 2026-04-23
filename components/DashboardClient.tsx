"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PromptEditor, type PromptFormValues } from "@/components/PromptEditor";

type PromptSummary = {
  id: string;
  name: string;
  description: string;
  latestVersionNumber: number | null;
  latestScore: number | null;
  latestLatencyMs: number | null;
  updatedAt: string;
};

export function DashboardClient() {
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Create your first prompt to start version tracking.");

  async function loadPrompts() {
    setLoading(true);
    try {
      const response = await fetch("/api/prompts", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load prompt repository");
      }
      const payload = (await response.json()) as { prompts: PromptSummary[] };
      setPrompts(payload.prompts);
      if (payload.prompts.length > 0) {
        setMessage("Prompt repository is up to date.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load prompts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrompts();
  }, []);

  const totals = useMemo(() => {
    const tracked = prompts.filter((prompt) => prompt.latestScore !== null).length;
    const avgScore =
      tracked > 0
        ? Number(
            (
              prompts.reduce((acc, prompt) => acc + (prompt.latestScore ?? 0), 0) / tracked
            ).toFixed(2)
          )
        : 0;

    return {
      totalPrompts: prompts.length,
      promptsWithTelemetry: tracked,
      avgScore
    };
  }, [prompts]);

  async function handleCreatePrompt(values: PromptFormValues) {
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Could not create prompt");
    }

    setMessage(payload.message ?? "Prompt created.");
    await loadPrompts();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Total prompts</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.totalPrompts}</p>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Prompts with telemetry</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.promptsWithTelemetry}</p>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Average latest score</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totals.avgScore}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <PromptEditor
          mode="create-prompt"
          title="Create Prompt Repository"
          helper="Seed a prompt with version 1 and start tracking every edit."
          submitLabel="Create Prompt"
          onSubmit={handleCreatePrompt}
        />

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tracked Prompts</h2>
            <button
              type="button"
              onClick={() => void loadPrompts()}
              disabled={loading}
              className="rounded-md border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-[#2f81f7] disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
          <p className="mb-3 text-xs text-slate-400">{message}</p>
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <article
                key={prompt.id}
                className="rounded-md border border-[#30363d] bg-[#11161d] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-slate-100">{prompt.name}</h3>
                  <span className="rounded bg-[#2f81f7]/20 px-2 py-0.5 text-xs text-blue-200">
                    v{prompt.latestVersionNumber ?? 1}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{prompt.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>
                    score: {prompt.latestScore !== null ? prompt.latestScore : "not enough data"}
                  </span>
                  <span>latency: {prompt.latestLatencyMs ?? "-"}ms</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-blue-200">
                  <Link href={`/prompts/${prompt.id}`}>View prompt</Link>
                  <Link href={`/prompts/${prompt.id}/versions`}>Versions</Link>
                  <Link href={`/prompts/${prompt.id}/test`}>A/B test</Link>
                </div>
              </article>
            ))}
            {!prompts.length ? (
              <div className="rounded-md border border-dashed border-[#30363d] p-4 text-sm text-slate-500">
                No prompts yet. Create one to start tracking improvements.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
