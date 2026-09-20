import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetweenInclusive,
  isRealDate,
  minutesToClock,
  parseDateOnly,
  roundUpTo,
  todayDateOnly,
} from '../../src/utils/time.js';

describe('time helpers', () => {
  it('counts days inclusively', () => {
    expect(daysBetweenInclusive(parseDateOnly('2030-01-10'), parseDateOnly('2030-01-10'))).toBe(1);
    expect(daysBetweenInclusive(parseDateOnly('2030-01-10'), parseDateOnly('2030-01-13'))).toBe(4);
  });

  it('adds days across a month boundary', () => {
    expect(addDays(parseDateOnly('2030-01-31'), 1).toISOString()).toBe('2030-02-01T00:00:00.000Z');
  });

  it('rejects impossible calendar dates', () => {
    expect(isRealDate('2030-02-30')).toBe(false);
    expect(isRealDate('2030-02-28')).toBe(true);
  });

  it('formats minutes as HH:mm', () => {
    expect(minutesToClock(9 * 60)).toBe('09:00');
    expect(minutesToClock(13 * 60 + 5)).toBe('13:05');
  });

  it('rounds up to the next step', () => {
    expect(roundUpTo(17, 5)).toBe(20);
    expect(roundUpTo(20, 5)).toBe(20);
    expect(roundUpTo(0, 5)).toBe(0);
  });

  it('builds today from the local calendar date', () => {
    expect(todayDateOnly(new Date(2030, 0, 5, 23, 59))).toBe('2030-01-05');
  });
});
