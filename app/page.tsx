import Link from "next/link";

const faqs = [
  {
    question: "How is this different from saving prompts in a doc?",
    answer:
      "You get immutable version history, diffs between revisions, experiment tracking, and performance metrics tied to each version so teams can prove improvements instead of guessing."
  },
  {
    question: "Can multiple prompt engineers collaborate in one workspace?",
    answer:
      "Yes. Every prompt keeps a timeline of versions and test outcomes, so teams can review changes, compare quality, and promote a winner with shared context."
  },
  {
    question: "How fast can we start?",
    answer:
      "Most teams can create the first prompt, add two versions, and launch an A/B test in under 10 minutes. No model-provider lock-in is required."
  },
  {
    question: "What does the paywall unlock?",
    answer:
      "The full product: prompt editor, version graph, A/B testing console, and analytics dashboard are locked behind purchase-based access."
  }
];

const painPoints = [
  "Prompt edits happen in Slack, docs, and local notes with no source of truth.",
  "Teams ship new prompts without knowing if quality actually improved.",
  "Regression bugs appear because no one can diff working vs failing prompts.",
  "Leaders cannot quantify prompt ROI or justify model-cost decisions."
];

const solutionPoints = [
  "Git-style version timeline with semantic notes and instant side-by-side diffs.",
  "Built-in A/B runner to compare candidate prompts against real scoring data.",
  "Performance dashboard for quality, latency, token usage, and spend trends.",
  "Single place to promote winners and keep shipping with confidence."
];

export default function LandingPage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14">
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-[#30363d] bg-[#11161d] px-3 py-1 text-xs font-medium text-slate-300">
            Git for AI prompt iterations
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Track every prompt change. Prove every improvement.
          </h1>
          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            Prompt Version Tracker gives AI product teams a production workflow for prompt evolution: version history, measurable experiments, and analytics that show what actually works.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={paymentLink}
              className="inline-flex items-center justify-center rounded-md bg-[#2f81f7] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6feb]"
            >
              Buy Now • $39/mo
            </a>
            <Link
              href="/unlock"
              className="inline-flex items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#2f81f7]"
            >
              Already Purchased? Unlock Access
            </Link>
          </div>
          <p className="text-xs text-slate-400">
            Hosted Stripe checkout. Immediate access once your purchase email is verified.
          </p>
        </div>

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between border-b border-[#30363d] pb-3">
            <span className="text-sm font-medium text-slate-200">Prompt Timeline</span>
            <span className="rounded bg-[#1f6feb]/25 px-2 py-1 text-xs text-blue-300">
              v12 promoted
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded border border-[#30363d] bg-[#11161d] p-3">
              <p className="font-medium text-slate-100">v13 • Support Assistant</p>
              <p className="mt-1 text-slate-400">
                Added stricter response format and fallback escalation logic.
              </p>
              <p className="mt-2 text-xs text-slate-500">Avg score 81.4 • Latency 920ms</p>
            </div>
            <div className="rounded border border-[#2f81f7]/50 bg-[#102040]/30 p-3">
              <p className="font-medium text-blue-100">v12 • A/B Winner</p>
              <p className="mt-1 text-slate-300">
                Compact chain-of-thought suppression and stronger refusal policy.
              </p>
              <p className="mt-2 text-xs text-blue-200">Avg score 88.9 • Latency 860ms</p>
            </div>
            <div className="rounded border border-[#30363d] bg-[#11161d] p-3">
              <p className="font-medium text-slate-100">v11 • Baseline</p>
              <p className="mt-1 text-slate-400">Legacy prompt from July release branch.</p>
              <p className="mt-2 text-xs text-slate-500">Avg score 74.7 • Latency 990ms</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border border-[#30363d] bg-[#11161d] p-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold text-white">The Problem</h2>
          <p className="mt-2 text-sm text-slate-400">
            AI teams are shipping prompts without a reliable system to track what changed and why output quality moved.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {painPoints.map((item) => (
              <li key={item} className="rounded border border-[#30363d] bg-[#161b22] p-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">The Solution</h2>
          <p className="mt-2 text-sm text-slate-400">
            A focused workflow designed for prompt engineers who need speed and evidence.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {solutionPoints.map((item) => (
              <li key={item} className="rounded border border-[#30363d] bg-[#161b22] p-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#161b22] p-6">
        <h2 className="text-2xl font-semibold text-white">Simple Pricing</h2>
        <p className="mt-2 text-sm text-slate-400">
          Built for AI product teams that need disciplined prompt iteration without enterprise overhead.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 rounded-lg border border-[#30363d] bg-[#11161d] p-5">
            <h3 className="text-lg font-semibold text-white">Prompt Version Tracker Pro</h3>
            <p className="mt-2 text-sm text-slate-400">
              Unlimited prompts, full version history, A/B tests, performance analytics, and webhook-based access control.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Unlimited prompt repositories</li>
              <li>Version diffs with structured release notes</li>
              <li>A/B test runner with winner declaration</li>
              <li>Quality, latency, and cost dashboards</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[#2f81f7]/50 bg-[#102040]/35 p-5">
            <p className="text-sm text-blue-200">Launch Plan</p>
            <p className="mt-2 text-4xl font-bold text-white">$39</p>
            <p className="text-sm text-blue-100">per month</p>
            <a
              href={paymentLink}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb]"
            >
              Start Subscription
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#30363d] bg-[#11161d] p-6">
        <h2 className="text-2xl font-semibold text-white">FAQ</h2>
        <div className="mt-5 space-y-3">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
              <h3 className="text-sm font-semibold text-slate-100">{faq.question}</h3>
              <p className="mt-2 text-sm text-slate-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
