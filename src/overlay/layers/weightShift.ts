// Weight shift (Tier 2): a vertical line from the pelvis down to the supporting foot's height,
// white while the hips are over the foot, red when |offset| > WEIGHT_TOL.
import { bodyScale, frameAt, limbPoint, pelvis } from '../../analysis/limbs';
import { weightOffset } from '../../analysis/weightShift';
import { WEIGHT_TOL } from '../../config';
import { activeTake } from '../../state/selectors';
import type { AppState, PoseTrack, Viewport } from '../../types';
import { tr } from '../../ui/i18n';
import { circle } from '../draw';
import { toCanvas } from '../viewport';

let sKey: PoseTrack | null = null;
let sVal = 1;
const scaleOf = (track: PoseTrack) => {
  if (track !== sKey) {
    sKey = track;
    sVal = bodyScale(track);
  }
  return sVal;
};

export function drawWeightShift(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take?.poses) return;
  const w = weightOffset(take.poses, take.contacts, t, scaleOf(take.poses));
  if (!w) return;
  const lm = frameAt(take.poses, t)?.lm ?? null;
  const hip = pelvis(lm);
  const foot = limbPoint(lm, w.foot);
  if (!hip || !foot) return;
  const top = toCanvas(view, hip);
  const bottom = toCanvas(view, { x: hip.x, y: foot.y });
  const color = Math.abs(w.offset) > WEIGHT_TOL ? '#ff3d3d' : '#ffffff';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  circle(ctx, top, 4);
  ctx.fillStyle = color;
  ctx.fill();
}

export function weightRows(s: AppState) {
  const m = activeTake(s)?.metrics?.tier2;
  if (!m) return [];
  return [{ label: tr('weight.offBalance'), value: `${Math.round(m.offBalance * 100)}%` }];
}
