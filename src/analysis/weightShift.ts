// Weight shift over the supporting foot (Tier 2, ARCHITECTURE.md section 4.5). Pure.
import { WEIGHT_TOL } from '../config';
import type { Attempt, Contact, Limb, PoseTrack } from '../types';
import { bodyScale, frameAt, limbPoint, pelvis } from './limbs';

export type WeightOffset = { offset: number; foot: Limb };

/**
 * Supporting foot = the foot with a contact covering t (both: the lower one, larger y).
 * offset = (pelvis.x − foot.x) × videoW / S, signed, in body scales. Back view, so this is the
 * sideways offset of the hips over the foot. null when no foot is in contact or a point is missing.
 * Pass S when calling per frame (bodyScale is a median over the whole track).
 */
export function weightOffset(track: PoseTrack, contacts: Contact[], t: number, S = bodyScale(track)): WeightOffset | null {
  const lm = frameAt(track, t)?.lm ?? null;
  const hip = pelvis(lm);
  if (!hip) return null;
  let best: { foot: Limb; x: number; y: number } | null = null;
  for (const foot of ['LF', 'RF'] as const) {
    if (!contacts.some((c) => c.limb === foot && c.start <= t && t <= c.end)) continue;
    const p = limbPoint(lm, foot);
    if (p && (!best || p.y > best.y)) best = { foot, ...p };
  }
  if (!best) return null;
  return { offset: ((hip.x - best.x) * track.videoW) / S, foot: best.foot };
}

/** Share of samples inside attempts with a supporting foot where |offset| > WEIGHT_TOL (0..1). */
export function offBalanceFraction(track: PoseTrack, contacts: Contact[], attempts: Attempt[]): number {
  const S = bodyScale(track);
  let supported = 0;
  let off = 0;
  for (const f of track.frames) {
    if (!attempts.some((a) => f.t >= a.start && f.t <= a.end)) continue;
    const w = weightOffset(track, contacts, f.t, S);
    if (!w) continue;
    supported++;
    if (Math.abs(w.offset) > WEIGHT_TOL) off++;
  }
  return supported ? off / supported : 0;
}
