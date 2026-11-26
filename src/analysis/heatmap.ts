// Foot-contact heatmap (Tier 2, ARCHITECTURE.md section 4.5, D35). Pure.
import { HEATMAP_COLS, HEATMAP_ROWS } from '../config';
import type { Contact, PoseTrack } from '../types';
import { limbSeries } from './limbs';

/**
 * For every LF/RF contact and every sample in [start, end], add 1 to the grid cell under that
 * foot. Divided by the strongest cell, so more visits and longer stays both read stronger.
 * Row-major cols × rows, values 0..1, the whole take.
 */
export function heatmap(track: PoseTrack, contacts: Contact[], cols = HEATMAP_COLS, rows = HEATMAP_ROWS): Float32Array {
  const grid = new Float32Array(cols * rows);
  const sr = track.sampleRate;
  const series = { LF: limbSeries(track, 'LF'), RF: limbSeries(track, 'RF') };
  for (const c of contacts) {
    if (c.limb !== 'LF' && c.limb !== 'RF') continue;
    const s = series[c.limb];
    for (let i = Math.ceil(c.start * sr - 1e-9); i <= Math.floor(c.end * sr + 1e-9) && i < s.length; i++) {
      const p = s[i];
      if (!p) continue;
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x * cols)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y * rows)));
      grid[cy * cols + cx] += 1;
    }
  }
  let max = 0;
  for (const v of grid) max = Math.max(max, v);
  if (max > 0) for (let k = 0; k < grid.length; k++) grid[k] /= max;
  return grid;
}
