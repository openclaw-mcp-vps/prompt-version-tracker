"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type PerformanceChartPoint = {
  date: string;
  avgScore: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  runs: number;
};

type PerformanceChartProps = {
  data: PerformanceChartPoint[];
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
        <h3 className="text-sm font-semibold text-slate-100">Performance Trend</h3>
        <p className="mt-3 text-sm text-slate-400">
          No telemetry yet. Run a test to start plotting score, latency, and cost.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
      <h3 className="text-sm font-semibold text-slate-100">Performance Trend (30 days)</h3>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 10
            }}
          >
            <CartesianGrid stroke="#30363d" strokeDasharray="4 4" />
            <XAxis dataKey="date" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
            <YAxis yAxisId="score" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
            <YAxis
              yAxisId="latency"
              orientation="right"
              stroke="#8b949e"
              tick={{ fill: "#8b949e", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#11161d",
                border: "1px solid #30363d",
                borderRadius: "8px",
                color: "#e6edf3"
              }}
            />
            <Legend wrapperStyle={{ color: "#c9d1d9" }} />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="avgScore"
              stroke="#3fb950"
              strokeWidth={2}
              name="Avg Score"
              dot={false}
            />
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="avgLatencyMs"
              stroke="#2f81f7"
              strokeWidth={2}
              name="Avg Latency (ms)"
              dot={false}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="avgCostUsd"
              stroke="#f2cc60"
              strokeWidth={2}
              name="Avg Cost (USD)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
