"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PerformanceChart, type PerformanceChartPoint } from "@/components/PerformanceChart";

type Overview = {
  totalPrompts: number;
  totalVersions: number;
  totalTests: number;
  totalRuns: number;
  avgScore: number;
  avgLatencyMs: number;
  monthlyCostUsd: number;
};

type PromptSummary = {
  id: string;
  name: string;
  description: string;
  latestVersionNumber: number | null;
};

type VersionPerformance = {
  versionId: string;
  versionNumber: number;
  avgScore: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  runs: number;
};

export function AnalyticsClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [series, setSeries] = useState<PerformanceChartPoint[]>([]);
  const [versionPerformance, setVersionPerformance] = useState<VersionPerformance[]>([]);
  const [message, setMessage] = useState("Loading analytics...");

  async function loadOverview() {
    try {
      const response = await fetch("/api/analytics", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load analytics overview");
      }

      const payload = (await response.json()) as {
        overview: Overview;
        prompts: PromptSummary[];
      };

      setOverview(payload.overview);
      setPrompts(payload.prompts);

      const defaultPromptId = payload.prompts[0]?.id ?? "";
      if (defaultPromptId) {
        setSelectedPromptId(defaultPromptId);
      }

      setMessage("Analytics loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load analytics");
    }
  }

  async function loadPromptDetails(promptId: string) {
    if (!promptId) {
      setSeries([]);
      setVersionPerformance([]);
      return;
    }

    try {
      const response = await fetch(`/api/analytics?promptId=${encodeURIComponent(promptId)}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Could not load prompt analytics");
      }

      const payload = (await response.json()) as {
        performanceSeries: PerformanceChartPoint[];
        versionPerformance: VersionPerformance[];
      };

      setSeries(payload.performanceSeries ?? []);
      setVersionPerformance(payload.versionPerformance ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load prompt analytics");
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    void loadPromptDetails(selectedPromptId);
  }, [selectedPromptId]);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track prompt quality, latency, and spend trends across your experiments.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-xs text-slate-200 transition hover:border-[#2f81f7]"
          >
            Back to Dashboard
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">{message}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Prompts</p>
          <p className="mt-1 text-2xl font-semibold text-white">{overview?.totalPrompts ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Versions</p>
          <p className="mt-1 text-2xl font-semibold text-white">{overview?.totalVersions ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">Average score</p>
          <p className="mt-1 text-2xl font-semibold text-white">{overview?.avgScore ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs text-slate-500">30d cost (USD)</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            ${(overview?.monthlyCostUsd ?? 0).toFixed(4)}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Focus prompt</span>
          <select
            value={selectedPromptId}
            onChange={(event) => setSelectedPromptId(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
          >
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name} (latest v{prompt.latestVersionNumber ?? 1})
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-500">
          {selectedPrompt?.description ?? "Select a prompt to inspect its performance trend."}
        </p>
      </section>

      <PerformanceChart data={series} />

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h2 className="text-lg font-semibold text-white">Version Breakdown</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#30363d] text-slate-500">
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2">Runs</th>
                <th className="px-2 py-2">Avg score</th>
                <th className="px-2 py-2">Avg latency</th>
                <th className="px-2 py-2">Avg cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {versionPerformance.map((row) => (
                <tr key={row.versionId} className="border-b border-[#30363d]/60 text-slate-200">
                  <td className="px-2 py-2">v{row.versionNumber}</td>
                  <td className="px-2 py-2">{row.runs}</td>
                  <td className="px-2 py-2">{row.avgScore}</td>
                  <td className="px-2 py-2">{row.avgLatencyMs}ms</td>
                  <td className="px-2 py-2">${row.avgCostUsd.toFixed(4)}</td>
                </tr>
              ))}
              {!versionPerformance.length ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                    No version telemetry yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
