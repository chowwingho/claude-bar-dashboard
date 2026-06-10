"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { UsageSnapshot } from "@/lib/queries";

interface Props {
  snapshots: UsageSnapshot[];
}

export function WindowTimeline({ snapshots }: Props) {
  // Group snapshots by window (identified by resets_at)
  // Detect window boundaries where resets_at changes or pct drops to 0
  const points = snapshots.map((s, i) => {
    const prev = i > 0 ? snapshots[i - 1] : null;
    const isReset =
      prev &&
      s.five_hour_pct !== null &&
      prev.five_hour_pct !== null &&
      (s.five_hour_pct < prev.five_hour_pct - 5 ||
        s.five_hour_resets_at !== prev.five_hour_resets_at);

    return {
      time: new Date(s.fetched_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      timestamp: new Date(s.fetched_at).getTime(),
      pct: s.five_hour_pct ?? 0,
      isReset,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="time"
          tick={{ fill: "#737373", fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#737373", fontSize: 11 }}
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
          formatter={(value) => [`${value}%`, "5h session"]}
        />
        {/* Warning thresholds */}
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
        <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" opacity={0.3} />
        <Line
          type="monotone"
          dataKey="pct"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#a855f7" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
