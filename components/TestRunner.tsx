"use client";

import { useEffect, useMemo, useState } from "react";

type TestRun = {
  id: string;
  selectedVersion: "A" | "B";
  score: number | null;
  latencyMs: number | null;
  tokenUsage: number | null;
  costUsd: number | null;
  outputText: string;
  createdAt: string;
};

type TestSummary = {
  runsA: number;
  runsB: number;
  avgScoreA: number;
  avgScoreB: number;
  avgLatencyA: number;
  avgLatencyB: number;
  declaredWinner: "A" | "B" | "none";
};

type TestRunnerProps = {
  testId: string;
  status: "draft" | "running" | "completed";
  versionALabel: string;
  versionBLabel: string;
};

type TestPayload = {
  summary: TestSummary | null;
  runs: TestRun[];
};

export function TestRunner({
  testId,
  status,
  versionALabel,
  versionBLabel
}: TestRunnerProps) {
  const [data, setData] = useState<TestPayload>({ summary: null, runs: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Run experiments and compare performance.");

  const [inputPayload, setInputPayload] = useState('{"user_query":""}');
  const [outputText, setOutputText] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<"auto" | "A" | "B">("auto");
  const [score, setScore] = useState("");
  const [latencyMs, setLatencyMs] = useState("");
  const [tokenUsage, setTokenUsage] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [evaluationNotes, setEvaluationNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tests?testId=${encodeURIComponent(testId)}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load test data");
      }

      const payload = (await response.json()) as TestPayload;
      setData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load test data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [testId]);

  const winnerLabel = useMemo(() => {
    if (!data.summary || data.summary.declaredWinner === "none") {
      return "No winner yet";
    }
    return data.summary.declaredWinner === "A" ? versionALabel : versionBLabel;
  }, [data.summary, versionALabel, versionBLabel]);

  async function handleRecordRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(inputPayload) as Record<string, unknown>;
    } catch {
      setMessage("Input payload must be valid JSON.");
      return;
    }

    if (!outputText.trim()) {
      setMessage("Output text is required.");
      return;
    }

    setSaving(true);
    setMessage("Recording run...");

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "run",
          testId,
          selectedVersion: selectedVersion === "auto" ? null : selectedVersion,
          inputPayload: parsedPayload,
          outputText,
          score: score ? Number(score) : null,
          latencyMs: latencyMs ? Number(latencyMs) : null,
          tokenUsage: tokenUsage ? Number(tokenUsage) : null,
          costUsd: costUsd ? Number(costUsd) : null,
          evaluationNotes
        })
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Run submission failed");
      }

      setMessage(payload.message ?? "Run recorded.");
      setOutputText("");
      setScore("");
      setLatencyMs("");
      setTokenUsage("");
      setCostUsd("");
      setEvaluationNotes("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run submission failed");
    } finally {
      setSaving(false);
    }
  }

  async function finalize(winner: "A" | "B") {
    setSaving(true);
    setMessage("Finalizing test...");

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "finalize",
          testId,
          winner
        })
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not finalize test");
      }

      setMessage(payload.message ?? "Test finalized.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not finalize test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">A/B Test Runner</h3>
          <span className="rounded border border-[#30363d] bg-[#11161d] px-2 py-1 text-xs text-slate-300">
            Status: {status}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Version A runs</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{data.summary?.runsA ?? 0}</p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Version B runs</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">{data.summary?.runsB ?? 0}</p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Avg score (A/B)</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              {data.summary?.avgScoreA ?? 0} / {data.summary?.avgScoreB ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-[#30363d] bg-[#11161d] p-3">
            <p className="text-xs text-slate-500">Current winner</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{winnerLabel}</p>
          </div>
        </div>

        <form onSubmit={handleRecordRun} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Input payload (JSON)</span>
              <textarea
                value={inputPayload}
                onChange={(event) => setInputPayload(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Observed model output</span>
              <textarea
                value={outputText}
                onChange={(event) => setOutputText(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Version bucket</span>
              <select
                value={selectedVersion}
                onChange={(event) =>
                  setSelectedVersion(event.target.value as "auto" | "A" | "B")
                }
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              >
                <option value="auto">Auto split</option>
                <option value="A">A ({versionALabel})</option>
                <option value="B">B ({versionBLabel})</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Score (0-100)</span>
              <input
                value={score}
                onChange={(event) => setScore(event.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Latency (ms)</span>
              <input
                value={latencyMs}
                onChange={(event) => setLatencyMs(event.target.value)}
                type="number"
                min="0"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Token usage</span>
              <input
                value={tokenUsage}
                onChange={(event) => setTokenUsage(event.target.value)}
                type="number"
                min="0"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Cost (USD)</span>
              <input
                value={costUsd}
                onChange={(event) => setCostUsd(event.target.value)}
                type="number"
                min="0"
                step="0.0001"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-300">Evaluation notes</span>
              <input
                value={evaluationNotes}
                onChange={(event) => setEvaluationNotes(event.target.value)}
                type="text"
                placeholder="must mention refund policy"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || loading || status === "completed"}
              className="inline-flex rounded-md bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Record Run"}
            </button>

            <button
              type="button"
              disabled={saving || status === "completed"}
              onClick={() => void finalize("A")}
              className="inline-flex rounded-md border border-[#30363d] bg-[#11161d] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#2f81f7] disabled:opacity-50"
            >
              Finalize: {versionALabel}
            </button>

            <button
              type="button"
              disabled={saving || status === "completed"}
              onClick={() => void finalize("B")}
              className="inline-flex rounded-md border border-[#30363d] bg-[#11161d] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#2f81f7] disabled:opacity-50"
            >
              Finalize: {versionBLabel}
            </button>

            <p className="text-xs text-slate-400">{message}</p>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h4 className="text-sm font-semibold text-slate-100">Recent test runs</h4>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#30363d] text-slate-400">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Bucket</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Latency</th>
                <th className="px-2 py-2">Tokens</th>
                <th className="px-2 py-2">Cost</th>
                <th className="px-2 py-2">Output</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.slice(0, 25).map((run) => (
                <tr key={run.id} className="border-b border-[#30363d]/60 text-slate-200">
                  <td className="px-2 py-2 text-slate-400">
                    {new Date(run.createdAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-2">{run.selectedVersion}</td>
                  <td className="px-2 py-2">{run.score ?? "-"}</td>
                  <td className="px-2 py-2">{run.latencyMs ?? "-"}</td>
                  <td className="px-2 py-2">{run.tokenUsage ?? "-"}</td>
                  <td className="px-2 py-2">
                    {run.costUsd !== null ? `$${run.costUsd.toFixed(4)}` : "-"}
                  </td>
                  <td className="max-w-sm truncate px-2 py-2 text-slate-300">{run.outputText}</td>
                </tr>
              ))}
              {!data.runs.length ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                    No runs logged yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
