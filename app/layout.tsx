import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Version Tracker | Git for AI prompt iterations",
  description:
    "Track every prompt change, run side-by-side A/B tests, and prove prompt improvements with measurable performance analytics.",
  keywords: [
    "prompt version control",
    "AI prompt management",
    "prompt A/B testing",
    "prompt analytics",
    "prompt engineering"
  ],
  openGraph: {
    title: "Prompt Version Tracker",
    description:
      "Version control and experimentation platform built for AI prompt teams.",
    type: "website",
    url: "https://prompt-version-tracker.example",
    siteName: "Prompt Version Tracker"
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Version Tracker",
    description:
      "Stop losing prompt iterations. Ship with version history, A/B testing, and performance analytics."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">
        <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="text-sm font-semibold tracking-wide text-slate-100">
              prompt-version-tracker
            </Link>
            <nav className="flex items-center gap-4 text-xs text-slate-300 sm:text-sm">
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <Link href="/analytics" className="transition hover:text-white">
                Analytics
              </Link>
              <Link href="/unlock" className="transition hover:text-white">
                Unlock
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
