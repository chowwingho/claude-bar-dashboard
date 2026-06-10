"use client";

import { useEffect, useState } from "react";
import { getSnapshotsSince, type UsageSnapshot } from "@/lib/queries";
import { WindowTimeline } from "@/components/WindowTimeline";

export default function TimelinePage() {
  const [snapshots, setSnapshots] = useState<UsageSnapshot[]>([]);
  const [hours, setHours] = useState(72);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSnapshotsSince(hours).then((data) => {
      setSnapshots(data);
      setLoading(false);
    });
  }, [hours]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Session Timeline</h1>
        <div className="flex gap-2 text-sm">
          {[24, 72, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1 rounded ${
                hours === h
                  ? "bg-[#262626] text-[#e5e5e5]"
                  : "text-[#737373] hover:text-[#e5e5e5]"
              }`}
            >
              {h === 24 ? "24h" : h === 72 ? "3d" : "7d"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-[#737373]">
          Loading...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-[#737373]">
          No snapshot data for this period
        </div>
      ) : (
        <div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-medium text-[#737373]">
            5-hour session utilization — {snapshots.length} data points
          </h2>
          <WindowTimeline snapshots={snapshots} />
        </div>
      )}
    </div>
  );
}
