// The single list of checklist items (ARCHITECTURE.md section 5). Order = draw order.
import { activeTake } from '../../state/selectors';
import type { AppState, LayerDef } from '../../types';
import { drawSkeleton } from './skeleton';

export const LAYERS: LayerDef[] = [
  { id: 'skeleton', tier: 1, label: { en: 'Stick figure', he: 'שלד' }, needs: ['poses'], draw: drawSkeleton },
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
