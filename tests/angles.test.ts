import { describe, expect, it } from 'vitest';
import { angle2D, elbowAngles } from '../src/analysis/angles';
import type { Landmark } from '../src/types';

const square = { videoW: 1000, videoH: 1000 };

describe('angle2D', () => {
  it('a right angle is 90', () => {
    expect(angle2D({ x: 0.5, y: 0.4 }, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, square)).toBeCloseTo(90, 6);
  });

  it('a straight arm is 180', () => {
    expect(angle2D({ x: 0.4, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }, square)).toBeCloseTo(180, 6);
  });

  it('a non-square video does not distort it (measured in pixels)', () => {
    // On a 2000×1000 video, 0.05 units across = 100 px = 0.1 units down: a real right angle.
    const wide = { videoW: 2000, videoH: 1000 };
    expect(angle2D({ x: 0.5, y: 0.4 }, { x: 0.5, y: 0.5 }, { x: 0.55, y: 0.5 }, wide)).toBeCloseTo(90, 6);
    // And a 45° bend measured in pixels, not in normalized units.
    expect(angle2D({ x: 0.45, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.55, y: 0.4 }, wide)).toBeCloseTo(135, 6);
  });
});

describe('elbowAngles', () => {
  const lm = (): Landmark[] => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 1 }));

  it('left 11-13-15 and right 12-14-16', () => {
    const l = lm();
    l[11] = { x: 0.4, y: 0.4, v: 1 }; l[13] = { x: 0.4, y: 0.5, v: 1 }; l[15] = { x: 0.5, y: 0.5, v: 1 };
    l[12] = { x: 0.6, y: 0.4, v: 1 }; l[14] = { x: 0.6, y: 0.5, v: 1 }; l[16] = { x: 0.6, y: 0.6, v: 1 };
    const a = elbowAngles(l, square);
    expect(a.left).toBeCloseTo(90, 6);
    expect(a.right).toBeCloseTo(180, 6);
  });

  it('a side with a hidden landmark is null', () => {
    const l = lm();
    l[15].v = 0.1;
    expect(elbowAngles(l, square).left).toBeNull();
  });
});
