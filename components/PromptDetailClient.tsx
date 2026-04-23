"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PromptEditor, type PromptFormValues } from "@/components/PromptEditor";

type PromptRecord = {
  id: string;
  name: string;
  description: string;
  latestVersionNumber: number | null;
  latestScore: number | null;
  latestLatencyMs: number | null;
  updatedAt: string;
};

type PromptVersion = {
  id: string;
  promptId: string;
  versionNumber: number;
  content: string;
  notes: string;
  model: string;
  temperature: number;
  createdAt: string;
  createdBy: string;
};

type PromptDetailClientProps = {
  promptId: string;
};

export function PromptDetailClient({ promptId }: PromptDetailClientProps) {
  const [prompt, setPrompt] = useState<PromptRecord | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading prompt...");

  const latest = useMemo(() => versions[0] ?? null, [versions]);

  async function load() {
    setLoading(true);
    try {
      const [promptResponse, versionsResponse] = await Promise.all([
        fetch(`/api/prompts?id=${encodeURIComponent(promptId)}`, { cache: "no-store" }),
        fetch(`/api/versions?promptId=${encodeURIComponent(promptId)}`, {
          cache: "no-store"
        })
      ]);

      if (!promptResponse.ok) {
        throw new Error("Could not load prompt");
      }
      if (!versionsResponse.ok) {
        throw new Error("Could not load versions");
      }

      const promptPayload = (await promptResponse.json()) as { prompt: PromptRecord };
      const versionsPayload = (await versionsResponse.json()) as {
        versions: PromptVersion[];
      };

      setPrompt(promptPayload.prompt);
      setVersions(versionsPayload.versions);
      setMessage("Prompt loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load prompt data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [promptId]);

  async function handleCreateVersion(values: PromptFormValues) {
    const response = await fetch("/api/versions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        promptId,
        content: values.content,
        notes: values.notes,
        model: values.model,
        temperature: values.temperature
      })
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Could not create version");
    }

    setMessage(payload.message ?? "Version saved.");
    await load();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {prompt?.name ?? "Prompt repository"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {prompt?.description ?? "Track improvements and release safer prompt updates."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/prompts/${promptId}/versions`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              View Diff Timeline
            </Link>
            <Link
              href={`/prompts/${promptId}/test`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              Run A/B Test
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Current version</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              v{prompt?.latestVersionNumber ?? latest?.versionNumber ?? 1}
            </p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Latest score</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {prompt?.latestScore ?? "No telemetry"}
            </p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Latest latency</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {prompt?.latestLatencyMs ? `${prompt.latestLatencyMs}ms` : "No telemetry"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">{message}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <PromptEditor
          mode="new-version"
          title="Commit a New Version"
          helper="Capture one intentional change, then validate it with A/B runs."
          submitLabel="Save New Version"
          initialValues={{
            content: latest?.content ?? "",
            model: latest?.model ?? "gpt-4.1",
            notes: "",
            temperature: latest?.temperature ?? 0.2
          }}
          onSubmit={handleCreateVersion}
        />

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
          <h2 className="text-lg font-semibold text-white">Latest Prompt Snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use this as your baseline before shipping another iteration.
          </p>
          <div className="mt-4 rounded-md border border-[#30363d] bg-[#0d1117] p-3">
            <p className="mb-2 text-xs text-slate-500">
              v{latest?.versionNumber ?? "-"} • {latest?.model ?? "-"} • temp {latest?.temperature ?? "-"}
            </p>
            <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
              {latest?.content ?? (loading ? "Loading latest version..." : "No version available yet.")}
            </pre>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {versions.slice(0, 4).map((version) => (
              <div
                key={version.id}
                className="rounded border border-[#30363d] bg-[#11161d] p-2 text-xs"
              >
                <span className="font-semibold text-slate-100">v{version.versionNumber}</span>
                <span className="ml-2 text-slate-400">{version.notes || "No notes"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
