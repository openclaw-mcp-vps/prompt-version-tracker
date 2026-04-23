import crypto from "crypto";

export type DiffLine = {
  kind: "context" | "added" | "removed";
  content: string;
};

export function hashPromptContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function buildLineDiff(previous: string, next: string): DiffLine[] {
  const prevLines = previous.split("\n");
  const nextLines = next.split("\n");
  const max = Math.max(prevLines.length, nextLines.length);
  const diff: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const prev = prevLines[i];
    const curr = nextLines[i];

    if (prev === curr && prev !== undefined) {
      diff.push({ kind: "context", content: prev });
      continue;
    }

    if (prev !== undefined) {
      diff.push({ kind: "removed", content: prev });
    }

    if (curr !== undefined) {
      diff.push({ kind: "added", content: curr });
    }
  }

  return diff;
}

export function unifiedDiff(previous: string, next: string, from = "v-old", to = "v-new"): string {
  const header = [`--- ${from}`, `+++ ${to}`, "@@ -1 +1 @@"];
  const body = buildLineDiff(previous, next).map((line) => {
    if (line.kind === "added") return `+${line.content}`;
    if (line.kind === "removed") return `-${line.content}`;
    return ` ${line.content}`;
  });

  return [...header, ...body].join("\n");
}

export function nextVersionNumber(existingCount: number): number {
  return existingCount + 1;
}
