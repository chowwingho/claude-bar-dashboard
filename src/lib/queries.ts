import { supabase } from "./supabase";
import { daysAgoET } from "./dates";

export interface UsageSnapshot {
  id: number;
  fetched_at: string;
  five_hour_pct: number | null;
  five_hour_resets_at: string | null;
  seven_day_pct: number | null;
  seven_day_resets_at: string | null;
  seven_day_sonnet_pct: number | null;
  seven_day_opus_pct: number | null;
  extra_usage_pct: number | null;
  extra_used_cents: number | null;
  extra_limit_cents: number | null;
  extra_currency: string;
}

export interface DailySummary {
  id: number;
  day: string;
  total_tokens: number;
  total_turns: number;
  total_cost_cents: number;
  model_mix: Record<string, number> | null;
  tool_mix: Record<string, number> | null;
  project_mix: Record<string, number> | null;
  peak_hour_tokens: number | null;
  peak_hour: number | null;
  off_peak_tokens: number | null;
  peak_tokens: number | null;
  session_count: number | null;
  peak_5h_pct: number | null;
  windows_reset: number | null;
  driver: string | null;
  driver_confidence: string | null;
}

export interface TokenBucket {
  id: number;
  bucket_hour: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  turns: number;
  cost_cents: number;
  model_mix: Record<string, number> | null;
  tool_mix: Record<string, number> | null;
  project_mix: Record<string, number> | null;
}

export async function getLatestSnapshot(): Promise<UsageSnapshot | null> {
  const { data } = await supabase
    .from("public_usage_snapshots")
    .select("*")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getDailySummaries(
  days: number = 30
): Promise<DailySummary[]> {
  const sinceDate = daysAgoET(days); // Eastern time to match sync.py day boundaries
  const { data } = await supabase
    .from("public_daily_summaries")
    .select("*")
    .gte("day", sinceDate)
    .order("day", { ascending: true });
  return data || [];
}

export async function getTokenBuckets(
  days: number = 7
): Promise<TokenBucket[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("public_token_buckets")
    .select("*")
    .gte("bucket_hour", since.toISOString())
    .order("bucket_hour", { ascending: true });
  return data || [];
}

export async function getSnapshotsSince(
  hours: number = 24
): Promise<UsageSnapshot[]> {
  const since = new Date();
  since.setTime(since.getTime() - hours * 60 * 60 * 1000);
  const { data } = await supabase
    .from("public_usage_snapshots")
    .select("*")
    .gte("fetched_at", since.toISOString())
    .order("fetched_at", { ascending: true });
  return data || [];
}

export async function getLastSyncTime(): Promise<string | null> {
  const { data } = await supabase
    .from("sync_runs")
    .select("finished_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  return data?.finished_at || null;
}

/**
 * Get all tool usage across daily summaries, aggregated.
 */
export function aggregateToolMix(
  dailies: DailySummary[]
): { name: string; count: number }[] {
  const totals: Record<string, number> = {};
  for (const d of dailies) {
    if (!d.tool_mix) continue;
    for (const [tool, count] of Object.entries(d.tool_mix)) {
      totals[tool] = (totals[tool] || 0) + count;
    }
  }
  return Object.entries(totals)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute cache efficiency per day from token buckets.
 */
export function computeCacheEfficiency(
  buckets: TokenBucket[]
): { day: string; cachePct: number; tokens: number }[] {
  const byDay: Record<
    string,
    { cacheRead: number; input: number; cacheWrite: number }
  > = {};
  for (const b of buckets) {
    const day = b.bucket_hour.slice(0, 10);
    if (!byDay[day]) byDay[day] = { cacheRead: 0, input: 0, cacheWrite: 0 };
    byDay[day].cacheRead += b.cache_read_tokens;
    byDay[day].input += b.input_tokens;
    byDay[day].cacheWrite += b.cache_write_tokens;
  }
  return Object.entries(byDay)
    .map(([day, v]) => {
      const inputSide = v.input + v.cacheRead + v.cacheWrite;
      return {
        day,
        cachePct: inputSide > 0 ? (v.cacheRead / inputSide) * 100 : 0,
        tokens: v.input + v.cacheRead + v.cacheWrite,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}
