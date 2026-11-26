import { describe, expect, it } from 'vitest';
import { detectJumps, matchJump } from '../src/analysis/jump';
import type { Contact, Jump, Limb } from '../src/types';
import { synthTrack } from './fixtures/synth';

const c = (limb: Limb, start: number, end: number): Contact => ({
  limb, holdId: 1, start, end, pos: { x: 0, y: 0 }, corrections: [], attempt: 0,
});

describe('detectJumps', () => {
  // On the wall until 1 s, a dyno up and to the right (about 3.7 S/s) with no limb in contact,
  // and the right hand catches the next hold at 1.4 s.
  const track = synthTrack({
    duration: 3,
    limbs: {},
    pelvis: [{ t: 0, x: 0.5, y: 0.6 }, { t: 1, x: 0.5, y: 0.6 }, { t: 1.3, x: 0.6, y: 0.4 }],
  });
  const contacts = [c('LF', 0, 1), c('RF', 0, 1), c('LH', 0, 1), c('RH', 1.4, 3), c('LH', 1.6, 3)];

  it('finds one jump with its direction, speed and first landing', () => {
    const jumps = detectJumps(track, contacts, [{ start: 0, end: 3 }]);
    expect(jumps).toHaveLength(1);
    const j = jumps[0];
    expect(j.t).toBeGreaterThanOrEqual(1);
    expect(j.t).toBeLessThan(1.2);
    expect(j.v.x).toBeGreaterThan(0);
    expect(j.v.y).toBeLessThan(0);
    expect(j.speed).toBeGreaterThan(2);
    expect(j.firstLanding).toBe('RH');
  });

  it('no jump while a limb is in contact', () => {
    const held = [...contacts, c('RF', 1, 1.5)];
    expect(detectJumps(track, held, [{ start: 0, end: 3 }])).toHaveLength(0);
  });

  it('a one-sample pose glitch is not a jump', () => {
    // The pelvis jumps 0.3 units for a single sample (pose jitter) with no limb in contact.
    const glitch = synthTrack({
      duration: 3,
      limbs: {},
      pelvis: [{ t: 0, x: 0.5, y: 0.6 }, { t: 1.4, x: 0.5, y: 0.6 }, { t: 1.4667, x: 0.8, y: 0.6 }, { t: 1.5333, x: 0.5, y: 0.6 }],
    });
    expect(detectJumps(glitch, [], [{ start: 0, end: 3 }])).toHaveLength(0);
  });

  it('walking fast across the mat is not a jump', () => {
    // Pelvis moves sideways at 3 S/s for 1 s, a little uphill, with no limb in contact (walking).
    const walk = synthTrack({ duration: 3, limbs: {}, pelvis: [{ t: 0, x: 0.2, y: 0.7 }, { t: 1, x: 0.2, y: 0.7 }, { t: 2, x: 0.8, y: 0.68 }] });
    expect(detectJumps(walk, [], [{ start: 0, end: 3 }])).toHaveLength(0);
  });

  it('no jump outside an attempt', () => {
    expect(detectJumps(track, contacts, [{ start: 2, end: 3 }])).toHaveLength(0);
  });
});

describe('matchJump', () => {
  const j = (t: number): Jump => ({ t, v: { x: 0, y: -1 }, speed: 3, firstLanding: 'RH' });

  it('returns the jump nearest in aligned time within JUMP_MATCH', () => {
    expect(matchJump([j(2), j(5.5), j(9)], 5)!.t).toBe(5.5);
  });

  it('returns null when none is close enough', () => {
    expect(matchJump([j(2), j(9)], 5)).toBeNull();
  });
});
