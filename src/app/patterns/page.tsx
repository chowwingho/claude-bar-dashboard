"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  getDailySummaries,
  getTokenBuckets,
  aggregateToolMix,
  computeCacheEfficiency,
  type DailySummary,
  type TokenBucket,
} from "@/lib/queries";

const TOOL_COLORS: Record<string, string> = {
  "(none)": "#737373",
  Bash: "#22c55e",
  Read: "#3b82f6",
  Edit: "#eab308",
  Write: "#f97316",
  "MCP tools": "#a855f7",
  ToolSearch: "#06b6d4",
  AskUserQuestion: "#ec4899",
};

export default function PatternsPage() {
  const [dailies, setDailies] = useState<DailySummary[]>([]);
  const [buckets, setBuckets] = useState<TokenBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDailySummaries(30), getTokenBuckets(30)]).then(
      ([d, b]) => {
        setDailies(d);
        setBuckets(b);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-[#737373]">
        Loading...
      </div>
    );
  }

  // Hour-of-day aggregation
  const hourAgg: Record<
    number,
    { tokens: number; turns: number; count: number }
  > = {};
  for (let h = 0; h < 24; h++) {
    hourAgg[h] = { tokens: 0, turns: 0, count: 0 };
  }
  for (const b of buckets) {
    const hour = new Date(b.bucket_hour).getHours();
    const total =
      b.input_tokens +
      b.output_tokens +
      b.cache_read_tokens +
      b.cache_write_tokens;
    hourAgg[hour].tokens += total;
    hourAgg[hour].turns += b.turns;
    hourAgg[hour].count += 1;
  }
  const hourData = Object.entries(hourAgg)
    .map(([h, v]) => ({
      hour: `${h.padStart(2, "0")}:00`,
      hourNum: parseInt(h),
      tokens: v.tokens,
      avgTokens: v.count > 0 ? Math.round(v.tokens / v.count) : 0,
      turns: v.turns,
      isPeak: parseInt(h) >= 8 && parseInt(h) < 14,
    }))
    .filter((d) => d.tokens > 0);

  // Day-of-week aggregation
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowAgg: Record<
    number,
    { tokens: number; turns: number; days: number; cost: number }
  > = {};
  for (let d = 0; d < 7; d++) {
    dowAgg[d] = { tokens: 0, turns: 0, days: 0, cost: 0 };
  }
  for (const d of dailies) {
    const dow = new Date(d.day + "T12:00:00").getDay();
    dowAgg[dow].tokens += d.total_tokens;
    dowAgg[dow].turns += d.total_turns;
    dowAgg[dow].cost += d.total_cost_cents;
    dowAgg[dow].days += 1;
  }
  const dowData = Object.entries(dowAgg).map(([d, v]) => ({
    day: dowNames[parseInt(d)],
    avgTokens: v.days > 0 ? Math.round(v.tokens / v.days) : 0,
    avgCost: v.days > 0 ? v.cost / v.days / 100 : 0,
  }));

  // Peak vs off-peak
  const peakTokens = dailies.reduce((s, d) => s + (d.peak_tokens ?? 0), 0);
  const offPeakTokens = dailies.reduce(
    (s, d) => s + (d.off_peak_tokens ?? 0),
    0
  );
  const totalTokens = peakTokens + offPeakTokens;

  // Tool breakdown
  const toolData = aggregateToolMix(dailies);
  const totalToolInvocations = toolData.reduce((s, t) => s + t.count, 0);

  // Cache efficiency over time
  const cacheData = computeCacheEfficiency(buckets);
  const avgCache =
    cacheData.length > 0
      ? cacheData.reduce((s, d) => s + d.cachePct, 0) / cacheData.length
      : 0;

  // Model mix over time
  const modelByDay = dailies
    .filter((d) => d.model_mix)
    .map((d) => {
      const mix = d.model_mix!;
      return {
        day: d.day.slice(5), // MM-DD
        Opus: (mix["Opus"] ?? 0) * 100,
        Sonnet: (mix["Sonnet"] ?? 0) * 100,
        Haiku: (mix["Haiku"] ?? 0) * 100,
      };
    });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Patterns</h1>

      {/* Hour of day */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Tokens by hour of day (30-day total)
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="hour" tick={{ fill: "#737373", fontSize: 10 }} />
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
              formatter={(value) => [formatTokens(Number(value)), "Tokens"]}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Bar
              dataKey="tokens"
              radius={[2, 2, 0, 0]}
              shape={(props: any) => {
                const { x, y, width, height, isPeak } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={2}
                    fill={isPeak ? "#f97316" : "#a855f7"}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-[#737373]">
          Orange = Anthropic peak hours (8am-2pm ET)
        </p>
      </div>

      {/* Tool breakdown */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Tool invocations (30 days)
        </h2>
        <div className="space-y-2">
          {toolData.slice(0, 12).map((tool) => {
            const pct = (tool.count / totalToolInvocations) * 100;
            const color =
              TOOL_COLORS[tool.name] || "#525252";
            return (
              <div key={tool.name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm truncate text-[#a3a3a3]">
                  {tool.name}
                </span>
                <div className="flex-1 h-4 bg-[#1a1a1a] rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-mono text-[#737373]">
                  {tool.count.toLocaleString()}
                </span>
                <span className="w-12 text-right text-xs text-[#525252]">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[#737373]">
          &quot;(none)&quot; = pure text turns with no tool invocation.
          Turns with multiple tools are counted once per tool.
        </p>
      </div>

      {/* Cache efficiency over time */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Cache hit rate by day (cache_read / input-side tokens)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cacheData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#737373", fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#737373", fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #262626",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Cache hit rate"]}
            />
            <ReferenceLine
              y={avgCache}
              stroke="#22c55e"
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: `avg ${avgCache.toFixed(0)}%`,
                fill: "#22c55e",
                fontSize: 10,
                position: "right",
              }}
            />
            <Line
              type="monotone"
              dataKey="cachePct"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: "#22c55e" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model mix over time */}
      {modelByDay.length > 1 && (
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            Model distribution over time
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelByDay} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="day" tick={{ fill: "#737373", fontSize: 10 }} />
              <YAxis
                tick={{ fill: "#737373", fontSize: 10 }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #262626",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value).toFixed(0)}%`]}
              />
              <Bar dataKey="Opus" stackId="model" fill="#a855f7" />
              <Bar dataKey="Sonnet" stackId="model" fill="#3b82f6" />
              <Bar dataKey="Haiku" stackId="model" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-4 text-xs text-[#737373]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#a855f7]" /> Opus
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" /> Sonnet
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#22c55e]" /> Haiku
            </span>
          </div>
        </div>
      )}

      {/* Day of week */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Average daily tokens by day of week
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="day" tick={{ fill: "#737373", fontSize: 11 }} />
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
                name === "avgTokens"
                  ? formatTokens(Number(value))
                  : `$${Number(value).toFixed(2)}`,
                name === "avgTokens" ? "Avg tokens" : "Avg cost",
              ]}
            />
            <Bar dataKey="avgTokens" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak vs off-peak */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Peak vs off-peak (30 days)
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-mono font-semibold text-[#f97316]">
              {totalTokens > 0
                ? ((peakTokens / totalTokens) * 100).toFixed(0)
                : 0}
              %
            </p>
            <p className="text-xs text-[#737373] mt-1">
              Peak share (8am-2pm ET)
            </p>
          </div>
          <div>
            <p className="text-2xl font-mono font-semibold">
              {formatTokens(peakTokens)}
            </p>
            <p className="text-xs text-[#737373] mt-1">Peak tokens</p>
          </div>
          <div>
            <p className="text-2xl font-mono font-semibold">
              {formatTokens(offPeakTokens)}
            </p>
            <p className="text-xs text-[#737373] mt-1">Off-peak tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
