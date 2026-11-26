import { describe, expect, it } from 'vitest';
import { offBalanceFraction, weightOffset } from '../src/analysis/weightShift';
import { WEIGHT_TOL } from '../src/config';
import type { Contact } from '../src/types';
import { still, synthTrack } from './fixtures/synth';

// Pelvis at x 0.5; S = 200 px on a 1000 px wide video, so 0.08 units = 0.4 S.
const c = (limb: 'LF' | 'RF', start: number, end: number): Contact => ({
  limb, holdId: 1, start, end, pos: { x: 0, y: 0 }, corrections: [], attempt: 0,
});

describe('weightOffset', () => {
  it('foot straight under the pelvis: offset 0, within tolerance', () => {
    const track = synthTrack({ duration: 2, limbs: { LF: still(0.5, 0.9, 0, 2) } });
    const w = weightOffset(track, [c('LF', 0, 2)], 1)!;
    expect(w.foot).toBe('LF');
    expect(w.offset).toBeCloseTo(0, 6);
    expect(Math.abs(w.offset)).toBeLessThanOrEqual(WEIGHT_TOL);
  });

  it('pelvis 0.4 S to the side of the foot is out of tolerance', () => {
    const track = synthTrack({ duration: 2, limbs: { LF: still(0.42, 0.9, 0, 2) } });
    const w = weightOffset(track, [c('LF', 0, 2)], 1)!;
    expect(w.offset).toBeCloseTo(0.4, 6);
    expect(Math.abs(w.offset)).toBeGreaterThan(WEIGHT_TOL);
  });

  it('no foot in contact gives null', () => {
    const track = synthTrack({ duration: 2, limbs: { LF: still(0.5, 0.9, 0, 2) } });
    expect(weightOffset(track, [c('LF', 0, 0.5)], 1)).toBeNull();
  });

  it('with both feet in contact the lower foot supports', () => {
    const track = synthTrack({ duration: 2, limbs: { LF: still(0.4, 0.95, 0, 2), RF: still(0.6, 0.8, 0, 2) } });
    expect(weightOffset(track, [c('LF', 0, 2), c('RF', 0, 2)], 1)!.foot).toBe('LF');
  });
});

describe('offBalanceFraction', () => {
  it('share of supported samples inside attempts that are out of tolerance', () => {
    // Foot under the pelvis for 0-1 s, then 0.4 S off to the side for 1-2 s.
    const track = synthTrack({
      duration: 2,
      limbs: { LF: [{ t: 0, x: 0.5, y: 0.9 }, { t: 0.999, x: 0.5, y: 0.9 }, { t: 1, x: 0.42, y: 0.9 }, { t: 2, x: 0.42, y: 0.9 }] },
    });
    const f = offBalanceFraction(track, [c('LF', 0, 2)], [{ start: 0, end: 2 }]);
    expect(f).toBeGreaterThan(0.4);
    expect(f).toBeLessThan(0.6);
  });

  it('no support at all gives 0', () => {
    const track = synthTrack({ duration: 2, limbs: {} });
    expect(offBalanceFraction(track, [], [{ start: 0, end: 2 }])).toBe(0);
  });
});
