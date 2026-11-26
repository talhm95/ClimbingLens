// The single list of checklist items (ARCHITECTURE.md section 5). Order = draw order.
import { activeTake } from '../../state/selectors';
import type { AppState, LayerDef } from '../../types';
import { tr } from '../../ui/i18n';
import { drawComparison } from './comparison';
import { contactMarks, drawContacts } from './contacts';
import { correctionMarks, correctionRows, drawCorrections } from './corrections';
import { drawHeatmap } from './heatmap';
import { drawHolds } from './holds';
import { drawSkeleton } from './skeleton';
import { timingRows } from './timing';
import { drawWeightShift, weightRows } from './weightShift';

function touchRows(s: AppState) {
  const m = activeTake(s)?.metrics;
  if (!m) return [];
  const t = m.touches;
  return [
    { label: 'LH', value: String(t.LH) },
    { label: 'RH', value: String(t.RH) },
    { label: 'LF', value: String(t.LF) },
    { label: 'RF', value: String(t.RF) },
    { label: tr('metrics.total'), value: String(t.total) },
  ];
}

export const LAYERS: LayerDef[] = [
  { id: 'heatmap', tier: 2, label: { en: 'Foot-contact heatmap', he: 'מפת חום של כפות הרגליים' }, needs: ['poses'], draw: drawHeatmap },
  { id: 'holds', tier: 1, label: { en: 'Hold numbers', he: 'מספרי אחיזות' }, needs: ['holds'], draw: drawHolds },
  { id: 'weightShift', tier: 2, label: { en: 'Weight over the foot', he: 'משקל מעל הרגל' }, needs: ['poses'], draw: drawWeightShift, metrics: weightRows },
  { id: 'skeleton', tier: 1, label: { en: 'Stick figure', he: 'שלד' }, needs: ['poses'], draw: drawSkeleton },
  {
    id: 'contacts',
    tier: 1,
    label: { en: 'Limb contacts', he: 'מגע גפיים' },
    needs: ['poses'],
    draw: drawContacts,
    timelineMarks: contactMarks,
  },
  { id: 'touches', tier: 1, label: { en: 'Touch count', he: 'מספר מגעים' }, needs: ['poses'], metrics: touchRows },
  {
    id: 'footCorrections',
    tier: 1,
    label: { en: 'Foot corrections', he: 'תיקוני רגל' },
    needs: ['poses'],
    draw: drawCorrections,
    metrics: correctionRows,
    timelineMarks: correctionMarks,
  },
  { id: 'timing', tier: 1, label: { en: 'Attempt & rest time', he: 'זמן ניסיון ומנוחה' }, needs: ['poses'], metrics: timingRows },
  { id: 'comparison', tier: 1, label: { en: 'Compare with take A', he: 'השוואה לסרטון A' }, needs: ['takeB'], draw: drawComparison },
];

/** A layer is available once everything in its `needs` exists. */
export function isAvailable(layer: LayerDef, s: AppState): boolean {
  const take = activeTake(s);
  return (layer.needs ?? []).every((n) => {
    if (n === 'poses') return !!take?.poses;
    if (n === 'holds') return !!take && take.holds.length > 0;
    return !!s.takes.A?.poses && !!s.takes.B?.poses;
  });
}

/** Enabled and available: drawn, listed in panels, and adding timeline marks. */
export function isOn(layer: LayerDef, s: AppState): boolean {
  return s.enabled[layer.id] && isAvailable(layer, s);
}
