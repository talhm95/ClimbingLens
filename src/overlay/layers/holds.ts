import { activeTake } from '../../state/selectors';
import type { AppState, Viewport } from '../../types';
import { circle, outlinedText } from '../draw';
import { toCanvas } from '../viewport';

export const HOLD_DOT_RADIUS = 14; // CSS px

export function drawHolds(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState): void {
  const take = activeTake(s);
  if (!take) return;
  for (const h of take.holds) {
    const p = toCanvas(view, h);
    circle(ctx, p, HOLD_DOT_RADIUS);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffeb3b';
    ctx.stroke();
    outlinedText(ctx, String(h.id), p, 14, '#ffeb3b');
  }
}
