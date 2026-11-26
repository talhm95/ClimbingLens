import { describe, expect, it } from 'vitest';
import { buildAnchors, firstTouches, timeMap } from '../src/analysis/alignment';
import type { Contact, Take } from '../src/types';
import { takeOf } from './fixtures/take';

const touch = (holdId: number | null, start: number, attempt = 0): Contact => ({
  limb: 'RH', holdId, start, end: start + 0.5, pos: { x: 0, y: 0 }, corrections: [], attempt,
});
const take = (contacts: Contact[], end: number): Take =>
  takeOf(null, [], { contacts, attempts: [{ start: 0, end }], duration: end + 5 });

describe('firstTouches', () => {
  it('keeps the earliest start per hold in the attempt and ignores smears', () => {
    const m = firstTouches([touch(1, 3), touch(1, 1), touch(null, 0.5), touch(2, 4, 1)]);
    expect([...m.entries()]).toEqual([[1, 1]]);
  });
});

describe('buildAnchors and timeMap', () => {
  const A = take([touch(1, 1), touch(2, 3), touch(3, 5)], 6);
  const B = take([touch(1, 2), touch(2, 6), touch(3, 8)], 10);

  it('anchors at attempt start, each shared hold, and attempt end', () => {
    expect(buildAnchors(A, B)).toEqual([
      { a: 0, b: 0 }, { a: 1, b: 2 }, { a: 3, b: 6 }, { a: 5, b: 8 }, { a: 6, b: 10 },
    ]);
  });

  it('maps B time to A time piecewise-linearly, clamped at the ends', () => {
    const f = timeMap(buildAnchors(A, B));
    expect(f(4)).toBeCloseTo(2, 9);
    expect(f(6)).toBeCloseTo(3, 9);
    expect(f(-1)).toBe(0);
    expect(f(12)).toBe(6);
  });

  it('drops anchors that break monotonic order', () => {
    const B2 = take([touch(1, 2), touch(3, 5), touch(2, 7)], 10);
    const anchors = buildAnchors(A, B2);
    expect(anchors).toHaveLength(4);
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i].a).toBeGreaterThan(anchors[i - 1].a);
      expect(anchors[i].b).toBeGreaterThan(anchors[i - 1].b);
    }
  });

  it('falls back to linear stretch', () => {
    const B3 = take([touch(7, 2)], 10);
    const anchors = buildAnchors(A, B3);
    expect(anchors).toHaveLength(2);
    expect(timeMap(anchors)(5)).toBeCloseTo(3, 9);
  });
});
