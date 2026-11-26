import { describe, expect, it } from 'vitest';
import { activeCorrections } from '../src/analysis/metrics';
import type { Contact, Limb } from '../src/types';

const c = (limb: Limb, corrections: number[]): Contact => ({
  limb, holdId: 1, start: 0, end: 10, pos: { x: 0, y: 0 }, corrections, attempt: 0,
});

describe('activeCorrections', () => {
  const contacts = [c('LF', [2.0]), c('RF', [5.0]), c('RH', [2.2])];

  it('returns a foot correction within BLINK_WINDOW of t', () => {
    expect(activeCorrections(contacts, 2.4)).toEqual([{ limb: 'LF', at: 2.0 }]);
  });

  it('returns nothing between corrections', () => {
    expect(activeCorrections(contacts, 3.0)).toEqual([]);
  });

  it('never returns hand corrections', () => {
    expect(activeCorrections(contacts, 2.2).every((x) => x.limb === 'LF' || x.limb === 'RF')).toBe(true);
  });
});
