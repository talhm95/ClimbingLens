import { describe, expect, it } from 'vitest';
import { frameAt } from '../src/analysis/limbs';
import type { PoseTrack } from '../src/types';

const track: PoseTrack = {
  sampleRate: 15,
  videoW: 1000,
  videoH: 1000,
  frames: Array.from({ length: 30 }, (_, i) => ({ t: i / 15, lm: null })),
};

describe('frameAt', () => {
  it('returns the nearest sample', () => {
    expect(frameAt(track, 0.12)).toBe(track.frames[2]);
  });

  it('returns null before the track', () => {
    expect(frameAt(track, -1)).toBeNull();
  });

  it('returns null after the track', () => {
    expect(frameAt(track, 5)).toBeNull();
  });
});
