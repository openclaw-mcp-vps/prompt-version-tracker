import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const heading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://prompt-version-tracker.app"),
  title: {
    default: "Prompt Version Tracker | Git for AI prompt iterations",
    template: "%s | Prompt Version Tracker"
  },
  description:
    "Version control for AI prompts with native A/B testing, performance analytics, and release confidence scoring for prompt engineering teams.",
  openGraph: {
    type: "website",
    title: "Prompt Version Tracker",
    description:
      "Ship better prompts with version history, A/B tests, and experiment analytics in one Git-like workflow.",
    siteName: "Prompt Version Tracker",
    url: "https://prompt-version-tracker.app"
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Version Tracker",
    description: "Git for AI prompt iterations with measurable performance impact."
  },
  keywords: [
    "prompt versioning",
    "prompt engineering",
    "ai tooling",
    "ab testing prompts",
    "prompt analytics"
  ],
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${heading.variable} ${mono.variable} bg-[#0d1117] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
