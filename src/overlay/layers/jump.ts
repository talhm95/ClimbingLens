// Jump performance (Tier 2): an arrow from the take-off pelvis along its velocity, length scaled to
// speed, labelled with the first limb to land. While B plays, A's matching jump is drawn in grey
// from the same origin, so direction and length compare side by side (ARCHITECTURE.md section 6).
import { buildAnchors, timeMap } from '../../analysis/alignment';
import { matchJump } from '../../analysis/jump';
import { bodyScale, frameAt, pelvis } from '../../analysis/limbs';
import { JUMP_ARROW_SCALE, JUMP_SHOW } from '../../config';
import { activeTake } from '../../state/selectors';
import type { AppState, Jump, PoseTrack, Take, TimelineMark, Vec, Viewport } from '../../types';
import { tr } from '../../ui/i18n';
import { outlinedText } from '../draw';
import { toCanvas } from '../viewport';

const scaleCache = new WeakMap<PoseTrack, number>();
const scaleOf = (track: PoseTrack) => {
  if (!scaleCache.has(track)) scaleCache.set(track, bodyScale(track));
  return scaleCache.get(track)!;
};

let mapKey: unknown[] = [];
let mapFn: (tB: number) => number = (t) => t;
function alignedTime(A: Take, B: Take, t: number): number {
  const key = [A.contacts, B.contacts, A.attempts, B.attempts];
  if (!key.every((v, i) => v === mapKey[i])) {
    mapKey = key;
    mapFn = timeMap(buildAnchors(A, B));
  }
  return mapFn(t);
}

function arrow(ctx: CanvasRenderingContext2D, from: Vec, j: Jump, track: PoseTrack, view: Viewport, color: string, label: string) {
  const dirX = j.v.x * track.videoW;
  const dirY = j.v.y * track.videoH;
  const n = Math.hypot(dirX, dirY);
  if (!n) return;
  const lenPx = j.speed * JUMP_ARROW_SCALE * scaleOf(track) * (view.w / track.videoW);
  const ux = dirX / n;
  const uy = dirY / n;
  const tip = { x: from.x + ux * lenPx, y: from.y + uy * lenPx };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[7, 'rgba(0,0,0,0.6)'], [4, color]] as const) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.moveTo(tip.x - ux * 14 - uy * 8, tip.y - uy * 14 + ux * 8);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x - ux * 14 + uy * 8, tip.y - uy * 14 - ux * 8);
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.stroke();
  }
  outlinedText(ctx, label, { x: tip.x + ux * 14, y: tip.y + uy * 14 }, 13, color);
}

export function drawJump(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take?.poses || !take.tier2) return;
  for (const j of take.tier2.jumps) {
    if (t < j.t || t > j.t + JUMP_SHOW) continue;
    const hip = pelvis(frameAt(take.poses, j.t)?.lm ?? null);
    if (!hip) continue;
    const from = toCanvas(view, hip);
    const A = s.takes.A;
    if (s.active === 'B' && A?.poses && A.tier2) {
      const a = matchJump(A.tier2.jumps, alignedTime(A, take, j.t));
      if (a) arrow(ctx, from, a, A.poses, view, '#9e9e9e', `A → ${a.firstLanding ?? '?'}`);
    }
    arrow(ctx, from, j, take.poses, view, '#ffea00', `→ ${j.firstLanding ?? '?'}`);
  }
}

export function jumpRows(s: AppState) {
  const m = activeTake(s)?.metrics?.tier2;
  if (!m) return [];
  return [
    { label: tr('jump.count'), value: String(m.jumps) },
    { label: tr('jump.firstSpeed'), value: m.firstJumpSpeed === null ? '–' : m.firstJumpSpeed.toFixed(1) },
  ];
}

export function jumpMarks(s: AppState): TimelineMark[] {
  return (activeTake(s)?.tier2?.jumps ?? []).map((j) => ({ t: j.t, color: '#ffea00', kind: 'event' as const }));
}
