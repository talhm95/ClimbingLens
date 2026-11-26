// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.
// Gap filling and per-run Gaussian smoothing of a point series (D14, D17). Pure.
import type { Vec } from '../types';

/**
 * Fill each run of nulls linearly when it has known points on both sides and the time between
 * those two known samples is ≤ maxGap seconds. Leading/trailing nulls and longer gaps stay null.
 */
export function interpolateGaps(pts: (Vec | null)[], dt: number, maxGap: number): (Vec | null)[] {
  const out = pts.slice();
  let last = -1; // index of the last known point
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!p) continue;
    if (last >= 0 && i - last > 1 && (i - last) * dt <= maxGap + 1e-9) {
      const a = pts[last]!;
      for (let k = last + 1; k < i; k++) {
        const u = (k - last) / (i - last);
        out[k] = { x: a.x + u * (p.x - a.x), y: a.y + u * (p.y - a.y) };
      }
    }
    last = i;
  }
  return out;
}

/**
 * Gaussian smoothing (kernel truncated at 3σ), applied separately to each contiguous non-null run
 * and renormalized over the samples that exist, so nothing is drawn across a gap. Nulls stay null.
 */
export function gaussianSmooth(pts: (Vec | null)[], sigma: number): (Vec | null)[] {
  if (sigma <= 0) return pts.slice();
  const R = Math.ceil(3 * sigma);
  const w = Array.from({ length: R + 1 }, (_, k) => Math.exp(-(k * k) / (2 * sigma * sigma)));
  const out: (Vec | null)[] = new Array(pts.length).fill(null);
  let i = 0;
  while (i < pts.length) {
    if (!pts[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pts.length && pts[j + 1]) j++;
    for (let k = i; k <= j; k++) {
      let sx = 0;
      let sy = 0;
      let sw = 0;
      for (let m = Math.max(i, k - R); m <= Math.min(j, k + R); m++) {
        const wk = w[Math.abs(m - k)];
        sx += wk * pts[m]!.x;
        sy += wk * pts[m]!.y;
        sw += wk;
      }
      out[k] = { x: sx / sw, y: sy / sw };
    }
    i = j + 1;
  }
  return out;
}
