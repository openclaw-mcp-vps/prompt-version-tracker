"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity, GitCommitHorizontal, Loader2, Rocket, TestTubeDiagonal } from "lucide-react";

import type { PromptSummary, PromptTest } from "@/lib/models";

type PromptResponse = {
  prompts: PromptSummary[];
};

type TestsResponse = {
  tests: PromptTest[];
};

export function AnalyticsDashboard() {
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("Customer Support Escalation Prompt");
  const [description, setDescription] = useState(
    "Classifies support conversations into billing, technical issue, account security, and human escalation pathways with strict JSON output formatting."
  );
  const [initialContent, setInitialContent] = useState(
    "You are an expert support routing assistant. Analyze the user message and return strict JSON with fields: category, urgency, escalation_required, rationale, and next_action. Ensure category is one of billing|technical|security|general."
  );
  const [creating, setCreating] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [promptRes, testsRes] = await Promise.all([fetch("/api/prompts"), fetch("/api/tests")]);
      const promptJson = (await promptRes.json()) as PromptResponse;
      const testsJson = (await testsRes.json()) as TestsResponse;

      if (!promptRes.ok) {
        setError("Failed to load prompts.");
        return;
      }

      if (!testsRes.ok) {
        setError("Failed to load test analytics.");
        return;
      }

      setPrompts(promptJson.prompts);
      setTests(testsJson.tests);
    } catch {
      setError("Network issue while loading dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPrompt(): Promise<void> {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          initialContent,
          createdBy: "Prompt Engineer",
          notes: "Initial production baseline"
        })
      });

      const data = (await response.json()) as { error?: string; prompt?: { id: string } };

      if (!response.ok || !data.prompt) {
        setError(data.error ?? "Could not create prompt workspace.");
        return;
      }

      window.location.href = `/prompts/${data.prompt.id}`;
    } catch {
      setError("Network issue while creating prompt.");
    } finally {
      setCreating(false);
    }
  }

  const summary = useMemo(() => {
    const activeTests = tests.filter((test) => test.status === "running").length;
    const avgConfidence =
      tests.length === 0
        ? 0
        : (tests.reduce((acc, test) => acc + test.insight.confidence, 0) / tests.length) * 100;
    const avgLift =
      tests.length === 0
        ? 0
        : tests.reduce((acc, test) => {
            const base = Math.max(test.insight.conversionRateA, 0.001);
            const variant = Math.max(test.insight.conversionRateB, 0.001);
            return acc + ((variant - base) / base) * 100;
          }, 0) / tests.length;

    return {
      prompts: prompts.length,
      activeTests,
      avgConfidence,
      avgLift
    };
  }, [prompts, tests]);

  const trendData = useMemo(
    () =>
      tests
        .slice()
        .reverse()
        .map((test) => ({
          name: test.name,
          crA: test.insight.conversionRateA,
          crB: test.insight.conversionRateB,
          confidence: Number((test.insight.confidence * 100).toFixed(1))
        })),
    [tests]
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading prompt analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Rocket className="h-5 w-5" />} label="Tracked prompts" value={String(summary.prompts)} />
        <StatCard icon={<TestTubeDiagonal className="h-5 w-5" />} label="Running tests" value={String(summary.activeTests)} />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Avg confidence"
          value={`${summary.avgConfidence.toFixed(1)}%`}
        />
        <StatCard
          icon={<GitCommitHorizontal className="h-5 w-5" />}
          label="Avg conversion lift"
          value={`${summary.avgLift.toFixed(1)}%`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
          <h2 className="text-lg font-semibold text-white">Experiment Trend</h2>
          <p className="mt-1 text-sm text-slate-400">
            Compare conversion movement across prompt variants and confidence progression.
          </p>
          <div className="mt-5 h-72 w-full rounded-2xl border border-slate-800 bg-[#0f1723] p-3">
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1320",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    color: "#e2e8f0"
                  }}
                />
                <Line dataKey="crA" name="A conversion %" stroke="#38bdf8" strokeWidth={2} />
                <Line dataKey="crB" name="B conversion %" stroke="#0ea5e9" strokeWidth={2} />
                <Line dataKey="confidence" name="Confidence %" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="space-y-3 rounded-3xl border border-slate-800 bg-[#101926] p-6">
          <h2 className="text-lg font-semibold text-white">Create Prompt Workspace</h2>
          <p className="text-sm text-slate-400">
            Start a new prompt repo with a production baseline and commit history from day one.
          </p>
          <label className="space-y-1 text-xs text-slate-300">
            Prompt name
            <input
              className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            Use case
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-300">
            Initial prompt
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-700 bg-[#0b1320] px-3 py-2 font-mono text-xs text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setInitialContent(event.target.value)}
              value={initialContent}
            />
          </label>
          <button
            className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={creating}
            onClick={createPrompt}
            type="button"
          >
            {creating ? "Creating..." : "Create prompt workspace"}
          </button>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prompt Repositories</h2>
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:border-slate-500"
            onClick={() => void load()}
            type="button"
          >
            Refresh
          </button>
        </div>
        {prompts.length === 0 ? (
          <p className="text-sm text-slate-300">No prompts yet. Create your first workspace above.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {prompts.map((prompt) => (
              <Link
                key={prompt.id}
                className="rounded-2xl border border-slate-800 bg-[#0f1723] p-4 transition hover:border-sky-500/50"
                href={`/prompts/${prompt.id}`}
              >
                <h3 className="text-base font-semibold text-white">{prompt.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-300">{prompt.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-2 py-1">
                    v{prompt.latest_version ?? 0}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2 py-1">
                    {prompt.tests_count} tests
                  </span>
                  <span className="rounded-full border border-slate-700 px-2 py-1">
                    {prompt.running_tests} running
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-[#101926] p-4">
      <div className="inline-flex rounded-lg border border-slate-700 bg-[#0f1723] p-2 text-sky-300">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}
