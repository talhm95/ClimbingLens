import { describe, expect, it } from 'vitest';
import { heatmap } from '../src/analysis/heatmap';
import type { Contact } from '../src/types';
import { still, synthTrack } from './fixtures/synth';

const foot = (limb: 'LF' | 'RF' | 'RH', start: number, end: number): Contact => ({
  limb, holdId: 1, start, end, pos: { x: 0, y: 0 }, corrections: [], attempt: 0,
});

describe('heatmap', () => {
  it('a foot still for 2 s at one cell makes that cell 1 and empty cells 0', () => {
    const track = synthTrack({ duration: 2, limbs: { LF: still(0.51, 0.51, 0, 2) } });
    const h = heatmap(track, [foot('LF', 0, 2)], 10, 10);
    expect(h).toHaveLength(100);
    expect(h[5 * 10 + 5]).toBe(1);
    expect(h[0]).toBe(0);
    expect([...h].filter((v) => v > 0)).toHaveLength(1);
  });

  it('a longer stay is stronger than a shorter one', () => {
    const track = synthTrack({
      duration: 3,
      limbs: { LF: still(0.15, 0.15, 0, 3), RF: still(0.85, 0.85, 0, 3) },
    });
    const h = heatmap(track, [foot('LF', 0, 2), foot('RF', 0, 0.5)], 10, 10);
    expect(h[1 * 10 + 1]).toBe(1);
    expect(h[8 * 10 + 8]).toBeGreaterThan(0);
    expect(h[8 * 10 + 8]).toBeLessThan(0.5);
  });

  it('hand contacts do not count, and no foot contacts gives all zeros', () => {
    const track = synthTrack({ duration: 2, limbs: { RH: still(0.5, 0.5, 0, 2) } });
    const h = heatmap(track, [foot('RH', 0, 2)], 10, 10);
    expect([...h].every((v) => v === 0)).toBe(true);
  });
});
