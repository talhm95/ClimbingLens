import { describe, expect, it } from 'vitest';
import { analyzeTake } from '../src/analysis/analyzeTake';
import { detectAttempts } from '../src/analysis/autoAttempts';
import type { Contact, Hold, Limb } from '../src/types';
import { takeOf } from './fixtures/take';
import { still, synthTrack } from './fixtures/synth';

const HOLDS: Hold[] = [
  { id: 1, x: 0.5, y: 0.8 }, // foothold
  { id: 2, x: 0.6, y: 0.8 }, // foothold
  { id: 3, x: 0.5, y: 0.5 }, // handhold
  { id: 9, x: 0.5, y: 0.1 }, // top
];
const TOL = 0.1;
const c = (limb: Limb, holdId: number | null, start: number, end: number): Contact => ({
  limb, holdId, start, end, pos: { x: 0, y: 0 }, corrections: [], attempt: -1,
});
const track = (duration: number) => synthTrack({ duration, limbs: {} });
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(TOL);

/** Feet on 1 and 2, right hand on 3, from t0; hands on the top hold from topAt (if given). */
function climb(t0: number, end: number, topAt?: number): Contact[] {
  const cs = [c('LF', 1, t0, end), c('RF', 2, t0, end), c('RH', 3, t0, topAt ? topAt - 1 : end)];
  if (topAt) cs.push(c('LH', 9, topAt, end), c('RH', 9, topAt, end));
  return cs;
}

describe('detectAttempts', () => {
  it('detects a topped-out attempt', () => {
    const a = detectAttempts(climb(2, 12, 10), HOLDS, track(14));
    expect(a).toHaveLength(1);
    near(a[0].start, 2);
    near(a[0].end, 10.5);
  });

  it('ends at a fall', () => {
    const a = detectAttempts(climb(2, 6), HOLDS, track(14));
    expect(a).toHaveLength(1);
    near(a[0].start, 2);
    near(a[0].end, 6);
  });

  it('finds two attempts', () => {
    const a = detectAttempts([...climb(2, 6), ...climb(20, 30, 28)], HOLDS, track(32));
    expect(a).toHaveLength(2);
    near(a[1].start, 20);
    near(a[1].end, 28.5);
  });

  it('leaky start survives a one-sample miss', () => {
    const cs = [c('LF', 1, 2, 12), c('RF', 2, 2, 2.2), c('RF', 2, 2.27, 12), c('RH', 3, 2, 12)];
    const a = detectAttempts(cs, HOLDS, track(14));
    near(a[0].start, 2);
  });

  it('no start detected gives []', () => {
    expect(detectAttempts([c('LH', 3, 1, 5), c('RH', 3, 1, 5)], HOLDS, track(8))).toEqual([]);
  });

  it('smears do not count as being on a hold', () => {
    const cs = [c('LF', null, 2, 12), c('RF', null, 2, 12), c('RH', 3, 2, 12)];
    expect(detectAttempts(cs, HOLDS, track(14))).toEqual([]);
  });

  it('does not restart while the climber is still on the wall after a top-out', () => {
    // After topping out at 10.5 s the feet stay on 1 and 2 and the hands on the top hold until 12 s.
    const a = detectAttempts(climb(2, 12, 10), HOLDS, track(14));
    expect(a).toHaveLength(1);
  });

  it('the video ending inside an attempt ends it at the last on-hold sample', () => {
    const a = detectAttempts(climb(2, 9), HOLDS, track(9.5));
    near(a[0].end, 9);
  });
});

describe('analyzeTake and the attempt source', () => {
  const t = synthTrack({
    duration: 5,
    limbs: { LF: still(0.5, 0.8, 0, 5), RF: still(0.6, 0.8, 0, 5), RH: still(0.5, 0.5, 0, 5) },
  });

  it('manual attempts are used as marked', () => {
    const r = analyzeTake(takeOf(t, HOLDS, { attemptsSource: 'manual', attempts: [{ start: 0, end: 2 }] }));
    expect(r.attempts).toEqual([{ start: 0, end: 2 }]);
  });

  it('auto attempts are detected', () => {
    const r = analyzeTake(takeOf(t, HOLDS, { attemptsSource: 'auto', attempts: [{ start: 0, end: 2 }] }));
    expect(r.attempts).toHaveLength(1);
    expect(r.attempts[0].start).toBeLessThan(0.2);
    expect(r.attempts[0].end).toBeGreaterThan(4);
  });
});
