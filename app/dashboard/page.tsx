import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-sky-400">Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Prompt Operations Dashboard</h1>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" /> Back to landing
        </Link>
      </div>
      <AnalyticsDashboard />
    </main>
  );
}
