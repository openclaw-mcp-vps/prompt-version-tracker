"use client";

import { useState } from "react";
import Link from "next/link";

export default function UnlockPage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState(
    "Use the same email you used in Stripe checkout."
  );

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/access/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Access unlock failed");
      }

      setStatus("success");
      setMessage(payload.message ?? "Access unlocked. Redirecting to dashboard...");
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not unlock access");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-4xl items-center px-4 py-12 sm:px-6">
      <div className="grid w-full gap-6 rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl shadow-black/30 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-white">Unlock Your Workspace</h1>
          <p className="text-sm text-slate-300">
            Access to the prompt versioning tool is granted after successful Stripe checkout. Enter your purchase email to activate this browser session.
          </p>
          <div className="rounded-lg border border-[#30363d] bg-[#11161d] p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Need access?</p>
            <p className="mt-1 text-slate-400">
              Purchase first, then return here to claim your workspace.
            </p>
            <a
              href={paymentLink}
              className="mt-3 inline-flex rounded-md bg-[#2f81f7] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1f6feb]"
            >
              Open Stripe Checkout
            </a>
          </div>
          <p className="text-xs text-slate-500">
            If webhook processing is delayed, wait a few seconds and retry.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 rounded-lg border border-[#30363d] bg-[#11161d] p-4">
          <label className="block text-sm font-medium text-slate-200" htmlFor="email">
            Purchase email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-[#2f81f7]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:opacity-60"
          >
            {status === "loading" ? "Verifying purchase..." : "Unlock Dashboard"}
          </button>
          <p
            className={`text-xs ${
              status === "error"
                ? "text-red-300"
                : status === "success"
                  ? "text-emerald-300"
                  : "text-slate-400"
            }`}
          >
            {message}
          </p>
          <Link href="/" className="inline-flex text-xs text-slate-400 transition hover:text-white">
            Back to landing page
          </Link>
        </form>
      </div>
    </div>
  );
}
