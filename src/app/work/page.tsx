"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getDailySummaries, type DailySummary } from "@/lib/queries";

const DRIVER_COLORS: Record<string, string> = {
  shipping: "#22c55e",
  research: "#3b82f6",
  review: "#eab308",
  planning: "#a855f7",
  support: "#f97316",
  admin: "#525252",
};

const DRIVER_ICONS: Record<string, string> = {
  shipping: "\u{1F6A2}",
  research: "\u{1F50D}",
  review: "\u{1F4CB}",
  planning: "\u{1F4DD}",
  support: "\u{1F527}",
  admin: "\u{1F4C1}",
};

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-[#22c55e]/20 text-[#22c55e]",
  medium: "bg-[#eab308]/20 text-[#eab308]",
  low: "bg-[#525252]/20 text-[#737373]",
};

export default function WorkPage() {
  const [dailies, setDailies] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailySummaries(30).then((data) => {
      setDailies(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-[#737373]">
        Loading...
      </div>
    );
  }

  const classified = dailies.filter((d) => d.driver);

  // Driver distribution (pie chart)
  const driverCounts: Record<string, { days: number; tokens: number; cost: number }> = {};
  for (const d of classified) {
    const key = d.driver!;
    if (!driverCounts[key]) driverCounts[key] = { days: 0, tokens: 0, cost: 0 };
    driverCounts[key].days += 1;
    driverCounts[key].tokens += d.total_tokens;
    driverCounts[key].cost += d.total_cost_cents;
  }
  const pieData = Object.entries(driverCounts)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.tokens - a.tokens);

  // Stacked bar: daily tokens by driver
  const stackedData = classified.map((d) => ({
    day: d.day.slice(5), // MM-DD
    fullDay: d.day,
    tokens: d.total_tokens,
    driver: d.driver!,
    [d.driver!]: d.total_tokens,
  }));

  // Confidence distribution
  const confCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const d of classified) {
    const conf = d.driver_confidence || "low";
    confCounts[conf] = (confCounts[conf] || 0) + 1;
  }

  // All unique drivers for stacked bar
  const allDrivers = [...new Set(classified.map((d) => d.driver!))];

  // Build complete stacked data with all driver keys
  const fullStackedData = classified.map((d) => {
    const row: Record<string, string | number> = {
      day: d.day.slice(5),
      fullDay: d.day,
    };
    for (const driver of allDrivers) {
      row[driver] = d.driver === driver ? d.total_tokens : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Work Attribution</h1>
        <div className="flex items-center gap-3 text-xs text-[#737373]">
          <span>Confidence:</span>
          {Object.entries(confCounts).map(([level, count]) => (
            <span
              key={level}
              className={`px-2 py-0.5 rounded ${CONFIDENCE_BADGE[level]}`}
            >
              {level} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Driver summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {pieData.map((d) => (
          <div
            key={d.name}
            className="rounded-lg border border-[#262626] bg-[#141414] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{DRIVER_ICONS[d.name] || "\u{2753}"}</span>
              <span
                className="text-sm font-medium capitalize"
                style={{ color: DRIVER_COLORS[d.name] || "#737373" }}
              >
                {d.name}
              </span>
            </div>
            <p className="text-xl font-mono font-semibold">
              {d.days} <span className="text-sm text-[#737373] font-normal">days</span>
            </p>
            <p className="text-xs text-[#737373] mt-1">
              {formatTokens(d.tokens)} · ${(d.cost / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Token volume by driver over time */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Daily tokens by work type
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={fullStackedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="day" tick={{ fill: "#737373", fontSize: 10 }} />
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
              formatter={(value) => [formatTokens(Number(value))]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#737373" }}
            />
            {allDrivers.map((driver) => (
              <Bar
                key={driver}
                dataKey={driver}
                stackId="driver"
                fill={DRIVER_COLORS[driver] || "#525252"}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Driver distribution pie */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            Token share by work type
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="tokens"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={DRIVER_COLORS[entry.name] || "#525252"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #262626",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => [formatTokens(Number(value)), "Tokens"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by driver */}
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            Cost by work type (API-equiv)
          </h2>
          <div className="space-y-3">
            {pieData.map((d) => {
              const totalCost = pieData.reduce((s, p) => s + p.cost, 0);
              const pct = totalCost > 0 ? (d.cost / totalCost) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-20 text-sm capitalize text-[#a3a3a3]">
                    {DRIVER_ICONS[d.name]} {d.name}
                  </span>
                  <div className="flex-1 h-3 bg-[#1a1a1a] rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: DRIVER_COLORS[d.name],
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs font-mono text-[#737373]">
                    ${(d.cost / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily log */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Daily work log (last 30 days)
        </h2>
        <div className="space-y-2">
          {[...classified].reverse().map((d) => (
            <div
              key={d.day}
              className="flex items-start gap-3 py-2 border-b border-[#1a1a1a] last:border-0"
            >
              <span className="text-sm font-mono text-[#525252] w-20 shrink-0">
                {d.day.slice(5)}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded capitalize w-20 text-center shrink-0"
                style={{
                  backgroundColor: `${DRIVER_COLORS[d.driver!]}20`,
                  color: DRIVER_COLORS[d.driver!],
                }}
              >
                {d.driver}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                  CONFIDENCE_BADGE[d.driver_confidence || "low"]
                }`}
              >
                {d.driver_confidence}
              </span>
              <span className="text-xs text-[#737373] flex-1">
                {formatTokens(d.total_tokens)} · {d.total_turns} turns · $
                {(d.total_cost_cents / 100).toFixed(2)}
              </span>
            </div>
          ))}
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
