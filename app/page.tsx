import Link from "next/link";
import { ArrowRight, BarChart3, GitBranch, LockKeyhole, TestTube2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { UnlockAccessForm } from "@/components/UnlockAccessForm";

type HomePageProps = {
  searchParams: Promise<{
    paywall?: string;
  }>;
};

const faqs = [
  {
    question: "How is this different from storing prompts in GitHub?",
    answer:
      "GitHub tracks raw text changes, but Prompt Version Tracker links each version to experiment outcomes, latency impact, and quality deltas. Teams can promote prompts with evidence instead of intuition."
  },
  {
    question: "Can we run A/B tests without engineering support?",
    answer:
      "Yes. Prompt engineers can launch tests from two existing versions, log live outcome metrics, and let the dashboard compute confidence and winner recommendations."
  },
  {
    question: "How does team collaboration work?",
    answer:
      "Editors get live session presence and synchronized prompt draft updates, which prevents duplicate edits and keeps version notes aligned during iterative prompt tuning."
  },
  {
    question: "What happens after payment?",
    answer:
      "After checkout, Stripe sends a webhook to register your purchase. Enter the same checkout email in the unlock form to receive a secure access cookie and open the workspace."
  }
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-20 px-6 py-10 lg:px-10">
      <header className="rounded-3xl border border-slate-800/90 bg-[#0f1723]/90 px-6 py-6 shadow-[0_20px_80px_rgba(4,10,20,0.45)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Prompt Version Tracker</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Git for AI prompt iterations
            </h1>
          </div>
          <div className="flex gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              rel="noreferrer"
              target="_blank"
            >
              Buy for $39/mo <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              href="/dashboard"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-[#111a26] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            <LockKeyhole className="h-4 w-4 text-sky-400" /> Built for AI product teams
          </p>
          <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Stop shipping blind prompt edits.
            <span className="block text-sky-300">Track what changed. Measure what won.</span>
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Prompt Version Tracker gives prompt engineers a Git-like workflow with version history,
            test orchestration, and outcome analytics. Every prompt release includes experiment data so
            your team can scale quality without guesswork.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#111a26] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Core Pain</p>
              <p className="mt-2 text-sm text-slate-200">
                Teams lose prompt context across Slack threads, docs, and ad-hoc notebooks.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-[#111a26] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Outcome</p>
              <p className="mt-2 text-sm text-slate-200">
                Faster iteration velocity with auditable prompt quality improvements.
              </p>
            </div>
          </div>
        </article>

        <aside className="space-y-5 rounded-3xl border border-slate-800 bg-[#101824]/95 p-6">
          {params.paywall === "locked" ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Workspace access is locked. Complete checkout, then unlock with your purchase email.
            </p>
          ) : null}
          <UnlockAccessForm />
          <p className="rounded-xl border border-slate-800 bg-[#0f1723] p-4 text-sm text-slate-300">
            Configure your Stripe Payment Link success URL to return users here so they can unlock
            instantly after purchase.
          </p>
        </aside>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <FeatureCard
          icon={<GitBranch className="h-5 w-5 text-sky-300" />}
          title="Prompt commits"
          description="Capture each prompt version with author notes, content hash, and release-ready diffs."
        />
        <FeatureCard
          icon={<TestTube2 className="h-5 w-5 text-sky-300" />}
          title="Built-in A/B framework"
          description="Launch side-by-side tests from any two versions and log conversion + latency outcomes."
        />
        <FeatureCard
          icon={<BarChart3 className="h-5 w-5 text-sky-300" />}
          title="Performance analytics"
          description="See confidence scores, winner recommendations, and trend lines for prompt performance."
        />
        <FeatureCard
          icon={<Users className="h-5 w-5 text-sky-300" />}
          title="Live collaboration"
          description="Real-time editor presence and synchronized drafts reduce merge conflicts in prompt teams."
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#101824] p-8">
        <h3 className="text-2xl font-semibold text-white">Pricing</h3>
        <p className="mt-2 text-slate-300">Simple pricing for prompt-heavy product teams.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-4xl font-semibold text-white">$39<span className="text-xl text-slate-400">/mo</span></p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Unlimited prompt repositories and version commits</li>
              <li>Unlimited A/B test runs with confidence insights</li>
              <li>Team collaboration presence + release history</li>
              <li>API webhook support for billing and access control</li>
            </ul>
          </div>
          <a
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
            rel="noreferrer"
            target="_blank"
          >
            Start with Stripe Checkout
          </a>
        </div>
      </section>

      <section className="space-y-4 pb-10">
        <h3 className="text-2xl font-semibold text-white">FAQ</h3>
        <div className="space-y-3">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-2xl border border-slate-800 bg-[#111a26] p-5">
              <h4 className="text-base font-semibold text-slate-100">{item.question}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-[#111a26] p-5">
      <div className="inline-flex rounded-lg border border-slate-700 bg-[#0d1622] p-2">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
    </article>
  );
}
