import { describe, expect, it } from 'vitest';
import { chooseClimber, pickClimber } from '../src/analysis/pickClimber';
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

describe('chooseClimber (whole clip, D39)', () => {
  const sr = 15;
  const n = 15 * 20; // 20 s
  // A seated spectator near the camera: big torso, low in the frame, only jitter.
  const spectator = (i: number) => person(0.8 + 0.002 * Math.sin(i), 0.85, 0.12);
  // The climber: small torso, climbing up and across the wall (about 0.5 torso lengths / s).
  const climber = (i: number) => person(0.3 + (0.2 * i) / n, 0.7 - (0.3 * i) / n, 0.05);

  it('prefers the moving climber over a larger, static spectator', () => {
    const cands = Array.from({ length: n }, (_, i) => [spectator(i), climber(i)]);
    const out = chooseClimber(cands, dims, sr);
    expect(out.every((lm, i) => lm === cands[i][1])).toBe(true);
  });

  it('returns null when only the static spectator is seen', () => {
    const cands = Array.from({ length: n }, (_, i) => (i >= 150 && i < 200 ? [spectator(i)] : [spectator(i), climber(i)]));
    const out = chooseClimber(cands, dims, sr);
    expect(out[170]).toBeNull();
    expect(out[100]).toBe(cands[100][1]);
    expect(out[250]).toBe(cands[250][1]);
  });

  it('keeps a lone person even when nobody moves much', () => {
    const cands = Array.from({ length: n }, (_, i) => [spectator(i)]);
    const out = chooseClimber(cands, dims, sr);
    expect(out.every((lm, i) => lm === cands[i][0])).toBe(true);
  });

  it('frames with nobody are null', () => {
    const cands = Array.from({ length: n }, (_, i) => (i < 30 ? [] : [climber(i)]));
    const out = chooseClimber(cands, dims, sr);
    expect(out[10]).toBeNull();
    expect(out[40]).toBe(cands[40][0]);
  });
});
