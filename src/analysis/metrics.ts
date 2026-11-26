// Metrics from contacts and attempts (ARCHITECTURE.md section 4.4). Pure.
import { BLINK_WINDOW } from '../config';
import type { Attempt, Contact, Limb, Metrics } from '../types';

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
