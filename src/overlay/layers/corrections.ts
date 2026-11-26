import { frameAt, limbPoint } from '../../analysis/limbs';
import { activeCorrections } from '../../analysis/metrics';
import { activeTake } from '../../state/selectors';
import type { AppState, TimelineMark, Viewport } from '../../types';
import { tr } from '../../ui/i18n';
import { circle, LIMB_COLORS, outlinedText } from '../draw';
import { toCanvas } from '../viewport';

/** A blinking dot on the foot around each correction, with "LF ×2" for that placement so far. */
export function drawCorrections(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take?.poses) return;
  const lm = frameAt(take.poses, t)?.lm ?? null;
  const alpha = 0.5 + 0.5 * Math.sin(performance.now() / 80);
  for (const { limb, at } of activeCorrections(take.contacts, t)) {
    const contact = take.contacts.find((c) => c.limb === limb && c.corrections.includes(at))!;
    const foot = limbPoint(lm, limb) ?? contact.pos;
    const p = toCanvas(view, foot);
    ctx.save();
    ctx.globalAlpha = alpha;
    circle(ctx, p, 9);
    ctx.fillStyle = LIMB_COLORS[limb];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
    const n = contact.corrections.filter((x) => x <= Math.max(t, at)).length;
    outlinedText(ctx, `${limb} ×${n}`, { x: p.x, y: p.y + 20 }, 13, LIMB_COLORS[limb]);
  }
}

export function correctionRows(s: AppState) {
  const m = activeTake(s)?.metrics;
  if (!m) return [];
  const f = m.footCorrections;
  return [
    { label: 'LF', value: String(f.LF) },
    { label: 'RF', value: String(f.RF) },
    { label: tr('metrics.total'), value: String(f.total) },
  ];
}

/** A tick at each foot correction. */
export function correctionMarks(s: AppState): TimelineMark[] {
  const take = activeTake(s);
  const out: TimelineMark[] = [];
  for (const c of take?.contacts ?? []) {
    if (c.limb !== 'LF' && c.limb !== 'RF') continue;
    for (const at of c.corrections) out.push({ t: at, color: '#ffeb3b', kind: 'tick' });
  }
  return out;
}
