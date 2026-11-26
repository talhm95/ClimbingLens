// Two-take overlay (SPEC.md section 5, D22): while take B plays, A's whole pelvis path in grey,
// B's path so far in green, and a grey dot where A's pelvis was at the aligned time.
import { buildAnchors, timeMap } from '../../analysis/alignment';
import { bodyScale, breakJumps, pelvisSeries } from '../../analysis/limbs';
import { PATH_BREAK } from '../../config';
import { normalizeAttempts } from '../../analysis/metrics';
import type { AppState, Take, Vec, Viewport } from '../../types';
import { circle, polyline } from '../draw';
import { toCanvas } from '../viewport';

type Cache = {
  key: unknown[];
  map: (tB: number) => number;
  pathA: (Vec | null)[]; // A's pelvis over its first attempt
  pelvisA: (Vec | null)[];
  pelvisB: (Vec | null)[];
  startB: number;
  srA: number;
  srB: number;
};
let cache: Cache | null = null;

function prepare(A: Take, B: Take): Cache {
  const key = [A.contacts, B.contacts, A.attempts, B.attempts, A.poses, B.poses];
  if (cache && key.every((v, i) => v === cache!.key[i])) return cache;
  const pelvisA = breakJumps(pelvisSeries(A.poses!), A.poses!, bodyScale(A.poses!), PATH_BREAK);
  const pelvisB = breakJumps(pelvisSeries(B.poses!), B.poses!, bodyScale(B.poses!), PATH_BREAK);
  const a0 = normalizeAttempts(A.attempts, A.duration)[0];
  const srA = A.poses!.sampleRate;
  const pathA = pelvisA.slice(Math.round(a0.start * srA), Math.round(a0.end * srA) + 1);
  cache = {
    key,
    map: timeMap(buildAnchors(A, B)),
    pathA,
    pelvisA,
    pelvisB,
    startB: normalizeAttempts(B.attempts, B.duration)[0].start,
    srA,
    srB: B.poses!.sampleRate,
  };
  return cache;
}

export function drawComparison(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const A = s.takes.A;
  const B = s.takes.B;
  if (s.active !== 'B' || !A?.poses || !B?.poses) return;
  const c = prepare(A, B);
  const toC = (p: Vec | null) => (p ? toCanvas(view, p) : null);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  polyline(ctx, c.pathA.map(toC));
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(158,158,158,0.9)';
  ctx.stroke();

  const i0 = Math.round(c.startB * c.srB);
  const i1 = Math.round(t * c.srB);
  if (i1 > i0) {
    polyline(ctx, c.pelvisB.slice(i0, i1 + 1).map(toC));
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00e676';
    ctx.stroke();
  }

  const pa = c.pelvisA[Math.round(c.map(t) * c.srA)];
  if (pa) {
    circle(ctx, toCanvas(view, pa), 8);
    ctx.fillStyle = '#9e9e9e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
}
