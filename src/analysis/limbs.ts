// Limb points, pose lookup and body scale (ARCHITECTURE.md section 4.2). Pure.
import { FALLBACK_BODY_SCALE, MAX_INTERP_GAP, MIN_VISIBILITY, SMOOTH_SIGMA } from '../config';
import type { Landmark, Limb, PoseFrame, PoseTrack, Vec } from '../types';
import { gaussianSmooth, interpolateGaps } from './smoothing';

export const LIMBS: Limb[] = ['LH', 'RH', 'LF', 'RF'];

const LIMB_LANDMARKS: Record<Limb, number[]> = {
  LH: [15, 17, 19], // wrist, pinky, index
  RH: [16, 18, 20],
  LF: [29, 31], // heel, foot index (toe)
  RF: [30, 32],
};

/** Nearest pose sample to time t, or null outside the track. */
export function frameAt(track: PoseTrack, t: number): PoseFrame | null {
  const i = Math.round(t * track.sampleRate);
  if (i < 0 || i >= track.frames.length) return null;
  return track.frames[i];
}

/** Mean of the visible landmarks among `idx`, or null when none is visible. */
function meanOf(lm: Landmark[] | null, idx: number[]): Vec | null {
  if (!lm) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const i of idx) {
    const p = lm[i];
    if (!p || p.v < MIN_VISIBILITY) continue;
    x += p.x;
    y += p.y;
    n++;
  }
  return n ? { x: x / n, y: y / n } : null;
}

export function limbPoint(lm: Landmark[] | null, limb: Limb): Vec | null {
  return meanOf(lm, LIMB_LANDMARKS[limb]);
}

/** Hip midpoint (landmarks 23, 24). */
export function pelvis(lm: Landmark[] | null): Vec | null {
  return meanOf(lm, [23, 24]);
}

/** Raw limb points with short gaps filled, not smoothed (drop detection needs sharp speeds). */
export function rawLimbSeries(track: PoseTrack, limb: Limb): (Vec | null)[] {
  const raw = track.frames.map((f) => limbPoint(f.lm, limb));
  return interpolateGaps(raw, 1 / track.sampleRate, MAX_INTERP_GAP);
}

/** limbPoint → interpolateGaps(MAX_INTERP_GAP) → gaussianSmooth(SMOOTH_SIGMA). */
export function limbSeries(track: PoseTrack, limb: Limb): (Vec | null)[] {
  return gaussianSmooth(rawLimbSeries(track, limb), SMOOTH_SIGMA);
}

/** Pelvis series, gap-filled and smoothed like the limbs. */
export function pelvisSeries(track: PoseTrack): (Vec | null)[] {
  const raw = track.frames.map((f) => pelvis(f.lm));
  return gaussianSmooth(interpolateGaps(raw, 1 / track.sampleRate, MAX_INTERP_GAP), SMOOTH_SIGMA);
}

/**
 * For drawing a path: replace a sample with null where it is more than maxS body scales from the
 * previous one (a physically impossible step, i.e. the tracked person switched), so the line breaks.
 */
export function breakJumps(pts: (Vec | null)[], track: Pick<PoseTrack, 'videoW' | 'videoH'>, S: number, maxS: number): (Vec | null)[] {
  return pts.map((p, i) => {
    const q = i > 0 ? pts[i - 1] : null;
    return p && q && distPx(p, q, track) / S > maxS ? null : p;
  });
}

export function distPx(a: Vec, b: Vec, track: Pick<PoseTrack, 'videoW' | 'videoH'>): number {
  return Math.hypot((a.x - b.x) * track.videoW, (a.y - b.y) * track.videoH);
}

/**
 * Body scale S in pixels: the median torso length (shoulder midpoint to hip midpoint) over the
 * frames where both are visible. Falls back to a fraction of the video height when none is.
 */
export function bodyScale(track: PoseTrack): number {
  const lens: number[] = [];
  for (const f of track.frames) {
    const sh = meanOf(f.lm, [11, 12]);
    const hp = pelvis(f.lm);
    if (!sh || !hp || !f.lm) continue;
    if ([11, 12, 23, 24].some((i) => f.lm![i].v < MIN_VISIBILITY)) continue;
    lens.push(distPx(sh, hp, track));
  }
  if (!lens.length) return FALLBACK_BODY_SCALE * track.videoH;
  lens.sort((a, b) => a - b);
  const m = lens.length >> 1;
  return lens.length % 2 ? lens[m] : (lens[m - 1] + lens[m]) / 2;
}
