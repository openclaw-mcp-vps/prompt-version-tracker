"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PerformanceChart, type PerformanceChartPoint } from "@/components/PerformanceChart";
import { VersionDiff } from "@/components/VersionDiff";

type PromptRecord = {
  id: string;
  name: string;
  description: string;
};

type PromptVersion = {
  id: string;
  versionNumber: number;
  content: string;
  notes: string;
  model: string;
  temperature: number;
  createdAt: string;
};

type PromptVersionsClientProps = {
  promptId: string;
};

export function PromptVersionsClient({ promptId }: PromptVersionsClientProps) {
  const [prompt, setPrompt] = useState<PromptRecord | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [series, setSeries] = useState<PerformanceChartPoint[]>([]);
  const [selectedCurrentId, setSelectedCurrentId] = useState<string>("");
  const [selectedPreviousId, setSelectedPreviousId] = useState<string>("");
  const [message, setMessage] = useState("Loading version history...");

  async function load() {
    try {
      const [promptResponse, versionsResponse] = await Promise.all([
        fetch(
          `/api/prompts?id=${encodeURIComponent(promptId)}&includePerformance=true`,
          {
            cache: "no-store"
          }
        ),
        fetch(`/api/versions?promptId=${encodeURIComponent(promptId)}`, {
          cache: "no-store"
        })
      ]);

      if (!promptResponse.ok) {
        throw new Error("Could not load prompt analytics");
      }
      if (!versionsResponse.ok) {
        throw new Error("Could not load version history");
      }

      const promptPayload = (await promptResponse.json()) as {
        prompt: PromptRecord;
        performanceSeries: PerformanceChartPoint[];
      };
      const versionsPayload = (await versionsResponse.json()) as {
        versions: PromptVersion[];
      };

      setPrompt(promptPayload.prompt);
      setSeries(promptPayload.performanceSeries ?? []);
      setVersions(versionsPayload.versions);

      const first = versionsPayload.versions[0];
      const second = versionsPayload.versions[1];

      if (first) {
        setSelectedCurrentId(first.id);
      }
      if (second) {
        setSelectedPreviousId(second.id);
      } else if (first) {
        setSelectedPreviousId(first.id);
      }

      setMessage("Version history loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load versions");
    }
  }

  useEffect(() => {
    void load();
  }, [promptId]);

  const currentVersion = useMemo(
    () => versions.find((version) => version.id === selectedCurrentId) ?? versions[0],
    [versions, selectedCurrentId]
  );

  const previousVersion = useMemo(
    () => versions.find((version) => version.id === selectedPreviousId) ?? versions[1] ?? versions[0],
    [versions, selectedPreviousId]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {prompt?.name ?? "Prompt Versions"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {prompt?.description ?? "Inspect prompt diffs and compare performance over time."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={`/prompts/${promptId}`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              Back to Prompt
            </Link>
            <Link
              href={`/prompts/${promptId}/test`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              Open Test Runner
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{message}</p>
      </section>

      <PerformanceChart data={series} />

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h2 className="text-lg font-semibold text-white">Compare Versions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Current revision</span>
            <select
              value={selectedCurrentId}
              onChange={(event) => setSelectedCurrentId(event.target.value)}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} • {new Date(version.createdAt).toLocaleDateString()} • {version.model}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Baseline revision</span>
            <select
              value={selectedPreviousId}
              onChange={(event) => setSelectedPreviousId(event.target.value)}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} • {new Date(version.createdAt).toLocaleDateString()} • {version.model}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Current notes</p>
            <p className="mt-1 text-sm text-slate-200">{currentVersion?.notes || "No notes"}</p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Baseline notes</p>
            <p className="mt-1 text-sm text-slate-200">{previousVersion?.notes || "No notes"}</p>
          </div>
        </div>

        {currentVersion && previousVersion ? (
          <div className="mt-5">
            <VersionDiff
              previousContent={previousVersion.content}
              currentContent={currentVersion.content}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Create more versions to compare changes.</p>
        )}
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h2 className="text-lg font-semibold text-white">Version Log</h2>
        <div className="mt-3 space-y-2">
          {versions.map((version) => (
            <article
              key={version.id}
              className="rounded-md border border-[#30363d] bg-[#11161d] p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">Version {version.versionNumber}</p>
                <p className="text-xs text-slate-500">
                  {new Date(version.createdAt).toLocaleString()} • {version.model} • temp {version.temperature}
                </p>
              </div>
              <p className="mt-1 text-slate-300">{version.notes || "No notes recorded"}</p>
            </article>
          ))}
          {!versions.length ? (
            <p className="rounded-md border border-dashed border-[#30363d] p-4 text-sm text-slate-500">
              No versions yet. Add your first prompt revision from the prompt page.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
