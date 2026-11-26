// The A → B difference table: one row per checked scalar metric (SPEC.md section 5, D23). Pure.
import type { Attempt, Contact, LayerId, Metrics } from '../types';
import { computeMetrics } from './metrics';

/** Metrics of the first attempt only: comparison is attempt against attempt (D19). */
export function firstAttemptMetrics(contacts: Contact[], attempts: Attempt[]): Metrics {
  return computeMetrics(contacts.filter((c) => c.attempt === 0), attempts.slice(0, 1));
}

export type DiffRow = { key: string; a: number; b: number; delta: number; unit: 'count' | 's' };

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
  return rows;
}
