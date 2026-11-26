import { describe, expect, it } from 'vitest';
import { computeMetrics } from '../src/analysis/metrics';
import type { Contact, Limb } from '../src/types';

export function contact(limb: Limb, start: number, corrections: number[] = [], holdId: number | null = 1): Contact {
  return { limb, holdId, start, end: start + 1, pos: { x: 0.5, y: 0.5 }, corrections, attempt: 0 };
}

describe('computeMetrics', () => {
  it('counts touches per limb and foot corrections', () => {
    const cs = [
      contact('LH', 0), contact('LH', 2),
      contact('RH', 1), contact('RH', 3), contact('RH', 5),
      contact('LF', 0, [0.5, 0.7]),
      contact('RF', 1, [1.5]), contact('RF', 4),
    ];
    const m = computeMetrics(cs, [{ start: 0, end: 10 }]);
    expect(m.touches).toEqual({ LH: 2, RH: 3, LF: 1, RF: 2, total: 8 });
    expect(m.footCorrections).toEqual({ LF: 2, RF: 1, total: 3 });
  });

  it('hand corrections are not foot corrections', () => {
    const m = computeMetrics([contact('RH', 0, [0.5])], [{ start: 0, end: 10 }]);
    expect(m.footCorrections.total).toBe(0);
  });
});
