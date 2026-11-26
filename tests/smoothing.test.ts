import { describe, expect, it } from 'vitest';
import { gaussianSmooth, interpolateGaps } from '../src/analysis/smoothing';
import type { Vec } from '../src/types';

const xs = (vals: (number | null)[]): (Vec | null)[] => vals.map((x) => (x === null ? null : { x, y: 0 }));

describe('interpolateGaps', () => {
  it('fills 2 nulls linearly when the known neighbours are 0.2 s apart', () => {
    const out = interpolateGaps(xs([0, null, null, 3]), 1 / 15, 0.3);
    expect(out.map((p) => p?.x)).toEqual([0, 1, 2, 3]);
  });

  it('leaves 6 nulls (neighbours 0.47 s apart) as nulls', () => {
    const out = interpolateGaps(xs([0, null, null, null, null, null, null, 7]), 1 / 15, 0.3);
    expect(out.slice(1, 7).every((p) => p === null)).toBe(true);
    expect(out[0]?.x).toBe(0);
    expect(out[7]?.x).toBe(7);
  });

  it('leaves leading and trailing nulls alone', () => {
    const out = interpolateGaps(xs([null, 1, 2, null]), 1 / 15, 0.3);
    expect(out[0]).toBeNull();
    expect(out[3]).toBeNull();
  });
});

describe('gaussianSmooth', () => {
  it('sigma 1 on [0,0,3,0,0] gives a symmetric bump with middle ~1.208', () => {
    const out = gaussianSmooth(xs([0, 0, 3, 0, 0]), 1).map((p) => p!.x);
    expect(out[2]).toBeCloseTo(3 / (1 + 2 * (Math.exp(-0.5) + Math.exp(-2))), 3);
    expect(out[2]).toBeCloseTo(1.208, 2);
    expect(out[1]).toBeCloseTo(out[3], 9);
    expect(out[0]).toBeCloseTo(out[4], 9);
  });

  it('smooths each contiguous run separately: nothing leaks across a gap', () => {
    const out = gaussianSmooth(xs([0, 0, null, 10, 10]), 1);
    expect(out.map((p) => p?.x ?? null)).toEqual([0, 0, null, 10, 10]);
  });
});
