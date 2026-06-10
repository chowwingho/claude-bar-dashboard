"use client";

import { useEffect, useState } from "react";
import {
  getLatestSnapshot,
  getDailySummaries,
  getSnapshotsSince,
  type UsageSnapshot,
  type DailySummary,
} from "@/lib/queries";
import { QuotaBars } from "@/components/QuotaBars";
import { Heatmap } from "@/components/Heatmap";
import { StatsCard } from "@/components/StatsCard";
import { WindowTimeline } from "@/components/WindowTimeline";

export default function Home() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [dailies, setDailies] = useState<DailySummary[]>([]);
  const [snapshots24h, setSnapshots24h] = useState<UsageSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [snap, days, snaps24] = await Promise.all([
        getLatestSnapshot(),
        getDailySummaries(30),
        getSnapshotsSince(24),
      ]);
      setSnapshot(snap);
      setDailies(days);
      setSnapshots24h(snaps24);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#737373]">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-[#ef4444]">Failed to load data</p>
        <p className="text-sm text-[#737373]">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 text-sm bg-[#262626] rounded hover:bg-[#333]"
        >
          Retry
        </button>
      </div>
    );
  }

  // Today's summary
  const today = new Date().toISOString().slice(0, 10);
  const todaySummary = dailies.find((d) => d.day === today);

  return (
    <div className="space-y-6">
      {/* Quota bars */}
      {snapshot && <QuotaBars snapshot={snapshot} />}

      {/* Stats cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard
          label="Today"
          value={todaySummary ? formatTokens(todaySummary.total_tokens) : "—"}
          sub={
            todaySummary
              ? `${todaySummary.total_turns} turns · $${(todaySummary.total_cost_cents / 100).toFixed(2)}`
              : "No data"
          }
        />
        <StatsCard
          label="7-day total"
          value={formatTokens(
            dailies
              .slice(-7)
              .reduce((s, d) => s + d.total_tokens, 0)
          )}
          sub={`${dailies.slice(-7).reduce((s, d) => s + d.total_turns, 0)} turns`}
        />
        <StatsCard
          label="30-day total"
          value={formatTokens(
            dailies.reduce((s, d) => s + d.total_tokens, 0)
          )}
          sub={`$${(dailies.reduce((s, d) => s + d.total_cost_cents, 0) / 100).toFixed(2)} API-equiv`}
        />
        <StatsCard
          label="Last sync"
          value={
            snapshot
              ? timeAgo(new Date(snapshot.fetched_at))
              : "—"
          }
          sub={
            snapshot
              ? new Date(snapshot.fetched_at).toLocaleTimeString()
              : ""
          }
        />
      </div>

      {/* 30-day heatmap */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          Daily volume — last 30 days
        </h2>
        <Heatmap dailies={dailies} />
      </div>

      {/* 24h window timeline */}
      {snapshots24h.length > 0 && (
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            5-hour session utilization — last 24h
          </h2>
          <WindowTimeline snapshots={snapshots24h} />
        </div>
      )}

      {/* Model mix for today */}
      {todaySummary?.model_mix && (
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-3 text-sm font-medium text-[#737373]">
            Model mix — today
          </h2>
          <div className="flex gap-4">
            {Object.entries(todaySummary.model_mix)
              .sort(([, a], [, b]) => b - a)
              .map(([model, share]) => (
                <div key={model} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        model === "Opus"
                          ? "#a855f7"
                          : model === "Sonnet"
                          ? "#3b82f6"
                          : "#22c55e",
                    }}
                  />
                  <span className="text-sm">
                    {model}{" "}
                    <span className="text-[#737373]">
                      {(share * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
