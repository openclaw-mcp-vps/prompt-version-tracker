"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UnlockKeyhole } from "lucide-react";

export function UnlockAccessForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/access/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to unlock workspace right now.");
        return;
      }

      setSuccess("Access unlocked. Redirecting to your dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 650);
    } catch {
      setError("Network error while checking purchase status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-slate-300" htmlFor="purchase-email">
        Unlock with your checkout email
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="purchase-email"
          autoComplete="email"
          className="w-full rounded-xl border border-slate-700 bg-[#111a26] px-4 py-3 text-sm text-slate-100 outline-none ring-sky-500 transition focus:ring-2"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@team.com"
          required
          type="email"
          value={email}
        />
        <button
          className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UnlockKeyhole className="h-4 w-4" />} Unlock
        </button>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
    </form>
  );
}
