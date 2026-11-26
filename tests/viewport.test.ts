import { describe, expect, it } from 'vitest';
import { computeViewport, toCanvas, toNorm } from '../src/overlay/viewport';

describe('viewport', () => {
  it('letterboxes a 16:9 video at the sides of a 2:1 canvas', () => {
    const v = computeViewport(1000, 500, 1920, 1080);
    expect(v.oy).toBe(0);
    expect(v.h).toBe(500);
    expect(v.w).toBeCloseTo(888.888, 2);
    expect(v.ox).toBeCloseTo(55.555, 2);
  });

  it('toNorm of a point in the black bars is null', () => {
    const v = computeViewport(1000, 500, 1920, 1080);
    expect(toNorm(v, { x: 20, y: 250 })).toBeNull();
    expect(toNorm(v, { x: 980, y: 250 })).toBeNull();
  });

  it('toCanvas(toNorm(p)) round-trips', () => {
    const v = computeViewport(1000, 500, 1920, 1080);
    const p = { x: 300, y: 120 };
    const n = toNorm(v, p)!;
    const back = toCanvas(v, n);
    expect(back.x).toBeCloseTo(p.x, 6);
    expect(back.y).toBeCloseTo(p.y, 6);
  });
});
