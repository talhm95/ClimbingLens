// Jump performance (Tier 2, ARCHITECTURE.md sections 4.5 and 6). Pure.
import { JUMP_MATCH, JUMP_MIN_AIR, JUMP_SPEED } from '../config';
import type { Attempt, Contact, Jump, PoseTrack, Vec } from '../types';
import { bodyScale, pelvisSeries } from './limbs';

/**
 * An airborne sample is inside an attempt, has no limb contact covering it, and the smoothed
 * pelvis moves faster than JUMP_SPEED body scales / s. Each run of airborne samples lasting at
 * least JUMP_MIN_AIR is one jump (shorter runs are pose jitter on a small climber):
 * t = its first sample, v = pelvis velocity there (central difference, normalized units / s),
 * speed = |v| in body scales / s, firstLanding = limb of the earliest contact starting after t in
 * the same attempt.
 */
export function detectJumps(track: PoseTrack, contacts: Contact[], attempts: Attempt[]): Jump[] {
  const sr = track.sampleRate;
  const S = bodyScale(track);
  const p = pelvisSeries(track);
  const velocity = (i: number): Vec | null => {
    const a = p[i - 1] ?? p[i];
    const b = p[i + 1] ?? p[i];
    const ia = p[i - 1] ? i - 1 : i;
    const ib = p[i + 1] ? i + 1 : i;
    if (!a || !b || ib === ia) return null;
    return { x: ((b.x - a.x) * sr) / (ib - ia), y: ((b.y - a.y) * sr) / (ib - ia) };
  };
  const speedOf = (v: Vec) => Math.hypot(v.x * track.videoW, v.y * track.videoH) / S;

  const airborne = p.map((_, i) => {
    const t = i / sr;
    if (!attempts.some((a) => t >= a.start && t <= a.end)) return false;
    if (contacts.some((c) => c.start <= t && t <= c.end)) return false;
    const v = velocity(i);
    return !!v && speedOf(v) > JUMP_SPEED;
  });

  const jumps: Jump[] = [];
  let i = 0;
  while (i < airborne.length) {
    if (!airborne[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < airborne.length && airborne[j + 1]) j++;
    if ((j - i + 1) / sr >= JUMP_MIN_AIR - 1e-9) {
      const t = i / sr;
      const v = velocity(i)!;
      const attempt = attempts.find((a) => t >= a.start && t <= a.end)!;
      const next = contacts
        .filter((c) => c.start > t && c.start <= attempt.end)
        .sort((a, b) => a.start - b.start)[0];
      jumps.push({ t, v, speed: speedOf(v), firstLanding: next?.limb ?? null });
    }
    i = j + 1;
  }
  return jumps;
}

/** A's jump nearest to the aligned time tA, within JUMP_MATCH seconds, or null. */
export function matchJump(jumps: Jump[], tA: number): Jump | null {
  let best: Jump | null = null;
  for (const j of jumps) {
    const d = Math.abs(j.t - tA);
    if (d <= JUMP_MATCH && (!best || d < Math.abs(best.t - tA))) best = j;
  }
  return best;
}
