"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { CheckCircle2, Loader2, Save, Users2 } from "lucide-react";

import type { PromptVersion } from "@/lib/models";

type Collaborator = {
  id: string;
  label: string;
  lastSeen: number;
};

type CollaborationState = {
  collaborators: Record<string, Collaborator>;
  touch: (entry: Collaborator) => void;
  prune: (ttlMs: number) => void;
};

const useCollaborationStore = create<CollaborationState>((set) => ({
  collaborators: {},
  touch: (entry) =>
    set((state) => ({
      collaborators: {
        ...state.collaborators,
        [entry.id]: entry
      }
    })),
  prune: (ttlMs) =>
    set((state) => {
      const now = Date.now();
      const next: Record<string, Collaborator> = {};

      Object.entries(state.collaborators).forEach(([id, collaborator]) => {
        if (now - collaborator.lastSeen <= ttlMs) {
          next[id] = collaborator;
        }
      });

      return { collaborators: next };
    })
}));

function sessionIdentity(): { id: string; label: string } {
  if (typeof window === "undefined") {
    return { id: "server", label: "server" };
  }

  const key = "pvt-collab-identity";
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return JSON.parse(existing) as { id: string; label: string };
  }

  const id = crypto.randomUUID();
  const labels = ["Atlas", "Nova", "Rivet", "Echo", "Comet", "Arc"]; 
  const label = `${labels[Math.floor(Math.random() * labels.length)]}-${id.slice(0, 4)}`;
  const next = { id, label };
  window.sessionStorage.setItem(key, JSON.stringify(next));

  return next;
}

type PromptEditorProps = {
  promptId: string;
  initialContent: string;
  currentVersion: number;
  onVersionCreated: (version: PromptVersion) => void;
};

export function PromptEditor({
  promptId,
  initialContent,
  currentVersion,
  onVersionCreated
}: PromptEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [notes, setNotes] = useState("Refined for stronger tool-use and safety constraints");
  const [createdBy, setCreatedBy] = useState("Prompt Engineer");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ id: string; label: string } | null>(null);
  const [remoteDraft, setRemoteDraft] = useState<string | null>(null);
  const [remoteLabel, setRemoteLabel] = useState<string | null>(null);

  const { collaborators, touch, prune } = useCollaborationStore();

  useEffect(() => {
    setContent(initialContent);
    setLastSavedContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const me = sessionIdentity();
    setIdentity(me);

    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    const channel = new BroadcastChannel(`prompt-collab-${promptId}`);
    const ping = (): void => {
      const payload = {
        type: "presence",
        id: me.id,
        label: me.label,
        ts: Date.now()
      };
      channel.postMessage(payload);
      touch({ id: me.id, label: me.label, lastSeen: payload.ts });
    };

    channel.onmessage = (event: MessageEvent) => {
      const payload = event.data as {
        type: "presence" | "draft";
        id: string;
        label: string;
        ts: number;
        content?: string;
      };

      if (payload.id === me.id) {
        return;
      }

      if (payload.type === "presence") {
        touch({
          id: payload.id,
          label: payload.label,
          lastSeen: payload.ts
        });
      }

      if (payload.type === "draft" && typeof payload.content === "string") {
        touch({
          id: payload.id,
          label: payload.label,
          lastSeen: payload.ts
        });
        setRemoteDraft(payload.content);
        setRemoteLabel(payload.label);
      }
    };

    ping();
    const intervalId = window.setInterval(() => {
      ping();
      prune(12_000);
    }, 4_000);

    return () => {
      window.clearInterval(intervalId);
      channel.close();
    };
  }, [promptId, prune, touch]);

  const activeCollaborators = useMemo(() => {
    const now = Date.now();

    return Object.values(collaborators)
      .filter((entry) => now - entry.lastSeen <= 12_000)
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }, [collaborators]);

  async function saveVersion(): Promise<void> {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/prompts/${promptId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content,
          notes,
          createdBy
        })
      });

      const data = (await response.json()) as { error?: string; version?: PromptVersion };

      if (!response.ok || !data.version) {
        setError(data.error ?? "Unable to save new version.");
        return;
      }

      setLastSavedContent(content);
      setStatus(`Committed v${data.version.version_number}`);
      onVersionCreated(data.version);
    } catch {
      setError("Network error while saving version.");
    } finally {
      setSaving(false);
    }
  }

  function onContentChange(next: string): void {
    setContent(next);

    if (typeof window === "undefined" || !("BroadcastChannel" in window) || !identity) {
      return;
    }

    const channel = new BroadcastChannel(`prompt-collab-${promptId}`);
    channel.postMessage({
      type: "draft",
      id: identity.id,
      label: identity.label,
      ts: Date.now(),
      content: next
    });
    channel.close();
  }

  const hasUnsavedChanges = content !== lastSavedContent;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-[#101926] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Prompt Workspace</h2>
          <p className="text-sm text-slate-400">Current release: v{currentVersion}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          <Users2 className="h-3.5 w-3.5 text-sky-300" />
          {activeCollaborators.length} active collaborator{activeCollaborators.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeCollaborators.map((collaborator) => (
          <span
            key={collaborator.id}
            className="rounded-full border border-slate-700 bg-[#0c1522] px-3 py-1 text-xs text-slate-300"
          >
            {collaborator.label}
          </span>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Author</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
            onChange={(event) => setCreatedBy(event.target.value)}
            value={createdBy}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate-300">Commit notes</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-[#0f1723] px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="text-slate-300">Prompt content</span>
        <textarea
          className="min-h-64 w-full rounded-2xl border border-slate-700 bg-[#0b1320] p-4 font-mono text-sm leading-relaxed text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
          onChange={(event) => onContentChange(event.target.value)}
          value={content}
        />
      </label>

      {remoteDraft ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-200">
          Live draft update from {remoteLabel}: {remoteDraft.slice(0, 180)}
          {remoteDraft.length > 180 ? "..." : ""}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={saving || !hasUnsavedChanges}
          onClick={saveVersion}
          type="button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Commit version
        </button>
        {status ? (
          <p className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {status}
          </p>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </section>
  );
}
