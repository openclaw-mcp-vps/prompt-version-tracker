"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, GitCompareArrows, FlaskConical } from "lucide-react";

import { PromptEditor } from "@/components/PromptEditor";
import { TestResults } from "@/components/TestResults";
import type { PromptDetail, PromptTest, PromptVersion } from "@/lib/models";

type PromptDetailResponse = {
  prompt: PromptDetail;
  versions: PromptVersion[];
  tests: PromptTest[];
};

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>();
  const promptId = params.id;

  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [tests, setTests] = useState<PromptTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPrompt(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompts?id=${promptId}`);
      const data = (await response.json()) as PromptDetailResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to load prompt data.");
        return;
      }

      setPrompt(data.prompt);
      setVersions(data.versions);
      setTests(data.tests);
    } catch {
      setError("Network issue while loading prompt workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrompt();
  }, [promptId]);

  const latestVersion = useMemo(() => versions[0], [versions]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 text-slate-300">
        Loading prompt workspace...
      </main>
    );
  }

  if (error || !prompt || !latestVersion) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error ?? "Prompt not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-6 py-8 lg:px-10">
      <header className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-white">{prompt.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{prompt.description}</p>
          </div>
          <div className="flex gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              href={`/prompts/${promptId}/versions`}
            >
              <GitCompareArrows className="h-4 w-4" /> Version diffs
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
              href={`/prompts/${promptId}/tests`}
            >
              <FlaskConical className="h-4 w-4" /> Test lab
            </Link>
          </div>
        </div>
      </header>

      <PromptEditor
        currentVersion={latestVersion.version_number}
        initialContent={latestVersion.content}
        onVersionCreated={(version) => {
          setVersions((current) => [version, ...current]);
        }}
        promptId={promptId}
      />

      <TestResults tests={tests} />
    </main>
  );
}
