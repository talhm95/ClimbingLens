// Metrics from contacts and attempts (ARCHITECTURE.md section 4.4). Pure.
import { BLINK_WINDOW } from '../config';
import type { Attempt, Contact, Limb, Metrics } from '../types';

/**
 * Make attempt marks safe to use: swap reversed ones, clamp to [0, duration], drop zero-length
 * ones, sort, merge overlaps. Nothing left = the whole video is one attempt.
 */
export function normalizeAttempts(attempts: Attempt[], duration: number): Attempt[] {
  const clean = attempts
    .map((a) => ({ start: Math.min(a.start, a.end), end: Math.max(a.start, a.end) }))
    .map((a) => ({ start: Math.max(0, a.start), end: Math.min(duration, a.end) }))
    .filter((a) => a.end > a.start)
    .sort((a, b) => a.start - b.start);
  const out: Attempt[] = [];
  for (const a of clean) {
    const last = out[out.length - 1];
    if (last && a.start <= last.end) last.end = Math.max(last.end, a.end);
    else out.push({ ...a });
  }
  return out.length ? out : [{ start: 0, end: duration }];
}

/** Seconds since the previous attempt ended when t is in a rest; null in an attempt or before the first. */
export function restAt(attempts: Attempt[], t: number): number | null {
  let lastEnd: number | null = null;
  for (const a of attempts) {
    if (t >= a.start && t <= a.end) return null;
    if (a.end < t) lastEnd = a.end;
  }
  return lastEnd === null ? null : t - lastEnd;
}

/** Foot corrections within BLINK_WINDOW of t (for the blinking marker). Hands are never returned. */
export function activeCorrections(contacts: Contact[], t: number): { limb: Limb; at: number }[] {
  const out: { limb: Limb; at: number }[] = [];
  for (const c of contacts) {
    if (c.limb !== 'LF' && c.limb !== 'RF') continue;
    for (const at of c.corrections) if (Math.abs(t - at) <= BLINK_WINDOW) out.push({ limb: c.limb, at });
  }
  return out;
}

export function computeMetrics(contacts: Contact[], attempts: Attempt[]): Metrics {
  const touches = { LH: 0, RH: 0, LF: 0, RF: 0, total: 0 };
  const footCorrections = { LF: 0, RF: 0, total: 0 };
  for (const c of contacts) {
    touches[c.limb]++;
    touches.total++;
    if (c.limb === 'LF' || c.limb === 'RF') {
      footCorrections[c.limb] += c.corrections.length;
      footCorrections.total += c.corrections.length;
    }
  }
  return {
    touches,
    footCorrections,
    attempts: attempts.map((a) => ({ duration: a.end - a.start })),
    rests: attempts.slice(1).map((a, i) => ({ duration: a.start - attempts[i].end })),
  };
}
