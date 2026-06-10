"use client";

import { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  getSnapshotsSince,
  getTokenBuckets,
  type UsageSnapshot,
  type TokenBucket,
} from "@/lib/queries";

interface CorrelationPoint {
  time: string;
  tokens: number;
  deltaPct: number;
  isPhantom: boolean; // % moved with zero CLI tokens
}

interface RatioPoint {
  time: string;
  ratio: number; // tokens per percentage point
}

export default function CorrelationPage() {
  const [points, setPoints] = useState<CorrelationPoint[]>([]);
  const [ratioData, setRatioData] = useState<RatioPoint[]>([]);
  const [phantomCount, setPhantomCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    const hours = days * 24;
    Promise.all([getSnapshotsSince(hours), getTokenBuckets(days)]).then(
      ([snapshots, buckets]) => {
        const { correlationPoints, ratioPoints, phantoms } = buildCorrelation(
          snapshots,
          buckets
        );
        setPoints(correlationPoints);
        setRatioData(ratioPoints);
        setPhantomCount(phantoms);
        setLoading(false);
      }
    );
  }, [days]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-[#737373]">
        Loading...
      </div>
    );
  }

  const validPoints = points.filter((p) => p.deltaPct > 0 && p.tokens > 0);
  const avgRatio =
    validPoints.length > 0
      ? validPoints.reduce((s, p) => s + p.tokens / p.deltaPct, 0) /
        validPoints.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Correlation</h1>
        <div className="flex gap-2 text-sm">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded ${
                days === d
                  ? "bg-[#262626] text-[#e5e5e5]"
                  : "text-[#737373] hover:text-[#e5e5e5]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-4">
          <p className="text-xs text-[#737373] mb-1">Avg tokens per %point</p>
          <p className="text-2xl font-mono font-semibold">
            {formatTokens(avgRatio)}
          </p>
          <p className="text-xs text-[#737373] mt-1">
            across {validPoints.length} data points
          </p>
        </div>
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-4">
          <p className="text-xs text-[#737373] mb-1">Phantom % changes</p>
          <p className="text-2xl font-mono font-semibold text-[#f97316]">
            {phantomCount}
          </p>
          <p className="text-xs text-[#737373] mt-1">
            API % moved with zero CLI tokens
          </p>
        </div>
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-4">
          <p className="text-xs text-[#737373] mb-1">Multi-surface share</p>
          <p className="text-2xl font-mono font-semibold text-[#f97316]">
            {points.length > 0
              ? ((phantomCount / points.filter((p) => p.deltaPct > 0).length) * 100).toFixed(0)
              : 0}
            %
          </p>
          <p className="text-xs text-[#737373] mt-1">
            of % increases from other Claude surfaces
          </p>
        </div>
      </div>

      {/* Scatter: tokens vs % change */}
      <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#737373]">
          CLI tokens vs API % change per snapshot interval
        </h2>
        {validPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="deltaPct"
                name="% change"
                tick={{ fill: "#737373", fontSize: 10 }}
                label={{
                  value: "API % change",
                  fill: "#525252",
                  fontSize: 11,
                  position: "insideBottom",
                  offset: -5,
                }}
              />
              <YAxis
                dataKey="tokens"
                name="tokens"
                tick={{ fill: "#737373", fontSize: 10 }}
                tickFormatter={(v) => formatTokens(v)}
                width={55}
                label={{
                  value: "CLI tokens",
                  fill: "#525252",
                  fontSize: 11,
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #262626",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  name === "tokens"
                    ? formatTokens(Number(value))
                    : `${Number(value).toFixed(1)}%`,
                  name === "tokens" ? "CLI tokens" : "API % change",
                ]}
              />
              <Scatter data={validPoints}>
                {validPoints.map((p, i) => (
                  <Cell
                    key={i}
                    fill={p.isPhantom ? "#f97316" : "#a855f7"}
                    opacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#737373] text-sm py-8 text-center">
            Not enough data points with both token and % changes
          </p>
        )}
        <p className="mt-2 text-xs text-[#737373]">
          Purple = CLI-driven % change. Orange = phantom (other Claude surface).
          Points near the X-axis with high % = web/desktop usage.
        </p>
      </div>

      {/* Rolling ratio over time */}
      {ratioData.length > 1 && (
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            Tokens per percentage point over time (rolling)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ratioData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="time"
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
                formatter={(value) => [
                  formatTokens(Number(value)),
                  "Tokens per %pt",
                ]}
              />
              {avgRatio > 0 && (
                <ReferenceLine
                  y={avgRatio}
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  opacity={0.5}
                  label={{
                    value: `avg ${formatTokens(avgRatio)}`,
                    fill: "#a855f7",
                    fontSize: 10,
                    position: "right",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="ratio"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-[#737373]">
            Stable line = consistent quota. Sudden drops may indicate quota
            tightening or model changes. Spikes = cache-heavy sessions
            (cheaper per %).
          </p>
        </div>
      )}
    </div>
  );
}

function buildCorrelation(
  snapshots: UsageSnapshot[],
  buckets: TokenBucket[]
): {
  correlationPoints: CorrelationPoint[];
  ratioPoints: RatioPoint[];
  phantoms: number;
} {
  // Build a time-indexed token lookup from buckets
  // For each consecutive snapshot pair, compute delta% and sum tokens in that interval
  const correlationPoints: CorrelationPoint[] = [];
  const ratioPoints: RatioPoint[] = [];
  let phantoms = 0;

  // Index buckets by hour for fast lookup
  const bucketByHour = new Map<string, TokenBucket>();
  for (const b of buckets) {
    const hourKey = b.bucket_hour.slice(0, 13); // YYYY-MM-DDTHH
    bucketByHour.set(hourKey, b);
  }

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    const prevPct = prev.five_hour_pct ?? 0;
    const currPct = curr.five_hour_pct ?? 0;
    const deltaPct = currPct - prevPct;

    // Skip resets (deltaPct < 0)
    if (deltaPct < 0) continue;
    // Skip no-change
    if (deltaPct === 0) continue;

    // Find tokens between these two timestamps
    const prevTime = new Date(prev.fetched_at);
    const currTime = new Date(curr.fetched_at);

    let tokenSum = 0;
    for (const b of buckets) {
      const bTime = new Date(b.bucket_hour);
      if (bTime >= prevTime && bTime <= currTime) {
        tokenSum +=
          b.input_tokens +
          b.output_tokens +
          b.cache_read_tokens +
          b.cache_write_tokens;
      }
    }

    const isPhantom = tokenSum === 0 && deltaPct > 0;
    if (isPhantom) phantoms++;

    const timeLabel = currTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    correlationPoints.push({
      time: timeLabel,
      tokens: tokenSum,
      deltaPct,
      isPhantom,
    });

    if (tokenSum > 0 && deltaPct > 0) {
      ratioPoints.push({
        time: timeLabel,
        ratio: tokenSum / deltaPct,
      });
    }
  }

  return { correlationPoints, ratioPoints, phantoms };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
