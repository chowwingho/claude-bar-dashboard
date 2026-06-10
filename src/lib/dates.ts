/**
 * Date utilities — all dates use America/New_York (EST/EDT) to match
 * the daily_summaries.day values from sync.py, which uses local time.
 */

const TZ = "America/New_York";

/**
 * Get today's date as YYYY-MM-DD in Eastern time.
 * Handles the UTC/local mismatch that causes the heatmap to show
 * a day behind after 8 PM EDT (when UTC rolls to the next day).
 */
export function todayET(): string {
  return formatDateET(new Date());
}

/**
 * Format a Date as YYYY-MM-DD in Eastern time.
 */
export function formatDateET(date: Date): string {
  // Intl.DateTimeFormat gives us the date in the target timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA format is YYYY-MM-DD
}

/**
 * Get a date N days ago as YYYY-MM-DD in Eastern time.
 */
export function daysAgoET(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDateET(d);
}
