import { activeTake } from '../../state/selectors';
import type { AppState, TimelineMark, Viewport } from '../../types';
import { circle, LIMB_COLORS, outlinedText } from '../draw';
import { toCanvas } from '../viewport';

/** A limb-coloured ring with "RH 2" at each contact that is active at time t. */
export function drawContacts(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take) return;
  for (const c of take.contacts) {
    if (t < c.start || t > c.end) continue;
    const p = toCanvas(view, c.pos);
    const color = LIMB_COLORS[c.limb];
    circle(ctx, p, 11);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    const text = c.holdId === null ? c.limb : `${c.limb} ${c.holdId}`;
    const right = c.limb === 'RH' || c.limb === 'RF';
    outlinedText(ctx, text, { x: p.x + (right ? 16 : -16), y: p.y }, 13, color, right ? 'left' : 'right');
  }
}

/** Limb-coloured ticks at each contact start (D32). */
export function contactMarks(s: AppState): TimelineMark[] {
  const take = activeTake(s);
  return (take?.contacts ?? []).map((c) => ({ t: c.start, color: LIMB_COLORS[c.limb], kind: 'tick' as const }));
}
