const pad = (n: number) => String(n).padStart(2, '0');

/** The user's calendar date as YYYY-MM-DD, in their own timezone. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a YYYY-MM-DD string as a local calendar date (not UTC midnight). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return parseLocalDate(value).toLocaleDateString(undefined, options);
}

export function formatRelativeDay(value: string): string {
  const today = localDate();
  const yesterday = localDate(new Date(Date.now() - 86_400_000));
  if (value === today) return 'Today';
  if (value === yesterday) return 'Yesterday';
  return formatDay(value, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes} min` : `${minutes}m ${pad(seconds)}s`;
}
