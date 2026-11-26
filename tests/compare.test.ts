import { describe, expect, it } from 'vitest';
import { diffMetrics } from '../src/analysis/compare';
import { computeMetrics } from '../src/analysis/metrics';
import type { LayerId, Metrics } from '../src/types';

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
