import { frameAt } from '../../analysis/limbs';
import { MIN_VISIBILITY } from '../../config';
import { LEFT_SIDE, SKELETON_EDGES } from '../../pose/landmarks';
import { activeTake } from '../../state/selectors';
import type { AppState, Viewport } from '../../types';
import { circle } from '../draw';
import { toCanvas } from '../viewport';

// Left-side bones get a light blue tint so a left/right swap is easy to spot (task 4, Q2).
const LEFT = '#b3e5fc';
const RIGHT = '#ffffff';

export function drawSkeleton(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take?.poses) return;
  const lm = frameAt(take.poses, t)?.lm;
  if (!lm) return;
  const ok = (i: number) => lm[i] && lm[i].v >= MIN_VISIBILITY;

  ctx.save();
  ctx.lineCap = 'round';
  for (const pass of ['outline', 'fill'] as const) {
    for (const [a, b] of SKELETON_EDGES) {
      if (!ok(a) || !ok(b)) continue;
      const pa = toCanvas(view, lm[a]);
      const pb = toCanvas(view, lm[b]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      if (pass === 'outline') {
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      } else {
        ctx.lineWidth = 3;
        ctx.strokeStyle = LEFT_SIDE.has(a) && LEFT_SIDE.has(b) ? LEFT : RIGHT;
      }
      ctx.stroke();
    }
  }
  const joints = new Set(SKELETON_EDGES.flat());
  for (const i of joints) {
    if (!ok(i)) continue;
    circle(ctx, toCanvas(view, lm[i]), 3.5);
    ctx.fillStyle = LEFT_SIDE.has(i) ? LEFT : RIGHT;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.stroke();
  }
  ctx.restore();
}
