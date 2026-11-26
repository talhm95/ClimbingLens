// Hand/foot drop events (Tier 2, ARCHITECTURE.md section 4.5, D34). Pure.
import { DROP_SPEED, DROP_WINDOW } from '../config';
import type { Contact, DropEvent, Limb, Vec } from '../types';
import type { AnalysisCtx } from './contacts';
import { distPx, rawLimbSeries } from './limbs';

/**
 * A drop = a contact that ends in a fast downward movement: within DROP_WINDOW after the contact
 * ends, the gap-filled but unsmoothed limb speed exceeds DROP_SPEED, and the net movement over
 * that window points mostly down (dy > 0 and |dy| > |dx|; image y grows downward).
 */
export function detectDrops(ctx: AnalysisCtx, contacts: Contact[]): DropEvent[] {
  const { track, S } = ctx;
  const sr = track.sampleRate;
  const series = new Map<Limb, (Vec | null)[]>();
  const seriesOf = (l: Limb) => {
    if (!series.has(l)) series.set(l, rawLimbSeries(track, l));
    return series.get(l)!;
  };
  const out: DropEvent[] = [];
  for (const c of contacts) {
    const s = seriesOf(c.limb);
    const i0 = Math.round(c.end * sr);
    const i1 = Math.min(s.length - 1, Math.round((c.end + DROP_WINDOW) * sr));
    if (i0 < 0 || i0 >= s.length) continue;
    let fast = false;
    let first: Vec | null = null;
    let last: Vec | null = null;
    for (let i = i0; i <= i1; i++) {
      const p = s[i];
      if (!p) continue;
      first ??= p;
      last = p;
      const q = i + 1 <= i1 ? s[i + 1] : null;
      if (q && (distPx(p, q, track) * sr) / S > DROP_SPEED) fast = true;
    }
    if (!fast || !first || !last) continue;
    const dx = (last.x - first.x) * track.videoW;
    const dy = (last.y - first.y) * track.videoH;
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) out.push({ limb: c.limb, t: c.end });
  }
  return out.sort((a, b) => a.t - b.t);
}
