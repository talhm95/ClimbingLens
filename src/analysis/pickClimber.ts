// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.
// Choose the climber among the people detected in one frame (D36).
import { CLIMBER_MAX_JUMP } from '../config';
import type { Landmark, Vec } from '../types';

type Dims = { videoW: number; videoH: number };

const mid = (a: Landmark, b: Landmark): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const px = (a: Vec, b: Vec, d: Dims) => Math.hypot((a.x - b.x) * d.videoW, (a.y - b.y) * d.videoH);

function torsoPx(lm: Landmark[], d: Dims): number {
  return px(mid(lm[11], lm[12]), mid(lm[23], lm[24]), d);
}

/** Hip midpoint of a full landmark set (visibility ignored; used only for continuity). */
export function pelvisOf(lm: Landmark[]): Vec {
  return mid(lm[23], lm[24]);
}

/**
 * With a previous pelvis: the candidate nearest to it, if it is within CLIMBER_MAX_JUMP of its
 * own torso length; otherwise null, so a passer-by is never picked up. Without one: the longest torso.
 */
export function pickClimber(candidates: Landmark[][], prevPelvis: Vec | null, dims: Dims): Landmark[] | null {
  if (candidates.length === 0) return null;
  if (!prevPelvis) {
    let best = candidates[0];
    for (const c of candidates) if (torsoPx(c, dims) > torsoPx(best, dims)) best = c;
    return best;
  }
  let best: Landmark[] | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = px(pelvisOf(c), prevPelvis, dims);
    const L = torsoPx(c, dims);
    if (L > 0 && d / L <= CLIMBER_MAX_JUMP && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}
