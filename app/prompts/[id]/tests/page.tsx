"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

import { TestResults } from "@/components/TestResults";
import type { PromptTest, PromptVersion } from "@/lib/models";

type PromptDataResponse = {
  versions: PromptVersion[];
};

type TestsResponse = {
  tests: PromptTest[];
};

export default function PromptTestsPage() {
  const params = useParams<{ id: string }>();
  const promptId = params.id;

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Tone Clarity vs Conversion Intent");
  const [versionAId, setVersionAId] = useState<number | null>(null);
  const [versionBId, setVersionBId] = useState<number | null>(null);
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [creating, setCreating] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const [versionsRes, testsRes] = await Promise.all([
        fetch(`/api/prompts/${promptId}/versions`),
        fetch(`/api/tests?promptId=${promptId}`)
      ]);

      const versionData = (await versionsRes.json()) as PromptDataResponse;
      const testsData = (await testsRes.json()) as TestsResponse;

      if (!versionsRes.ok || !testsRes.ok) {
        setError("Unable to load test lab data.");
        return;
      }

      setVersions(versionData.versions);
      setTests(testsData.tests);

      if (versionData.versions[0]) {
        setVersionAId(versionData.versions[0].id);
      }
      if (versionData.versions[1]) {
        setVersionBId(versionData.versions[1].id);
      }
    } catch {
      setError("Network issue while loading tests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [promptId]);

  const canCreate = useMemo(
    () => Boolean(name.trim() && versionAId && versionBId && versionAId !== versionBId),
    [name, versionAId, versionBId]
  );

  async function createTest(): Promise<void> {
    if (!canCreate || !versionAId || !versionBId) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "create",
          promptId,
          name,
          versionAId,
          versionBId,
          trafficSplit
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to create test.");
        return;
      }

      await load();
    } catch {
      setError("Network issue while creating test.");
    } finally {
      setCreating(false);
    }
  }

  async function pushSampleMetrics(testId: number, variant: "A" | "B"): Promise<void> {
    setError(null);
    const impressions = 80 + Math.floor(Math.random() * 120);
    const conversionRate = variant === "A" ? 0.12 + Math.random() * 0.08 : 0.11 + Math.random() * 0.1;

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "record",
          testId,
          variant,
          impressions,
          conversions: Math.round(impressions * conversionRate),
          avgLatencyMs: 600 + Math.random() * 250,
          qualityScore: 68 + Math.random() * 25
        })
      });

      if (!response.ok) {
        setError("Failed to record test metrics.");
        return;
      }

      await load();
    } catch {
      setError("Network issue while recording metrics.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading test lab...
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-6 py-8 lg:px-10">
      <header className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
          href={`/prompts/${promptId}`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to prompt workspace
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">A/B Test Lab</h1>
        <p className="mt-2 text-sm text-slate-300">
          Launch controlled prompt experiments, record live outcomes, and promote winners with confidence.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <h2 className="text-lg font-semibold text-white">Create New Test</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
            Experiment name
            <input
              className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Version A
            <select
              className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setVersionAId(Number(event.target.value))}
              value={versionAId ?? undefined}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.version_number} · {version.notes}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Version B
            <select
              className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
              onChange={(event) => setVersionBId(Number(event.target.value))}
              value={versionBId ?? undefined}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.version_number} · {version.notes}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
            Traffic split for variant A: {trafficSplit}%
            <input
              className="w-full accent-sky-500"
              max={95}
              min={5}
              onChange={(event) => setTrafficSplit(Number(event.target.value))}
              type="range"
              value={trafficSplit}
            />
          </label>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canCreate || creating}
          onClick={createTest}
          type="button"
        >
          <Plus className="h-4 w-4" /> {creating ? "Creating..." : "Launch test"}
        </button>
      </section>

      <TestResults tests={tests} />

      <section className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <h2 className="text-lg font-semibold text-white">Live Metrics Input</h2>
        <p className="mt-1 text-sm text-slate-400">
          Use these controls to log production outcomes from your evaluator or application telemetry.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tests.map((test) => (
            <article key={test.id} className="rounded-2xl border border-slate-800 bg-[#0f1723] p-4">
              <h3 className="text-sm font-semibold text-white">{test.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                v{test.version_a_number} vs v{test.version_b_number}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-sky-500"
                  onClick={() => void pushSampleMetrics(test.id, "A")}
                  type="button"
                >
                  Add sample data to A
                </button>
                <button
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-sky-500"
                  onClick={() => void pushSampleMetrics(test.id, "B")}
                  type="button"
                >
                  Add sample data to B
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </main>
  );
}
