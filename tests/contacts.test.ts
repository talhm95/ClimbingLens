import { describe, expect, it } from 'vitest';
import { clipToAttempts, detectContacts, type AnalysisCtx } from '../src/analysis/contacts';
import { bodyScale } from '../src/analysis/limbs';
import type { Contact, Hold, PoseTrack } from '../src/types';
import { still, synthTrack, type SynthOptions } from './fixtures/synth';

// S = 200 px: still < 0.1 units/s, HOLD_RADIUS = 0.12 units, RELEASE_RADIUS = 0.2 units.
const HOLDS: Hold[] = [
  { id: 1, x: 0.5, y: 0.3 },
  { id: 2, x: 0.5, y: 0.2 },
];
const TOL = 0.15;

function ctxOf(o: SynthOptions, holds: Hold[] = HOLDS): AnalysisCtx {
  const track: PoseTrack = synthTrack(o);
  return { track, S: bodyScale(track), holds };
}

const ids = (cs: Contact[]) => cs.map((c) => c.holdId);

describe('detectContacts', () => {
  it('confirms a settled contact', () => {
    const cs = detectContacts(ctxOf({ duration: 1, limbs: { RH: still(0.5, 0.3, 0, 1) } }));
    expect(cs).toHaveLength(1);
    expect(cs[0].limb).toBe('RH');
    expect(cs[0].holdId).toBe(1);
    expect(cs[0].start).toBeCloseTo(0, 1);
    expect(Math.abs(cs[0].end - 1)).toBeLessThan(TOL);
  });

  it('ignores a pass-by', () => {
    const cs = detectContacts(ctxOf({ duration: 1.6, limbs: { RH: [{ t: 0, x: 0.3, y: 0.3 }, { t: 1.6, x: 0.7, y: 0.3 }] } }));
    expect(cs).toHaveLength(0);
  });

  it('ignores a touch shorter than HOLD_DWELL', () => {
    // Arrives at 3 S/s (0.6 units/s), still on hold 1 for 0.3 s, leaves at 3 S/s.
    const RH = [
      { t: 0, x: 0.5, y: 0.6 },
      { t: 0.5, x: 0.5, y: 0.3 },
      { t: 0.8, x: 0.5, y: 0.3 },
      { t: 1.3, x: 0.5, y: 0.6 },
    ];
    expect(detectContacts(ctxOf({ duration: 2, limbs: { RH } }))).toHaveLength(0);
  });

  it('hysteresis keeps the hold through a wiggle and counts a correction', () => {
    const LF = [
      { t: 0, x: 0.5, y: 0.3 },
      { t: 1, x: 0.5, y: 0.3 },
      { t: 1.15, x: 0.66, y: 0.3 },
      { t: 1.3, x: 0.5, y: 0.3 },
      { t: 3, x: 0.5, y: 0.3 },
    ];
    const cs = detectContacts(ctxOf({ duration: 3, limbs: { LF } }));
    expect(ids(cs)).toEqual([1]);
    expect(cs[0].corrections).toHaveLength(1);
    expect(Math.abs(cs[0].corrections[0] - 1.3)).toBeLessThan(TOL);
  });

  it('leaving past RELEASE_RADIUS starts a new contact', () => {
    const LF = [
      { t: 0, x: 0.5, y: 0.3 },
      { t: 1, x: 0.5, y: 0.3 },
      // Away for 0.7 s (the plan's 0.5 s shrinks below MIN_STILL once smoothing blurs these fast moves).
      { t: 1.15, x: 0.76, y: 0.3 },
      { t: 1.85, x: 0.76, y: 0.3 },
      { t: 2.0, x: 0.5, y: 0.3 },
      { t: 3, x: 0.5, y: 0.3 },
    ];
    const cs = detectContacts(ctxOf({ duration: 3, limbs: { LF } }));
    expect(ids(cs)).toEqual([1, null, 1]);
    expect(cs.every((c) => c.corrections.length === 0)).toBe(true);
  });

  it('a deeper hold wins', () => {
    const RH = [
      { t: 0, x: 0.5, y: 0.3 },
      { t: 1, x: 0.5, y: 0.3 },
      { t: 1.2, x: 0.5, y: 0.2 },
      { t: 2.5, x: 0.5, y: 0.2 },
    ];
    expect(ids(detectContacts(ctxOf({ duration: 2.5, limbs: { RH } })))).toEqual([1, 2]);
  });

  it('splits a contact at a long missing-data gap', () => {
    const cs = detectContacts(ctxOf({ duration: 3, limbs: { RH: still(0.5, 0.3, 0, 3) }, missing: [[1, 2]] }));
    expect(ids(cs)).toEqual([1, 1]);
  });

  it('bridges a short missing-data gap', () => {
    const cs = detectContacts(ctxOf({ duration: 3, limbs: { RH: still(0.5, 0.3, 0, 3) }, missing: [[1, 1.2]] }));
    expect(ids(cs)).toEqual([1]);
  });

  it('a still foot on no hold is a smear', () => {
    const cs = detectContacts(ctxOf({ duration: 1, limbs: { LF: still(0.9, 0.9, 0, 1) } }));
    expect(cs).toHaveLength(1);
    expect(cs[0].holdId).toBeNull();
  });

  it('a still hand off any hold is not a contact', () => {
    expect(detectContacts(ctxOf({ duration: 1, limbs: { RH: still(0.9, 0.9, 0, 1) } }))).toHaveLength(0);
  });

  it('contacts of all limbs are sorted by start', () => {
    const cs = detectContacts(
      ctxOf({
        duration: 3,
        limbs: {
          // The hand waits off any hold (not a contact), then reaches hold 1 at 1 s.
          RH: [{ t: 0, x: 0.9, y: 0.1 }, { t: 0.5, x: 0.9, y: 0.1 }, { t: 1, x: 0.5, y: 0.3 }, { t: 3, x: 0.5, y: 0.3 }],
          LF: still(0.9, 0.9, 0, 3),
        },
      }),
    );
    expect(cs.map((c) => c.limb)).toEqual(['LF', 'RH']);
  });
});

