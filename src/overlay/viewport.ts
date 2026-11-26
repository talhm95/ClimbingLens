// Mapping between normalized video coordinates and canvas CSS pixels (object-fit: contain).
import type { Vec, Viewport } from '../types';

export type { Viewport };

/** The rectangle the video occupies inside a canvas of canvasW × canvasH (letterboxed). */
export function computeViewport(canvasW: number, canvasH: number, videoW: number, videoH: number): Viewport {
  if (!videoW || !videoH) return { ox: 0, oy: 0, w: canvasW, h: canvasH };
  const scale = Math.min(canvasW / videoW, canvasH / videoH);
  const w = videoW * scale;
  const h = videoH * scale;
  return { ox: (canvasW - w) / 2, oy: (canvasH - h) / 2, w, h };
}

export function toCanvas(v: Viewport, p: Vec): Vec {
  return { x: v.ox + p.x * v.w, y: v.oy + p.y * v.h };
}

/** Canvas pixel → normalized video point, or null when it falls outside the video (black bars). */
export function toNorm(v: Viewport, px: Vec): Vec | null {
  const x = (px.x - v.ox) / v.w;
  const y = (px.y - v.oy) / v.h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}
