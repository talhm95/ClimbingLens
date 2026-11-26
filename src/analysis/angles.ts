// Joint angles (Tier 2, ARCHITECTURE.md section 4.5). A 2D projected angle, not the anatomical one.
import { MIN_VISIBILITY } from '../config';
import type { Landmark, PoseTrack, Vec } from '../types';

type Dims = Pick<PoseTrack, 'videoW' | 'videoH'>;

/** Angle at b (degrees, 0..180) between b→a and b→c, measured in pixels. */
export function angle2D(a: Vec, b: Vec, c: Vec, track: Dims): number {
  const ux = (a.x - b.x) * track.videoW;
  const uy = (a.y - b.y) * track.videoH;
  const vx = (c.x - b.x) * track.videoW;
  const vy = (c.y - b.y) * track.videoH;
  const n = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (n === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Elbow angles: left 11-13-15, right 12-14-16; null for a side with a landmark below MIN_VISIBILITY. */
export function elbowAngles(lm: Landmark[] | null, track: Dims): { left: number | null; right: number | null } {
  const side = (s: number, e: number, w: number) => {
    if (!lm || [s, e, w].some((i) => !lm[i] || lm[i].v < MIN_VISIBILITY)) return null;
    const a = angle2D(lm[s], lm[e], lm[w], track);
    return Number.isNaN(a) ? null : a;
  };
  return { left: side(11, 13, 15), right: side(12, 14, 16) };
}
