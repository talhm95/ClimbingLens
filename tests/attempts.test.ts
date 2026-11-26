import { describe, expect, it } from 'vitest';
import { computeMetrics, normalizeAttempts, restAt } from '../src/analysis/metrics';

describe('normalizeAttempts', () => {
  it('an empty list is the whole video', () => {
    expect(normalizeAttempts([], 10)).toEqual([{ start: 0, end: 10 }]);
  });
  it('swaps a reversed attempt', () => {
    expect(normalizeAttempts([{ start: 5, end: 2 }], 10)).toEqual([{ start: 2, end: 5 }]);
  });
  it('merges overlapping attempts', () => {
    expect(normalizeAttempts([{ start: 0, end: 4 }, { start: 3, end: 6 }], 10)).toEqual([{ start: 0, end: 6 }]);
  });
  it('clamps to the video', () => {
    expect(normalizeAttempts([{ start: 8, end: 12 }], 10)).toEqual([{ start: 8, end: 10 }]);
  });
  it('drops zero-length attempts and sorts', () => {
    expect(normalizeAttempts([{ start: 7, end: 9 }, { start: 3, end: 3 }, { start: 1, end: 2 }], 10)).toEqual([
      { start: 1, end: 2 },
      { start: 7, end: 9 },
    ]);
  });
  it('only zero-length attempts fall back to the whole video', () => {
    expect(normalizeAttempts([{ start: 3, end: 3 }], 10)).toEqual([{ start: 0, end: 10 }]);
  });
});

describe('attempt metrics', () => {
  it('durations and rests', () => {
    const m = computeMetrics([], [{ start: 0, end: 20 }, { start: 50, end: 80 }]);
    expect(m.attempts.map((a) => a.duration)).toEqual([20, 30]);
    expect(m.rests.map((r) => r.duration)).toEqual([30]);
  });
});

describe('restAt', () => {
  const attempts = [{ start: 0, end: 20 }, { start: 50, end: 80 }];
  it('counts up inside a rest', () => {
    expect(restAt(attempts, 30)).toBe(10);
  });
  it('is null inside an attempt', () => {
    expect(restAt(attempts, 60)).toBeNull();
  });
  it('is null before the first attempt', () => {
    expect(restAt([{ start: 5, end: 9 }], 2)).toBeNull();
  });
  it('counts up after the last attempt', () => {
    expect(restAt(attempts, 85)).toBe(5);
  });
});
