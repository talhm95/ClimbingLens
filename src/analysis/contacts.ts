// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.
// Contact detection (ARCHITECTURE.md section 4.3, D15, D16). A contact needs both "where"
// (on a hold, with hysteresis) and "still" (the limb settled). Pure.
import { HOLD_DWELL, HOLD_RADIUS, MIN_STILL, RELEASE_RADIUS, STILL_SPEED } from '../config';
import type { Attempt, Contact, Hold, Limb, PoseTrack, Vec } from '../types';
import { distPx, LIMBS, limbSeries } from './limbs';

export type AnalysisCtx = { track: PoseTrack; S: number; holds: Hold[] };
export type Run = { i0: number; i1: number }; // inclusive sample indices
export type Stay = { limb: Limb; holdId: number; i0: number; i1: number };

const EPS = 1e-9;
const tOf = (i: number, ctx: AnalysisCtx) => i / ctx.track.sampleRate;
const runSeconds = (r: Run, ctx: AnalysisCtx) => (r.i1 - r.i0 + 1) / ctx.track.sampleRate;
/** Distance in body scales. */
const dS = (a: Vec, b: Vec, ctx: AnalysisCtx) => distPx(a, b, ctx.track) / ctx.S;

/**
 * A sample is still when its speed to the next sample (the previous one at the end) is below
 * STILL_SPEED body scales / s. The forward difference marks the arrival sample as still and the
 * last sample before a move as still, so runs are not shifted in time.
 */
export function stillMask(series: (Vec | null)[], ctx: AnalysisCtx): boolean[] {
  const sr = ctx.track.sampleRate;
  return series.map((p, i) => {
    if (!p) return false;
    const prev = i > 0 ? series[i - 1] : null;
    const next = i + 1 < series.length ? series[i + 1] : null;
    const q = next ?? prev;
    if (!q) return false;
    return dS(p, q, ctx) * sr < STILL_SPEED;
  });
}

