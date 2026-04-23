"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { VersionDiff } from "@/components/VersionDiff";
import type { PromptVersion } from "@/lib/models";

type VersionResponse = {
  versions: PromptVersion[];
};

export default function PromptVersionsPage() {
  const params = useParams<{ id: string }>();
  const promptId = params.id;

  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadVersions(): Promise<void> {
    setError(null);

    try {
      const response = await fetch(`/api/prompts/${promptId}/versions`);
      const data = (await response.json()) as VersionResponse;

      if (!response.ok) {
        setError("Unable to load prompt versions.");
        return;
      }

      setVersions(data.versions);
      if (data.versions[0]) {
        setCompareVersion(data.versions[0].id);
      }
      if (data.versions[1]) {
        setBaseVersion(data.versions[1].id);
      }
    } catch {
      setError("Network issue while loading versions.");
    }
  }

  useEffect(() => {
    void loadVersions();
  }, [promptId]);

  const selectedBase = useMemo(
    () => versions.find((version) => version.id === baseVersion) ?? null,
    [versions, baseVersion]
  );
  const selectedCompare = useMemo(
    () => versions.find((version) => version.id === compareVersion) ?? null,
    [versions, compareVersion]
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-6 py-8 lg:px-10">
      <header className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
          href={`/prompts/${promptId}`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to prompt workspace
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-white">Version History</h1>
        <p className="mt-2 text-sm text-slate-300">
          Inspect commit notes, compare changes, and review how each prompt version evolved.
        </p>
      </header>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="grid gap-4 rounded-3xl border border-slate-800 bg-[#101926] p-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          Base version
          <select
            className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
            onChange={(event) => setBaseVersion(Number(event.target.value))}
            value={baseVersion ?? undefined}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                v{version.version_number} · {version.notes}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Compare against
          <select
            className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
            onChange={(event) => setCompareVersion(Number(event.target.value))}
            value={compareVersion ?? undefined}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                v{version.version_number} · {version.notes}
              </option>
            ))}
          </select>
        </label>
      </section>

      {selectedBase && selectedCompare ? (
        <VersionDiff
          nextContent={selectedCompare.content}
          nextLabel={`v${selectedCompare.version_number}`}
          previousContent={selectedBase.content}
          previousLabel={`v${selectedBase.version_number}`}
        />
      ) : (
        <p className="rounded-2xl border border-slate-800 bg-[#101926] p-4 text-sm text-slate-300">
          Create at least two versions to compare prompt changes.
        </p>
      )}

      <section className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <h2 className="text-lg font-semibold text-white">Commit Log</h2>
        <div className="mt-4 space-y-3">
          {versions.map((version) => (
            <article key={version.id} className="rounded-2xl border border-slate-800 bg-[#0f1723] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono text-sm text-sky-300">v{version.version_number}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(version.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-200">{version.notes}</p>
              <p className="mt-2 text-xs text-slate-400">Author: {version.created_by}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
