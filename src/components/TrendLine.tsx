"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Bar,
} from "recharts";
import type { DailySummary } from "@/lib/queries";

interface Props {
  dailies: DailySummary[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function TrendLine({ dailies }: Props) {
  if (dailies.length < 3) return null;

  // Build data with 7-day moving average
  const data = dailies.map((d, i) => {
    // 7-day moving average
    const windowStart = Math.max(0, i - 6);
    const window = dailies.slice(windowStart, i + 1);
    const avg =
      window.reduce((s, w) => s + w.total_tokens, 0) / window.length;

    return {
      day: d.day.slice(5), // MM-DD
      fullDay: d.day,
      tokens: d.total_tokens,
      avg7d: Math.round(avg),
      cost: d.total_cost_cents / 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#737373", fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 10 }}
          tickFormatter={(v) => formatTokens(v)}
          width={55}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #262626",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            formatTokens(Number(value)),
            name === "tokens" ? "Daily" : "7-day avg",
          ]}
          labelFormatter={(label) => label}
        />
        {/* Daily bars */}
        <Bar
          dataKey="tokens"
          fill="#a855f7"
          opacity={0.3}
          radius={[2, 2, 0, 0]}
        />
        {/* 7-day moving average line */}
        <Line
          type="monotone"
          dataKey="avg7d"
          stroke="#c084fc"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#c084fc" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
