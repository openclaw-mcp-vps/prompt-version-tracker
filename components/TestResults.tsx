"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { PromptTest } from "@/lib/models";

type TestResultsProps = {
  tests: PromptTest[];
};

export function TestResults({ tests }: TestResultsProps) {
  const chartData = tests.map((test) => ({
    test: test.name,
    conversionA: test.insight.conversionRateA,
    conversionB: test.insight.conversionRateB,
    confidence: Number((test.insight.confidence * 100).toFixed(1))
  }));

  if (tests.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-[#101926] p-6">
        <h3 className="text-lg font-semibold text-white">A/B Test Results</h3>
        <p className="mt-2 text-sm text-slate-300">
          No experiments yet. Create your first test to compare two prompt versions.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-[#101926] p-6">
      <h3 className="text-lg font-semibold text-white">A/B Test Results</h3>
      <div className="h-72 w-full rounded-2xl border border-slate-800 bg-[#0f1723] p-3">
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="test" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0b1320",
                border: "1px solid #334155",
                borderRadius: 12,
                color: "#e2e8f0"
              }}
            />
            <Legend />
            <Bar dataKey="conversionA" fill="#38bdf8" name="Version A CR %" radius={[6, 6, 0, 0]} />
            <Bar dataKey="conversionB" fill="#0ea5e9" name="Version B CR %" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tests.map((test) => (
          <article key={test.id} className="rounded-2xl border border-slate-800 bg-[#0f1723] p-4">
            <h4 className="text-sm font-semibold text-white">{test.name}</h4>
            <p className="mt-1 text-xs text-slate-400">
              v{test.version_a_number} vs v{test.version_b_number} · {test.status}
            </p>
            <div className="mt-3 space-y-1 text-sm text-slate-300">
              <p>
                Conversion rate: A {test.insight.conversionRateA}% | B {test.insight.conversionRateB}%
              </p>
              <p>Confidence: {(test.insight.confidence * 100).toFixed(1)}%</p>
              <p>
                Winner: {test.insight.winner === "tie" ? "No clear winner yet" : `Variant ${test.insight.winner}`}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
