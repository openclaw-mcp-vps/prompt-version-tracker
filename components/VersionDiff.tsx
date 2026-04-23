"use client";

import { useMemo } from "react";

import { buildLineDiff } from "@/lib/git-operations";

type VersionDiffProps = {
  previousContent: string;
  nextContent: string;
  previousLabel: string;
  nextLabel: string;
};

export function VersionDiff({
  previousContent,
  nextContent,
  previousLabel,
  nextLabel
}: VersionDiffProps) {
  const diff = useMemo(() => buildLineDiff(previousContent, nextContent), [previousContent, nextContent]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#101926]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
        <h3 className="text-base font-semibold text-white">Version Diff</h3>
        <p className="font-mono text-xs text-slate-400">
          {previousLabel} → {nextLabel}
        </p>
      </header>
      <div className="max-h-[460px] overflow-auto p-4 font-mono text-xs leading-6">
        {diff.map((line, index) => {
          const base = "block rounded px-2";

          if (line.kind === "added") {
            return (
              <code key={`${line.kind}-${index}-${line.content}`} className={`${base} bg-emerald-500/10 text-emerald-300`}>
                + {line.content || " "}
              </code>
            );
          }

          if (line.kind === "removed") {
            return (
              <code key={`${line.kind}-${index}-${line.content}`} className={`${base} bg-rose-500/10 text-rose-300`}>
                - {line.content || " "}
              </code>
            );
          }

          return (
            <code key={`${line.kind}-${index}-${line.content}`} className={`${base} text-slate-400`}>
              {line.content || " "}
            </code>
          );
        })}
      </div>
    </section>
  );
}
