import { describe, expect, it } from 'vitest';
import { diffMetrics, firstAttemptMetrics } from '../src/analysis/compare';
import { computeMetrics } from '../src/analysis/metrics';
import type { LayerId, Metrics } from '../src/types';
import { synthTrack } from './fixtures/synth';
import { takeOf } from './fixtures/take';

const ALL: LayerId[] = ['skeleton', 'holds', 'contacts', 'touches', 'footCorrections', 'timing', 'comparison', 'heatmap', 'weightShift', 'angles', 'jump', 'drops'];
const only = (...on: LayerId[]) => Object.fromEntries(ALL.map((id) => [id, on.includes(id)])) as Record<LayerId, boolean>;

function metrics(corrLF: number, corrRF: number, duration: number): Metrics {
  const m = computeMetrics([], [{ start: 0, end: duration }]);
  m.footCorrections = { LF: corrLF, RF: corrRF, total: corrLF + corrRF };
  m.touches = { LH: 2, RH: 3, LF: 4, RF: 5, total: 14 };
  return m;
}

describe('diffMetrics', () => {
  const a = metrics(4, 2, 40);
  const b = metrics(1, 1, 34);

  it('only the checked metrics: foot corrections gives 3 rows', () => {
    const rows = diffMetrics(a, b, only('footCorrections'));
    expect(rows.map((r) => r.key)).toEqual(['footCorrections.LF', 'footCorrections.RF', 'footCorrections.total']);
  });

  it('delta = b - a', () => {
    const total = diffMetrics(a, b, only('footCorrections')).find((r) => r.key === 'footCorrections.total')!;
    expect(total).toMatchObject({ a: 6, b: 2, delta: -4, unit: 'count' });
  });

  it('nothing checked gives no rows', () => {
    expect(diffMetrics(a, b, only())).toEqual([]);
  });

  it('timing gives the first attempt duration in seconds', () => {
    const rows = diffMetrics(a, b, only('timing'));
    expect(rows).toEqual([{ key: 'attempt.duration', a: 40, b: 34, delta: -6, unit: 's' }]);
  });

  it('touches gives a row per limb and the total', () => {
    expect(diffMetrics(a, b, only('touches'))).toHaveLength(5);
  });
});

describe('firstAttemptMetrics (D19: comparison uses the first attempt)', () => {
  const c = (attempt: number, corrections: number[] = []) => ({
    limb: 'LF' as const, holdId: 1, start: attempt * 50, end: attempt * 50 + 1, pos: { x: 0, y: 0 }, corrections, attempt,
  });

  it('counts only contacts of attempt 0 and times only the first attempt', () => {
    const take = takeOf(null, [], {
      duration: 90,
      contacts: [c(0, [0.5]), c(1, [50.5, 50.7]), c(1)],
      attempts: [{ start: 0, end: 20 }, { start: 50, end: 80 }],
    });
    const m = firstAttemptMetrics(take);
    expect(m.touches.total).toBe(1);
    expect(m.footCorrections.total).toBe(1);
    expect(m.attempts).toEqual([{ duration: 20 }]);
  });

  it('off balance is measured over the first attempt only', () => {
    // Foot under the pelvis in attempt 1 (0-2 s), 0.4 S off to the side in attempt 2 (3-5 s).
    const poses = synthTrack({ duration: 5, limbs: { LF: [{ t: 0, x: 0.5, y: 0.9 }, { t: 2.5, x: 0.5, y: 0.9 }, { t: 2.6, x: 0.42, y: 0.9 }] } });
    const lf = (attempt: number, start: number, end: number) => ({ limb: 'LF' as const, holdId: 1, start, end, pos: { x: 0, y: 0 }, corrections: [], attempt });
    const take = takeOf(poses, [], { contacts: [lf(0, 0, 2), lf(1, 3, 5)], attempts: [{ start: 0, end: 2 }, { start: 3, end: 5 }] });
    expect(firstAttemptMetrics(take).tier2!.offBalance).toBe(0);
  });
});

describe('diffMetrics Tier 2 rows (D33)', () => {
  it('weight shift gives an off-balance row in %', () => {
    const a = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 0, firstJumpSpeed: null, offBalance: 0.3 } };
    const b = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 0, firstJumpSpeed: null, offBalance: 0.1 } };
    const rows = diffMetrics(a, b, only('weightShift'));
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('offBalance');
    expect(rows[0].unit).toBe('%');
    expect(rows[0].a).toBeCloseTo(30, 9);
    expect(rows[0].delta).toBeCloseTo(-20, 9);
  });
});

describe('diffMetrics drop rows', () => {
  it('drops gives a drops.total count row', () => {
    const a = { ...metrics(0, 0, 10), tier2: { drops: 3, jumps: 0, firstJumpSpeed: null, offBalance: 0 } };
    const b = { ...metrics(0, 0, 10), tier2: { drops: 1, jumps: 0, firstJumpSpeed: null, offBalance: 0 } };
    expect(diffMetrics(a, b, only('drops'))).toEqual([{ key: 'drops.total', a: 3, b: 1, delta: -2, unit: 'count' }]);
  });
});

describe('diffMetrics jump rows', () => {
  it('jump gives a count row and a first take-off speed row in S/s', () => {
    const a = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 2, firstJumpSpeed: 3.2, offBalance: 0 } };
    const b = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 1, firstJumpSpeed: 4.0, offBalance: 0 } };
    const rows = diffMetrics(a, b, only('jump'));
    expect(rows.map((r) => [r.key, r.unit])).toEqual([['jumps.count', 'count'], ['jumps.firstSpeed', 'S/s']]);
    expect(rows[1].delta).toBeCloseTo(0.8, 9);
  });

  it('no speed row when a take has no jump', () => {
    const a = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 0, firstJumpSpeed: null, offBalance: 0 } };
    const b = { ...metrics(0, 0, 10), tier2: { drops: 0, jumps: 1, firstJumpSpeed: 4.0, offBalance: 0 } };
    expect(diffMetrics(a, b, only('jump')).map((r) => r.key)).toEqual(['jumps.count']);
  });
});
