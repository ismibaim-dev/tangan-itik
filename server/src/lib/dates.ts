// Calendar-day helpers working on YYYY-MM-DD strings. Clients send their own local date,
// so streaks and "today" follow the user's day rather than the server's timezone.
import { z } from 'zod';

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Reads a ?today=YYYY-MM-DD query value, falling back to the server's UTC date. */
export function todayFrom(value: unknown): string {
  const parsed = localDateSchema.safeParse(value);
  return parsed.success && !Number.isNaN(Date.parse(parsed.data)) ? parsed.data : utcToday();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Consecutive days ending today (or yesterday, so an unfinished today doesn't break the streak). */
export function currentStreak(activeDates: Iterable<string>, today: string): number {
  const days = new Set(activeDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(activeDates: Iterable<string>): number {
  const sorted = [...new Set(activeDates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const date of sorted) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
