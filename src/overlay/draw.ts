// Small canvas helpers shared by the layers. Everything is in canvas CSS pixels.
import type { Vec } from '../types';

export const FONT = '"Segoe UI", system-ui, Arial, sans-serif';

export const LIMB_COLORS = { LH: '#4fc3f7', RH: '#1565c0', LF: '#ffb74d', RF: '#e65100' } as const;

/** Text with a dark outline so it reads on any wall. */
export function outlinedText(ctx: CanvasRenderingContext2D, text: string, p: Vec, size: number, color = '#fff', align: CanvasTextAlign = 'center'): void {
  ctx.save();
  // Labels are Latin codes and numbers ("RH 2", "LF ×2"): keep them LTR in Hebrew mode too.
  ctx.direction = 'ltr';
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, p.x, p.y);
  ctx.fillStyle = color;
  ctx.fillText(text, p.x, p.y);
  ctx.restore();
}

export function circle(ctx: CanvasRenderingContext2D, p: Vec, r: number): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
}

/** A polyline of canvas points; null points break the line. */
export function polyline(ctx: CanvasRenderingContext2D, pts: (Vec | null)[]): void {
  ctx.beginPath();
  let pen = false;
  for (const p of pts) {
    if (!p) {
      pen = false;
      continue;
    }
    if (pen) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
    pen = true;
  }
}
