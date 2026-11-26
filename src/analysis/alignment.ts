// Time alignment of two takes by the first touch of each hold (SPEC.md section 5, D21). Pure.
import type { Contact, Take } from '../types';
import { normalizeAttempts } from './metrics';

export type Anchor = { a: number; b: number }; // a = time in take A, b = time in take B

/** holdId → earliest contact start in the given attempt; smears (null holds) are ignored. */
export function firstTouches(contacts: Contact[], attempt = 0): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of contacts) {
    if (c.attempt !== attempt || c.holdId === null) continue;
    const prev = m.get(c.holdId);
    if (prev === undefined || c.start < prev) m.set(c.holdId, c.start);
  }
  return m;
}

/**
 * Anchors: (start, start), (first touch in A, first touch in B) for every shared hold, (end, end),
 * using each take's first attempt. Pairs are sorted by B time and the longest chain that also
 * increases in A is kept, so a hold touched out of order cannot fold time backwards.
 */
export function buildAnchors(A: Take, B: Take): Anchor[] {
  const a0 = normalizeAttempts(A.attempts, A.duration)[0];
  const b0 = normalizeAttempts(B.attempts, B.duration)[0];
  const fa = firstTouches(A.contacts);
  const fb = firstTouches(B.contacts);
  const pairs: Anchor[] = [{ a: a0.start, b: b0.start }];
  for (const [hold, ta] of fa) {
    const tb = fb.get(hold);
    if (tb !== undefined) pairs.push({ a: ta, b: tb });
  }
  pairs.push({ a: a0.end, b: b0.end });
  pairs.sort((p, q) => p.b - q.b || p.a - q.a);

  // Longest chain strictly increasing in both a and b (O(n²); n is the number of holds).
  const len = pairs.map(() => 1);
  const prev = pairs.map(() => -1);
  for (let i = 0; i < pairs.length; i++) {
    for (let j = 0; j < i; j++) {
      if (pairs[j].a < pairs[i].a && pairs[j].b < pairs[i].b && len[j] + 1 > len[i]) {
        len[i] = len[j] + 1;
        prev[i] = j;
      }
    }
  }
  let k = len.indexOf(Math.max(...len));
  const chain: Anchor[] = [];
  while (k >= 0) {
    chain.push(pairs[k]);
    k = prev[k];
  }
  return chain.reverse();
}

/** Piecewise-linear B time → A time, clamped to the first and last anchors. */
export function timeMap(anchors: Anchor[]): (tB: number) => number {
  return (tB) => {
    if (!anchors.length) return tB;
    if (tB <= anchors[0].b) return anchors[0].a;
    const last = anchors[anchors.length - 1];
    if (tB >= last.b) return last.a;
    for (let i = 1; i < anchors.length; i++) {
      const p = anchors[i - 1];
      const q = anchors[i];
      if (tB <= q.b) return p.a + ((tB - p.b) / (q.b - p.b)) * (q.a - p.a);
    }
    return last.a;
  };
}
