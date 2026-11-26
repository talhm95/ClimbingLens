// Foot-contact watermark (Tier 2, D35): where the feet stood over the whole take; stronger = more
// visits or longer stays. Built once per analysis into a tiny offscreen canvas, then scaled up.
import { HEATMAP_COLS, HEATMAP_ROWS } from '../../config';
import { activeTake } from '../../state/selectors';
import type { AppState, Viewport } from '../../types';

let cacheKey: Float32Array | null = null;
let cacheCanvas: HTMLCanvasElement | null = null;

function build(grid: Float32Array): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = HEATMAP_COLS;
  c.height = HEATMAP_ROWS;
  const g = c.getContext('2d')!;
  const img = g.createImageData(HEATMAP_COLS, HEATMAP_ROWS);
  for (let k = 0; k < grid.length; k++) {
    // One warm colour; alpha = value × 0.5.
    img.data[k * 4] = 255;
    img.data[k * 4 + 1] = 120;
    img.data[k * 4 + 2] = 0;
    img.data[k * 4 + 3] = Math.round(grid[k] * 0.5 * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function drawHeatmap(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState): void {
  const grid = activeTake(s)?.tier2?.heatmap;
  if (!grid) return;
  if (grid !== cacheKey) {
    cacheKey = grid;
    cacheCanvas = build(grid);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.filter = 'blur(8px)';
  ctx.drawImage(cacheCanvas!, view.ox, view.oy, view.w, view.h);
  ctx.filter = 'none';
}
