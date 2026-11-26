// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.
// Choose the climber among the people detected in one frame (D36).
import { CLIMBER_MAX_JUMP, CLIMBER_MIN_SPEED, CLIMBER_RESET } from '../config';
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

type Tracklet = { lastI: number; lastP: Vec; members: Map<number, Landmark[]>; travel: number; duration: number };

/** Pelvis travel in torso lengths, measured at ~1 s steps so pose jitter does not add up. */
function travelOf(members: Map<number, Landmark[]>, sampleRate: number, dims: Dims): number {
  const idx = [...members.keys()].sort((a, b) => a - b);
  let travel = 0;
  let prev = idx[0];
  for (const i of idx) {
    if (i - prev < sampleRate) continue;
    const a = members.get(prev)!;
    const b = members.get(i)!;
    const L = (torsoPx(a, dims) + torsoPx(b, dims)) / 2;
    if (L > 0) travel += px(pelvisOf(a), pelvisOf(b), dims) / L;
    prev = i;
  }
  return travel;
}

/**
 * Whole-clip climber selection (D39). Every detected person is linked frame to frame into
 * tracklets (pickClimber's continuity rule, gaps up to CLIMBER_RESET). People who barely move
 * (average speed below CLIMBER_MIN_SPEED torso lengths/s: seated or standing spectators) are
 * never chosen, unless nobody moves at all. In each frame the person whose tracklet travelled
 * furthest wins: on a tripod shot of a route, that is the climber.
 */
export function chooseClimber(cands: Landmark[][][], dims: Dims, sampleRate: number): (Landmark[] | null)[] {
  const tracklets: Tracklet[] = [];
  const owner: Map<Landmark[], Tracklet> = new Map();
  const resetSamples = CLIMBER_RESET * sampleRate;

  cands.forEach((frame, i) => {
    let avail = frame.slice();
    const open = tracklets
      .filter((T) => i - T.lastI <= resetSamples)
      .sort((a, b) => b.members.size - a.members.size);
    for (const T of open) {
      const pick = pickClimber(avail, T.lastP, dims);
      if (!pick) continue;
      T.members.set(i, pick);
      T.lastI = i;
      T.lastP = pelvisOf(pick);
      owner.set(pick, T);
      avail = avail.filter((c) => c !== pick);
    }
    for (const c of avail) {
      const T: Tracklet = { lastI: i, lastP: pelvisOf(c), members: new Map([[i, c]]), travel: 0, duration: 0 };
      tracklets.push(T);
      owner.set(c, T);
    }
  });

  for (const T of tracklets) {
    const idx = [...T.members.keys()];
    T.travel = travelOf(T.members, sampleRate, dims);
    T.duration = Math.max(1, (Math.max(...idx) - Math.min(...idx) + 1) / sampleRate);
  }
  const moving = new Set(tracklets.filter((T) => T.travel / T.duration >= CLIMBER_MIN_SPEED));
  const eligible = (T: Tracklet) => moving.size === 0 || moving.has(T);

  return cands.map((frame) => {
    let best: Landmark[] | null = null;
    let bestTravel = -1;
    for (const c of frame) {
      const T = owner.get(c)!;
      if (eligible(T) && T.travel > bestTravel) {
        best = c;
        bestTravel = T.travel;
      }
    }
    return best;
  });
}
