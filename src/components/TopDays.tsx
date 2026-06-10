"use client";

import type { DailySummary } from "@/lib/queries";

interface Props {
  dailies: DailySummary[];
  limit?: number;
}

const DRIVER_COLORS: Record<string, string> = {
  shipping: "#22c55e",
  research: "#3b82f6",
  review: "#eab308",
  planning: "#a855f7",
  support: "#f97316",
  admin: "#525252",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function TopDays({ dailies, limit = 5 }: Props) {
  const sorted = [...dailies]
    .filter((d) => d.total_tokens > 0)
    .sort((a, b) => b.total_tokens - a.total_tokens)
    .slice(0, limit);

  if (sorted.length === 0) return null;

  const maxTokens = sorted[0].total_tokens;

  return (
    <div className="space-y-2">
      {sorted.map((day, i) => {
        const barWidth = (day.total_tokens / maxTokens) * 100;
        const dateObj = new Date(day.day + "T12:00:00");
        const dateLabel = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const driver = day.driver || "admin";
        const driverColor = DRIVER_COLORS[driver] || "#525252";

        // Build a description from model mix + driver evidence
        const models = day.model_mix
          ? Object.entries(day.model_mix)
              .sort(([, a], [, b]) => b - a)
              .map(([m, pct]) => `${m} ${(pct * 100).toFixed(0)}%`)
              .join(", ")
          : "";

        return (
          <div key={day.day} className="group">
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-xs font-mono text-[#525252] w-4 shrink-0">
                {i + 1}
              </span>

              {/* Date */}
              <span className="text-sm font-mono text-[#a3a3a3] w-28 shrink-0">
                {dateLabel}
              </span>

              {/* Driver badge */}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded capitalize w-16 text-center shrink-0"
                style={{
                  backgroundColor: `${driverColor}20`,
                  color: driverColor,
                }}
              >
                {driver}
              </span>

              {/* Bar + token count */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-[#1a1a1a] rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: driverColor,
                      opacity: 0.6,
                    }}
                  />
                </div>
                <span className="text-sm font-mono w-16 text-right shrink-0">
                  {formatTokens(day.total_tokens)}
                </span>
                <span className="text-xs text-[#525252] w-14 text-right shrink-0">
                  ${(day.total_cost_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description row */}
            <div className="ml-7 pl-28 text-xs text-[#525252] mt-0.5">
              {day.total_turns} turns · {models}
            </div>
          </div>
        );
      })}
    </div>
  );
}
