// Drop events (Tier 2): red marks on the timeline and a total. No drawing on the video.
import { activeTake } from '../../state/selectors';
import type { AppState, TimelineMark } from '../../types';
import { tr } from '../../ui/i18n';

export function dropMarks(s: AppState): TimelineMark[] {
  return (activeTake(s)?.tier2?.drops ?? []).map((d) => ({ t: d.t, color: '#ff1744', kind: 'event' as const }));
}

export function dropRows(s: AppState) {
  const m = activeTake(s)?.metrics?.tier2;
  if (!m) return [];
  return [{ label: tr('metrics.total'), value: String(m.drops) }];
}