/** Still runs lasting at least MIN_STILL. */
export function stillSegments(series: (Vec | null)[], ctx: AnalysisCtx): Run[] {
  const mask = stillMask(series, ctx);
  const runs: Run[] = [];
  let i = 0;
  while (i < mask.length) {
    if (!mask[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < mask.length && mask[j + 1]) j++;
    const r = { i0: i, i1: j };
    if (runSeconds(r, ctx) >= MIN_STILL - EPS) runs.push(r);
    i = j + 1;
  }
  return runs;
}

function nearestHold(p: Vec, ctx: AnalysisCtx, maxS: number): { hold: Hold; d: number } | null {
  let best: { hold: Hold; d: number } | null = null;
  for (const h of ctx.holds) {
    const d = dS(p, h, ctx);
    if (d <= maxS + EPS && (!best || d < best.d)) best = { hold: h, d };
  }
  return best;
}

/**
 * Walk one limb's samples with hysteresis: enter a hold within HOLD_RADIUS, keep it until farther
 * than RELEASE_RADIUS, unless another hold within HOLD_RADIUS is closer ("a deeper hold wins").
 * A null sample ends the stay.
 */
export function holdStays(series: (Vec | null)[], limb: Limb, ctx: AnalysisCtx): Stay[] {
  const stays: Stay[] = [];
  let cur: Stay | null = null;
  const close = () => {
    if (cur) stays.push(cur);
    cur = null;
  };
  const open = (holdId: number, i: number) => {
    cur = { limb, holdId, i0: i, i1: i };
  };
  series.forEach((p, i) => {
    if (!p) return close();
    if (cur) {
      const held = ctx.holds.find((h) => h.id === cur!.holdId)!;
      const d = dS(p, held, ctx);
      if (d <= RELEASE_RADIUS + EPS) {
        const near = nearestHold(p, ctx, HOLD_RADIUS);
        if (near && near.hold.id !== cur.holdId && near.d < d) {
          close();
          open(near.hold.id, i);
        } else {
          cur.i1 = i;
        }
        return;
      }
      close();
    }
    const near = nearestHold(p, ctx, HOLD_RADIUS);
    if (near) open(near.hold.id, i);
  });
  close();
  return stays;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianPos(series: (Vec | null)[], r: Run): Vec {
  const pts = series.slice(r.i0, r.i1 + 1).filter((p): p is Vec => !!p);
  return { x: median(pts.map((p) => p.x)), y: median(pts.map((p) => p.y)) };
}

/** Still runs clipped to [i0, i1] that still last at least MIN_STILL. */
function stillsWithin(stills: Run[], i0: number, i1: number, ctx: AnalysisCtx): Run[] {
  return stills
    .map((r) => ({ i0: Math.max(r.i0, i0), i1: Math.min(r.i1, i1) }))
    .filter((r) => r.i1 >= r.i0 && runSeconds(r, ctx) >= MIN_STILL - EPS);
}

/**
 * A stay becomes a contact when it lasts HOLD_DWELL and contains a still run of MIN_STILL.
 * start = first sample of the stay (backdated); pos = median of its first still run;
 * corrections = start times of the 2nd, 3rd, … still runs (re-settles on the same hold, D16).
 */
export function confirmStays(stays: Stay[], series: (Vec | null)[], stills: Run[], ctx: AnalysisCtx): Contact[] {
  const out: Contact[] = [];
  for (const s of stays) {
    if (runSeconds(s, ctx) < HOLD_DWELL - EPS) continue;
    const runs = stillsWithin(stills, s.i0, s.i1, ctx);
    if (!runs.length) continue;
    out.push({
      limb: s.limb,
      holdId: s.holdId,
      start: tOf(s.i0, ctx),
      end: tOf(s.i1, ctx),
      pos: medianPos(series, runs[0]),
      corrections: runs.slice(1).map((r) => tOf(r.i0, ctx)),
      attempt: -1,
    });
  }
  return out;
}

/** A still foot with no confirmed contact at that time is a smear on the wall (holdId null). */
export function footSmears(series: (Vec | null)[], limb: 'LF' | 'RF', stills: Run[], confirmed: Contact[], ctx: AnalysisCtx): Contact[] {
  const mine = confirmed.filter((c) => c.limb === limb);
  return stills
    .filter((r) => {
      const a = tOf(r.i0, ctx);
      const b = tOf(r.i1, ctx);
      return !mine.some((c) => c.start <= b + EPS && a <= c.end + EPS);
    })
    .map((r) => ({
      limb,
      holdId: null,
      start: tOf(r.i0, ctx),
      end: tOf(r.i1, ctx),
      pos: medianPos(series, r),
      corrections: [],
      attempt: -1,
    }));
}

/** All four limbs over the whole video, sorted by start. Attempts are applied later. */
export function detectContacts(ctx: AnalysisCtx): Contact[] {
  const all: Contact[] = [];
  for (const limb of LIMBS) {
    const series = limbSeries(ctx.track, limb);
    const stills = stillSegments(series, ctx);
    const confirmed = confirmStays(holdStays(series, limb, ctx), series, stills, ctx);
    all.push(...confirmed);
    if (limb === 'LF' || limb === 'RF') all.push(...footSmears(series, limb, stills, confirmed, ctx));
  }
  return all.sort((a, b) => a.start - b.start || LIMBS.indexOf(a.limb) - LIMBS.indexOf(b.limb));
}

/**
 * Clip each contact to the attempt it overlaps most and set `attempt`. Contacts outside every
 * attempt are dropped, and so are corrections outside the clipped range.
 */
export function clipToAttempts(contacts: Contact[], attempts: Attempt[]): Contact[] {
  const out: Contact[] = [];
  for (const c of contacts) {
    let best = -1;
    let bestOverlap = 0;
    attempts.forEach((a, k) => {
      const ov = Math.min(c.end, a.end) - Math.max(c.start, a.start);
      if (ov > bestOverlap || (best < 0 && ov === 0 && c.start >= a.start && c.start <= a.end)) {
        best = k;
        bestOverlap = ov;
      }
    });
    if (best < 0) continue;
    const a = attempts[best];
    const start = Math.max(c.start, a.start);
    const end = Math.min(c.end, a.end);
    out.push({ ...c, start, end, attempt: best, corrections: c.corrections.filter((t) => t >= start && t <= end) });
  }
  return out;
}
