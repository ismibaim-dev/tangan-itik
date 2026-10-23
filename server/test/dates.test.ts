import { describe, expect, it } from 'vitest';
import { addDays, currentStreak, longestStreak, todayFrom } from '../src/lib/dates.js';

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts the current streak', () => {
    expect(currentStreak([], '2026-03-10')).toBe(0);
    expect(currentStreak(['2026-03-08', '2026-03-09', '2026-03-10'], '2026-03-10')).toBe(3);
    expect(currentStreak(['2026-03-08', '2026-03-09'], '2026-03-10')).toBe(2);
    expect(currentStreak(['2026-03-07', '2026-03-08'], '2026-03-10')).toBe(0);
  });

  it('finds the longest streak', () => {
    expect(longestStreak(['2026-03-01', '2026-03-02', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-02'])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });

  it('falls back to the server date for bad input', () => {
    expect(todayFrom('2026-03-10')).toBe('2026-03-10');
    expect(todayFrom('2026-13-45')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayFrom('2026-13-45')).not.toBe('2026-13-45');
    expect(todayFrom(undefined)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
