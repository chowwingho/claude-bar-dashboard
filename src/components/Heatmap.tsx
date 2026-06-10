"use client";

import type { DailySummary } from "@/lib/queries";
import { formatDateET } from "@/lib/dates";

interface Props {
  dailies: DailySummary[];
}

// Log-scale purple ramp — single-hue from dark plum to bright violet
function heatColor(tokens: number): string {
  if (tokens === 0) return "#1a1a1a"; // no activity
  if (tokens < 100_000) return "#2e1065"; // minimal — deep plum
  if (tokens < 1_000_000) return "#4c1d95"; // light — dark purple
  if (tokens < 10_000_000) return "#7c3aed"; // moderate — vivid purple
  if (tokens < 50_000_000) return "#a855f7"; // heavy — bright violet
  return "#c084fc"; // extreme — light violet
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({ dailies }: Props) {
  const dayMap = new Map(dailies.map((d) => [d.day, d]));

  // Build array of last 90 days for a fuller grid (like GitHub)
  const allDays: {
    date: string;
    tokens: number;
    cost: number;
    turns: number;
    dow: number;
  }[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatDateET(d);
    const summary = dayMap.get(key);
    const dow = d.getDay(); // 0=Sun
    allDays.push({
      date: key,
      tokens: summary?.total_tokens ?? 0,
      cost: summary ? summary.total_cost_cents / 100 : 0,
      turns: summary?.total_turns ?? 0,
      dow,
    });
  }

  // Build calendar grid: 7 rows (Sun-Sat) x N week columns
  // Start from the first Sunday on or before the oldest day
  const firstDay = allDays[0];
  const leadingBlanks = firstDay.dow; // days to skip in first column

  // Group into weeks (columns)
  const weeks: (typeof allDays[0] | null)[][] = [];
  let currentWeek: (typeof allDays[0] | null)[] = Array(leadingBlanks).fill(
    null
  );

  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    // Pad trailing week
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Month labels for the top
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = "";
  weeks.forEach((week, colIdx) => {
    for (const day of week) {
      if (day) {
        const month = new Date(day.date + "T12:00:00").toLocaleDateString(
          "en-US",
          { month: "short" }
        );
        if (month !== lastMonth) {
          monthLabels.push({ label: month, col: colIdx });
          lastMonth = month;
        }
        break;
      }
    }
  });

  return (
    <div>
      {/* Month labels */}
      <div className="flex mb-1 ml-9">
        {weeks.map((_, colIdx) => {
          const label = monthLabels.find((m) => m.col === colIdx);
          return (
            <div
              key={colIdx}
              className="text-[10px] text-[#525252]"
              style={{ width: 14, marginRight: 2 }}
            >
              {label ? label.label : ""}
            </div>
          );
        })}
      </div>

      {/* Grid: row labels + cells */}
      <div className="flex">
        {/* Day-of-week labels */}
        <div className="flex flex-col mr-1" style={{ gap: 2 }}>
          {DOW_LABELS.map((label, i) => (
            <div
              key={label}
              className="text-[10px] text-[#525252] flex items-center justify-end"
              style={{ height: 14, width: 32 }}
            >
              {i % 2 === 1 ? label : ""}
            </div>
          ))}
        </div>

        {/* Calendar cells: each column is a week */}
        <div className="flex" style={{ gap: 2 }}>
          {weeks.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col" style={{ gap: 2 }}>
              {week.map((day, rowIdx) => {
                if (!day) {
                  return (
                    <div
                      key={`blank-${colIdx}-${rowIdx}`}
                      style={{ width: 14, height: 14 }}
                    />
                  );
                }
                const dayLabel = new Date(
                  day.date + "T12:00:00"
                ).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div key={day.date} className="group relative">
                    <div
                      className="rounded-[3px] transition-all hover:ring-1 hover:ring-[#a3a3a3]"
                      style={{
                        width: 14,
                        height: 14,
                        backgroundColor: heatColor(day.tokens),
                      }}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded bg-[#262626] px-2 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
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
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-[#737373]">
        <span>Less</span>
        {["#1a1a1a", "#2e1065", "#4c1d95", "#7c3aed", "#a855f7", "#c084fc"].map(
          (c) => (
            <div
              key={c}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: c }}
            />
          )
        )}
        <span>More</span>
      </div>
    </div>
  );
}
