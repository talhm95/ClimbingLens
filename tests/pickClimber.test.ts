import { describe, expect, it } from 'vitest';
import { pickClimber } from '../src/analysis/pickClimber';
import type { Landmark } from '../src/types';

const dims = { videoW: 1000, videoH: 1000 };

/** A person with pelvis at (x, y) and torso length L (normalized; shoulders straight above). */
function person(x: number, y: number, L: number): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x, y, v: 1 }));
  lm[11] = { x: x - 0.02, y: y - L, v: 1 };
  lm[12] = { x: x + 0.02, y: y - L, v: 1 };
  lm[23] = { x: x - 0.02, y, v: 1 };
  lm[24] = { x: x + 0.02, y, v: 1 };
  return lm;
}

describe('pickClimber', () => {
  it('returns null for no candidates', () => {
    expect(pickClimber([], null, dims)).toBeNull();
  });

  it('keeps the only candidate when there is no previous pelvis', () => {
    const a = person(0.5, 0.6, 0.2);
    expect(pickClimber([a], null, dims)).toBe(a);
  });

  it('keeps the longest torso when there is no previous pelvis', () => {
    const small = person(0.3, 0.6, 0.1);
    const big = person(0.7, 0.6, 0.2);
    expect(pickClimber([small, big], null, dims)).toBe(big);
  });

  it('keeps the candidate nearest the previous pelvis, even with a shorter torso', () => {
    const near = person(0.3, 0.6, 0.1);
    const far = person(0.7, 0.6, 0.2);
    expect(pickClimber([far, near], { x: 0.32, y: 0.6 }, dims)).toBe(near);
  });

  it('rejects a candidate more than CLIMBER_MAX_JUMP torso lengths away', () => {
    const far = person(0.8, 0.6, 0.2);
    expect(pickClimber([far], { x: 0.3, y: 0.6 }, dims)).toBeNull();
  });
});
