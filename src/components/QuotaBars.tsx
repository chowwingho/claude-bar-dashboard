"use client";

import type { UsageSnapshot } from "@/lib/queries";

interface Props {
  snapshot: UsageSnapshot;
}

interface QuotaRow {
  label: string;
  pct: number | null;
  resetsAt: string | null;
}

export function QuotaBars({ snapshot }: Props) {
  const rows: QuotaRow[] = [
    {
      label: "5-hour session",
      pct: snapshot.five_hour_pct,
      resetsAt: snapshot.five_hour_resets_at,
    },
    {
      label: "Weekly (all models)",
      pct: snapshot.seven_day_pct,
      resetsAt: snapshot.seven_day_resets_at,
    },
    {
      label: "Weekly · Sonnet",
      pct: snapshot.seven_day_sonnet_pct,
      resetsAt: null,
    },
  ];

  const hasExtra =
    snapshot.extra_used_cents != null && snapshot.extra_limit_cents != null;

  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
      <h2 className="mb-4 text-sm font-medium text-[#737373]">
        Plan usage
      </h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <QuotaBar key={row.label} {...row} />
        ))}
        {hasExtra && (
          <div className="flex items-center gap-4">
            <span className="w-44 shrink-0 text-sm text-[#737373]">
              Extra usage
            </span>
            <div className="flex-1">
              <ProgressBar pct={snapshot.extra_usage_pct || 0} />
            </div>
            <span className="w-32 text-right text-xs font-mono text-[#737373]">
              ${((snapshot.extra_used_cents || 0) / 100).toFixed(2)} / $
              {((snapshot.extra_limit_cents || 0) / 100).toFixed(0)}{" "}
              {snapshot.extra_currency}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuotaBar({ label, pct, resetsAt }: QuotaRow) {
  const p = pct ?? 0;
  const resetLabel = resetsAt ? formatReset(resetsAt) : "—";

  return (
    <div className="flex items-center gap-4">
      <span className="w-44 shrink-0 text-sm text-[#737373]">{label}</span>
      <div className="flex-1">
        <ProgressBar pct={p} />
      </div>
      <span className="w-20 text-right text-sm font-mono">
        {healthEmoji(p)} {p.toFixed(0)}%
      </span>
      <span className="w-32 text-right text-xs text-[#737373]">
        resets {resetLabel}
      </span>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-[#ef4444]" : pct >= 50 ? "bg-[#eab308]" : "bg-[#22c55e]";
  return (
    <div className="h-2 w-full rounded-full bg-[#262626]">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function healthEmoji(pct: number): string {
  if (pct >= 80) return "\u{1F534}"; // red
  if (pct >= 50) return "\u{1F7E1}"; // yellow
  if (pct > 0) return "\u{1F7E2}"; // green
  return "⚪"; // white
}

function formatReset(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return "expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) {
      return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" });
    }
    return `${hours}h ${mins}m`;
  } catch {
    return "—";
  }
}
