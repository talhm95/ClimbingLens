// "Attempt & rest time": rows per attempt and rest, the auto/manual source, and a live rest timer.
import { normalizeAttempts, restAt } from '../../analysis/metrics';
import { activeTake } from '../../state/selectors';
import type { AppState } from '../../types';
import { mmss, secs } from '../../ui/format';
import { tr } from '../../ui/i18n';

export function timingRows(s: AppState) {
  const take = activeTake(s);
  const m = take?.metrics;
  if (!take || !m) return [];
  const rows = [
    { label: tr('timing.source'), value: take.attemptsSource === 'auto' ? tr('attempts.badgeAuto') : tr('attempts.badgeManual') },
  ];
  m.attempts.forEach((a, i) => rows.push({ label: tr('timing.attempt', { n: i + 1 }), value: secs(a.duration) }));
  m.rests.forEach((r, i) => rows.push({ label: tr('timing.rest', { n: i + 1 }), value: secs(r.duration) }));
  return rows;
}

/** Text for the live rest timer at time t, or null outside a rest. */
export function restTimerText(s: AppState, t: number): string | null {
  const take = activeTake(s);
  if (!take?.poses) return null;
  const r = restAt(normalizeAttempts(take.attempts, take.duration), t);
  return r === null ? null : mmss(r);
}
