"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { TestRunner } from "@/components/TestRunner";

type PromptVersion = {
  id: string;
  versionNumber: number;
  notes: string;
};

type ABTest = {
  id: string;
  promptId: string;
  versionAId: string;
  versionBId: string;
  status: "draft" | "running" | "completed";
  trafficSplit: number;
  winnerVersionId: string | null;
  createdAt: string;
};

type PromptTestClientProps = {
  promptId: string;
};

export function PromptTestClient({ promptId }: PromptTestClientProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [selectedAId, setSelectedAId] = useState("");
  const [selectedBId, setSelectedBId] = useState("");
  const [trafficSplit, setTrafficSplit] = useState("50");
  const [activeTestId, setActiveTestId] = useState("");
  const [message, setMessage] = useState("Loading A/B test workspace...");
  const [creating, setCreating] = useState(false);

  const activeTest = useMemo(
    () => tests.find((test) => test.id === activeTestId) ?? tests[0] ?? null,
    [activeTestId, tests]
  );

  async function load() {
    try {
      const [versionsResponse, testsResponse] = await Promise.all([
        fetch(`/api/versions?promptId=${encodeURIComponent(promptId)}`, {
          cache: "no-store"
        }),
        fetch(`/api/tests?promptId=${encodeURIComponent(promptId)}`, {
          cache: "no-store"
        })
      ]);

      if (!versionsResponse.ok) {
        throw new Error("Could not load versions");
      }
      if (!testsResponse.ok) {
        throw new Error("Could not load tests");
      }

      const versionsPayload = (await versionsResponse.json()) as {
        versions: PromptVersion[];
      };
      const testsPayload = (await testsResponse.json()) as {
        tests: ABTest[];
      };

      setVersions(versionsPayload.versions);
      setTests(testsPayload.tests);

      if (versionsPayload.versions.length >= 2) {
        setSelectedAId((previous) => previous || versionsPayload.versions[0].id);
        setSelectedBId((previous) => previous || versionsPayload.versions[1].id);
      }

      if (testsPayload.tests.length > 0) {
        setActiveTestId((previous) => previous || testsPayload.tests[0].id);
        setMessage("Test workspace loaded.");
      } else {
        setMessage("Create your first experiment to compare versions.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load test workspace");
    }
  }

  useEffect(() => {
    void load();
  }, [promptId]);

  async function createTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAId || !selectedBId) {
      setMessage("Select two versions to compare.");
      return;
    }

    if (selectedAId === selectedBId) {
      setMessage("Select different versions for A and B.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "create",
          promptId,
          versionAId: selectedAId,
          versionBId: selectedBId,
          trafficSplit: Number(trafficSplit)
        })
      });

      const payload = (await response.json()) as {
        test?: ABTest;
        message?: string;
      };

      if (!response.ok || !payload.test) {
        throw new Error(payload.message ?? "Could not create test");
      }

      setMessage(payload.message ?? "Test created and started.");
      setActiveTestId(payload.test.id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create test");
    } finally {
      setCreating(false);
    }
  }

  function formatVersionLabel(versionId: string): string {
    const version = versions.find((item) => item.id === versionId);
    return version ? `v${version.versionNumber}` : versionId;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">A/B Test Lab</h1>
            <p className="mt-1 text-sm text-slate-400">
              Compare prompt versions under controlled traffic and measure quality impact.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={`/prompts/${promptId}`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              Prompt Overview
            </Link>
            <Link
              href={`/prompts/${promptId}/versions`}
              className="rounded border border-[#30363d] bg-[#11161d] px-3 py-1.5 text-slate-200 transition hover:border-[#2f81f7]"
            >
              Version Timeline
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{message}</p>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h2 className="text-lg font-semibold text-white">Create New Experiment</h2>
        <form onSubmit={createTest} className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Version A</span>
            <select
              value={selectedAId}
              onChange={(event) => setSelectedAId(event.target.value)}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} • {version.notes || "No notes"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Version B</span>
            <select
              value={selectedBId}
              onChange={(event) => setSelectedBId(event.target.value)}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber} • {version.notes || "No notes"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Traffic split to A (%)</span>
            <input
              value={trafficSplit}
              onChange={(event) => setTrafficSplit(event.target.value)}
              type="number"
              min="1"
              max="99"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none focus:border-[#2f81f7]"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating || versions.length < 2}
              className="inline-flex w-full items-center justify-center rounded-md bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Start Test"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h2 className="text-lg font-semibold text-white">Active + Completed Tests</h2>
        <div className="mt-3 space-y-2">
          {tests.map((test) => (
            <button
              key={test.id}
              type="button"
              onClick={() => setActiveTestId(test.id)}
              className={`w-full rounded-md border p-3 text-left text-sm transition ${
                activeTest?.id === test.id
                  ? "border-[#2f81f7] bg-[#102040]/30"
                  : "border-[#30363d] bg-[#11161d] hover:border-[#2f81f7]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-100">Test {test.id.slice(0, 12)}</p>
                <span className="rounded border border-[#30363d] px-2 py-0.5 text-xs text-slate-300">
                  {test.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                A: {formatVersionLabel(test.versionAId)} • B: {formatVersionLabel(test.versionBId)} • split {test.trafficSplit}%
              </p>
            </button>
          ))}
          {!tests.length ? (
            <p className="rounded-md border border-dashed border-[#30363d] p-4 text-sm text-slate-500">
              No tests yet. Create one to begin traffic-based prompt evaluation.
            </p>
          ) : null}
        </div>
      </section>

      {activeTest ? (
        <TestRunner
          key={activeTest.id}
          testId={activeTest.id}
          status={activeTest.status}
          versionALabel={formatVersionLabel(activeTest.versionAId)}
          versionBLabel={formatVersionLabel(activeTest.versionBId)}
        />
      ) : null}
    </div>
  );
}
