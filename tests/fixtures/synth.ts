// Synthetic PoseTracks for the analysis tests. 15 samples/s, 1000×1000 px video, shoulders at
// y 0.4 and hips at y 0.6, so the body scale S = 200 px (0.2 normalized units).
import type { Landmark, Limb, PoseTrack } from '../../src/types';

export type Keyframe = { t: number; x: number; y: number };

export const LIMB_LANDMARKS: Record<Limb, number[]> = {
  LH: [15, 17, 19],
  RH: [16, 18, 20],
  LF: [29, 31],
  RF: [30, 32],
};

/** Piecewise-linear position at time t; constant before the first and after the last keyframe. */
export function at(keys: Keyframe[], t: number): { x: number; y: number } {
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= b.t) {
      const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last.x, y: last.y };
}

export type SynthOptions = {
  duration: number;
  limbs: Partial<Record<Limb, Keyframe[]>>;
  /** Moves the whole torso: the hip midpoint follows these keyframes (shoulders stay 0.2 above). */
  pelvis?: Keyframe[];
  /** [from, to) time ranges with no person (lm: null). */
  missing?: [number, number][];
};

/**
 * Limbs listed in `limbs` follow their keyframes with visibility 1. Limbs not listed are invisible
 * (v = 0), so they produce no contacts and the tests only see the limbs they set up.
 */
export function synthTrack(o: SynthOptions): PoseTrack {
  const sampleRate = 15;
  const n = Math.round(o.duration * sampleRate);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    if (o.missing?.some(([a, b]) => t >= a - 1e-9 && t < b - 1e-9)) {
      frames.push({ t, lm: null });
      continue;
    }
    const p = o.pelvis ? at(o.pelvis, t) : { x: 0.5, y: 0.6 };
    const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: p.x, y: p.y - 0.1, v: 1 }));
    lm[11] = { x: p.x - 0.02, y: p.y - 0.2, v: 1 };
    lm[12] = { x: p.x + 0.02, y: p.y - 0.2, v: 1 };
    lm[23] = { x: p.x - 0.02, y: p.y, v: 1 };
    lm[24] = { x: p.x + 0.02, y: p.y, v: 1 };
    for (const limb of Object.keys(LIMB_LANDMARKS) as Limb[]) {
      const keys = o.limbs[limb];
      for (const idx of LIMB_LANDMARKS[limb]) {
        lm[idx] = keys ? { ...at(keys, t), v: 1 } : { x: 0, y: 0, v: 0 };
      }
    }
    frames.push({ t, lm });
  }
  return { sampleRate, videoW: 1000, videoH: 1000, frames };
}

/** A limb that holds still at (x, y) from t0 to t1. */
export const still = (x: number, y: number, t0: number, t1: number): Keyframe[] => [
  { t: t0, x, y },
  { t: t1, x, y },
];
