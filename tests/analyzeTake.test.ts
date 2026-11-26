import { describe, expect, it } from 'vitest';
import { analyzeTake } from '../src/analysis/analyzeTake';
import { still, synthTrack } from './fixtures/synth';
import { takeOf } from './fixtures/take';


describe('analyzeTake', () => {
  const track = synthTrack({ duration: 2, limbs: { LF: still(0.5, 0.8, 0, 2), RH: still(0.5, 0.3, 0, 2) } });

  it('returns empty results when there are no poses', () => {
    const r = analyzeTake(takeOf(null, []));
    expect(r.contacts).toEqual([]);
    expect(r.metrics.touches.total).toBe(0);
  });

  it('analyzeTake reflects changed holds', () => {
    const holds = [{ id: 1, x: 0.5, y: 0.8 }, { id: 2, x: 0.5, y: 0.3 }];
    const before = analyzeTake(takeOf(track, holds)).contacts.find((c) => c.limb === 'LF')!;
    expect(before.holdId).toBe(1);
    const after = analyzeTake(takeOf(track, holds.slice(1))).contacts.find((c) => c.limb === 'LF')!;
    expect(after.holdId).toBeNull();
  });

  it('zero holds gives null holdIds', () => {
    const r = analyzeTake(takeOf(track, []));
    expect(r.contacts.some((c) => c.limb === 'RH' || c.limb === 'LH')).toBe(false);
    expect(r.contacts.length).toBeGreaterThan(0);
    expect(r.contacts.every((c) => c.holdId === null)).toBe(true);
  });

  it('touch counts come from the clipped contacts', () => {
    const holds = [{ id: 1, x: 0.5, y: 0.8 }, { id: 2, x: 0.5, y: 0.3 }];
    const r = analyzeTake(takeOf(track, holds));
    expect(r.metrics.touches).toEqual({ LH: 0, RH: 1, LF: 1, RF: 0, total: 2 });
  });
});
