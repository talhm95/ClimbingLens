// The A → B difference table: one row per checked scalar metric (SPEC.md section 5, D23, D33). Pure.
import type { LayerId, Metrics, Take } from '../types';
import { computeMetrics, normalizeAttempts } from './metrics';
import { offBalanceFraction } from './weightShift';

export type DiffRow = { key: string; a: number; b: number; delta: number; unit: 'count' | 's' | '%' | 'S/s' };

/** Metrics of the first attempt only, Tier 2 included: comparison is attempt against attempt (D19). */
export function firstAttemptMetrics(take: Take): Metrics {
  const first = normalizeAttempts(take.attempts, take.duration)[0];
  const contacts = take.contacts.filter((c) => c.attempt === 0);
  const inFirst = (t: number) => t >= first.start && t <= first.end;
  const drops = (take.tier2?.drops ?? []).filter((d) => inFirst(d.t));
  const jumps = (take.tier2?.jumps ?? []).filter((j) => inFirst(j.t));
  return {
    ...computeMetrics(contacts, [first]),
    tier2: {
      drops: drops.length,
      jumps: jumps.length,
      firstJumpSpeed: jumps.length ? jumps[0].speed : null,
      offBalance: take.poses ? offBalanceFraction(take.poses, contacts, [first]) : 0,
    },
  };
}

const row = (key: string, a: number, b: number, unit: DiffRow['unit']): DiffRow => ({ key, a, b, delta: b - a, unit });

export function diffMetrics(a: Metrics, b: Metrics, enabled: Record<LayerId, boolean>): DiffRow[] {
  const rows: DiffRow[] = [];
  if (enabled.touches) {
    for (const k of ['LH', 'RH', 'LF', 'RF', 'total'] as const) rows.push(row(`touches.${k}`, a.touches[k], b.touches[k], 'count'));
  }
  if (enabled.footCorrections) {
    for (const k of ['LF', 'RF', 'total'] as const) {
      rows.push(row(`footCorrections.${k}`, a.footCorrections[k], b.footCorrections[k], 'count'));
    }
  }
  if (enabled.timing && a.attempts.length && b.attempts.length) {
    rows.push(row('attempt.duration', a.attempts[0].duration, b.attempts[0].duration, 's'));
  }
  const ta = a.tier2;
  const tb = b.tier2;
  if (ta && tb) {
    if (enabled.drops) rows.push(row('drops.total', ta.drops, tb.drops, 'count'));
    if (enabled.weightShift) rows.push(row('offBalance', ta.offBalance * 100, tb.offBalance * 100, '%'));
  }
  return rows;
}
