import { describe, expect, it } from 'vitest';
import { detectDrops } from '../src/analysis/drops';
import { bodyScale } from '../src/analysis/limbs';
import type { Contact } from '../src/types';
import { synthTrack, type Keyframe } from './fixtures/synth';

const contact: Contact = { limb: 'RH', holdId: 1, start: 0, end: 1, pos: { x: 0.5, y: 0.3 }, corrections: [], attempt: 0 };

function drops(RH: Keyframe[]) {
  const track = synthTrack({ duration: 2, limbs: { RH } });
  return detectDrops({ track, S: bodyScale(track), holds: [] }, [contact]);
}

describe('detectDrops', () => {
  it('a hand leaving its hold 0.3 units straight down in 0.1 s is a drop', () => {
    const d = drops([{ t: 0, x: 0.5, y: 0.3 }, { t: 1, x: 0.5, y: 0.3 }, { t: 1.1, x: 0.5, y: 0.6 }]);
    expect(d).toEqual([{ limb: 'RH', t: 1 }]);
  });

  it('the same move upward is not a drop', () => {
    expect(drops([{ t: 0, x: 0.5, y: 0.3 }, { t: 1, x: 0.5, y: 0.3 }, { t: 1.1, x: 0.5, y: 0.0 }])).toEqual([]);
  });

  it('a slow downward step is not a drop', () => {
    expect(drops([{ t: 0, x: 0.5, y: 0.3 }, { t: 1, x: 0.5, y: 0.3 }, { t: 1.5, x: 0.5, y: 0.4 }])).toEqual([]);
  });

  it('a fast sideways move is not a drop', () => {
    expect(drops([{ t: 0, x: 0.5, y: 0.3 }, { t: 1, x: 0.5, y: 0.3 }, { t: 1.1, x: 0.8, y: 0.35 }])).toEqual([]);
  });
});
