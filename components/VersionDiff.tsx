"use client";

import { diffWordsWithSpace } from "diff";

type VersionDiffProps = {
  previousContent: string;
  currentContent: string;
};

export function VersionDiff({ previousContent, currentContent }: VersionDiffProps) {
  const chunks = diffWordsWithSpace(previousContent, currentContent);

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#11161d] p-4">
      <h3 className="text-sm font-semibold text-slate-100">Version Diff</h3>
      <p className="mt-1 text-xs text-slate-500">
        Red text was removed. Green text was added.
      </p>
      <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-xs leading-relaxed text-slate-200">
        {chunks.map((chunk, index) => {
          if (chunk.added) {
            return (
              <span key={`add-${index}`} className="bg-emerald-500/20 text-emerald-200">
                {chunk.value}
              </span>
            );
          }

          if (chunk.removed) {
            return (
              <span
                key={`remove-${index}`}
                className="bg-red-500/20 text-red-200 line-through"
              >
                {chunk.value}
              </span>
            );
          }

          return <span key={`same-${index}`}>{chunk.value}</span>;
        })}
      </pre>
    </div>
  );
}
