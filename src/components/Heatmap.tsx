"use client";

import type { DailySummary } from "@/lib/queries";
import { formatDateET } from "@/lib/dates";

interface Props {
  dailies: DailySummary[];
}

// Log-scale purple ramp — single-hue from dark plum to bright violet
function heatColor(tokens: number): string {
  if (tokens === 0) return "#1a1a1a";        // no activity
  if (tokens < 100_000) return "#2e1065";    // minimal — deep plum
  if (tokens < 1_000_000) return "#4c1d95";  // light — dark purple
  if (tokens < 10_000_000) return "#7c3aed"; // moderate — vivid purple
  if (tokens < 50_000_000) return "#a855f7"; // heavy — bright violet
  return "#c084fc";                           // extreme — light violet
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function Heatmap({ dailies }: Props) {
  // Build a map of last 30 days
  const dayMap = new Map(dailies.map((d) => [d.day, d]));
  const days: { date: string; tokens: number; cost: number; turns: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatDateET(d); // Eastern time to match sync.py day boundaries
    const summary = dayMap.get(key);
    days.push({
      date: key,
      tokens: summary?.total_tokens ?? 0,
      cost: summary ? summary.total_cost_cents / 100 : 0,
      turns: summary?.total_turns ?? 0,
    });
  }

  // Arrange into weeks (7 columns)
  const firstDow = new Date(days[0].date).getDay(); // 0=Sun

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {days.map((day) => {
          const dow = new Date(day.date).getDay();
          const dayLabel = new Date(day.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={day.date}
              className="group relative"
            >
              <div
                className="h-8 w-8 rounded-sm transition-all hover:ring-1 hover:ring-[#737373]"
                style={{ backgroundColor: heatColor(day.tokens) }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded bg-[#262626] px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-medium">{dayLabel}</span>
                <br />
                {day.tokens > 0
                  ? `${formatTokens(day.tokens)} · ${day.turns} turns · $${day.cost.toFixed(2)}`
                  : "No activity"}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-[#737373]">
        <span>Less</span>
        {["#1a1a1a", "#2e1065", "#4c1d95", "#7c3aed", "#a855f7", "#c084fc"].map(
          (c) => (
            <div
              key={c}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: c }}
            />
          )
        )}
        <span>More</span>
        <span className="ml-4">
          (0 / &lt;100K / &lt;1M / &lt;10M / &lt;50M / 50M+)
        </span>
      </div>
    </div>
  );
}
