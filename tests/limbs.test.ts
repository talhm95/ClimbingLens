import { describe, expect, it } from 'vitest';
import { bodyScale, distPx, limbPoint, limbSeries, pelvis } from '../src/analysis/limbs';
import type { Landmark } from '../src/types';
import { still, synthTrack } from './fixtures/synth';

function landmarks(): Landmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, v: 1 }));
}

describe('limbPoint', () => {
  it('LH is the mean of wrist, pinky and index (15, 17, 19)', () => {
    const lm = landmarks();
    lm[15] = { x: 0.3, y: 0.3, v: 1 };
    lm[17] = { x: 0.6, y: 0.3, v: 1 };
    lm[19] = { x: 0.3, y: 0.6, v: 1 };
    const p = limbPoint(lm, 'LH')!;
    expect(p.x).toBeCloseTo(0.4, 9);
    expect(p.y).toBeCloseTo(0.4, 9);
  });

  it('drops a landmark below MIN_VISIBILITY', () => {
    const lm = landmarks();
    lm[15] = { x: 0.2, y: 0.2, v: 1 };
    lm[17] = { x: 0.9, y: 0.9, v: 0.2 };
    lm[19] = { x: 0.4, y: 0.4, v: 1 };
    const p = limbPoint(lm, 'LH')!;
    expect(p.x).toBeCloseTo(0.3, 9);
    expect(p.y).toBeCloseTo(0.3, 9);
  });

  it('is null when every landmark of the limb is hidden, or there is no person', () => {
    const lm = landmarks();
    for (const i of [30, 32]) lm[i].v = 0.1;
    expect(limbPoint(lm, 'RF')).toBeNull();
    expect(limbPoint(null, 'RF')).toBeNull();
  });

  it('pelvis is the hip midpoint', () => {
    const lm = landmarks();
    lm[23] = { x: 0.4, y: 0.6, v: 1 };
    lm[24] = { x: 0.6, y: 0.6, v: 1 };
    expect(pelvis(lm)).toEqual({ x: 0.5, y: 0.6 });
  });
});

describe('bodyScale and distPx', () => {
  it('bodyScale of the synthetic track is 200 px', () => {
    expect(bodyScale(synthTrack({ duration: 2, limbs: {} }))).toBeCloseTo(200, 6);
  });

  it('distPx measures in pixels, so a wide video does not distort it', () => {
    const track = { sampleRate: 15, videoW: 2000, videoH: 1000, frames: [] };
    expect(distPx({ x: 0, y: 0 }, { x: 0.1, y: 0 }, track)).toBeCloseTo(200, 9);
    expect(distPx({ x: 0, y: 0 }, { x: 0, y: 0.1 }, track)).toBeCloseTo(100, 9);
  });
});

describe('limbSeries', () => {
  it('fills a short gap and keeps a long one', () => {
    const track = synthTrack({ duration: 3, limbs: { RH: still(0.5, 0.3, 0, 3) }, missing: [[0.5, 0.6], [1.5, 2.5]] });
    const s = limbSeries(track, 'RH');
    expect(s[8]).not.toBeNull(); // t = 0.53, inside the short gap
    expect(s[30]).toBeNull(); // t = 2.0, inside the long gap
    expect(s[8]!.x).toBeCloseTo(0.5, 9);
  });
});
