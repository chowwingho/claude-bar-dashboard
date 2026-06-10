"use client";

interface Props {
  label: string;
  value: string;
  sub?: string;
}

export function StatsCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#141414] p-4">
      <p className="text-xs text-[#737373] mb-1">{label}</p>
      <p className="text-2xl font-semibold font-mono tracking-tight">{value}</p>
      {sub && <p className="text-xs text-[#737373] mt-1">{sub}</p>}
    </div>
  );
}