describe('clipToAttempts', () => {
  const deeper = () =>
    detectContacts(
      ctxOf({
        duration: 2.5,
        limbs: {
          RH: [
            { t: 0, x: 0.5, y: 0.3 },
            { t: 1, x: 0.5, y: 0.3 },
            { t: 1.2, x: 0.5, y: 0.2 },
            { t: 2.5, x: 0.5, y: 0.2 },
          ],
        },
      }),
    );

  it('keeps only contacts inside an attempt, clipped, with the attempt index', () => {
    const cs = clipToAttempts(deeper(), [{ start: 1.5, end: 3 }]);
    expect(cs).toHaveLength(1);
    expect(cs[0].holdId).toBe(2);
    expect(cs[0].start).toBe(1.5);
    expect(cs[0].attempt).toBe(0);
  });

  it('drops corrections outside the clipped range', () => {
    const c: Contact = { limb: 'LF', holdId: 1, start: 0, end: 10, pos: { x: 0, y: 0 }, corrections: [2, 8], attempt: -1 };
    const out = clipToAttempts([c], [{ start: 5, end: 12 }]);
    expect(out[0].corrections).toEqual([8]);
    expect(out[0].start).toBe(5);
  });

  it('assigns the attempt with the larger overlap', () => {
    const c: Contact = { limb: 'RH', holdId: 1, start: 3, end: 9, pos: { x: 0, y: 0 }, corrections: [], attempt: -1 };
    const out = clipToAttempts([c], [{ start: 0, end: 4 }, { start: 5, end: 20 }]);
    expect(out[0].attempt).toBe(1);
    expect(out[0].start).toBe(5);
  });
});
