// Draws the enabled layers over the video at the playhead time.
import type { Store } from '../state/store';
import type { AppState, Viewport } from '../types';
import { isOn, LAYERS } from './layers/registry';
import { computeViewport } from './viewport';

let currentView: Viewport = { ox: 0, oy: 0, w: 1, h: 1 };

/** The viewport of the last draw, used to map clicks on the canvas (hold marking). */
export function lastViewport(): Viewport {
  return currentView;
}

export function startRenderLoop(video: HTMLVideoElement, canvas: HTMLCanvasElement, store: Store<AppState>): void {
  const ctx = canvas.getContext('2d')!;
  let cssW = 1;
  let cssH = 1;
  // During playback the exact media time of the presented frame comes from requestVideoFrameCallback.
  let mediaTime = 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cssW = Math.max(1, r.width);
    cssH = Math.max(1, r.height);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    const s = store.get();
    ctx.clearRect(0, 0, cssW, cssH);
    if (s.mode === 'processing') return;
    const t = video.paused ? video.currentTime : mediaTime;
    currentView = computeViewport(cssW, cssH, video.videoWidth, video.videoHeight);
    for (const layer of LAYERS) {
      if (!layer.draw || !isOn(layer, s)) continue;
      ctx.save();
      try {
        layer.draw(ctx, currentView, s, t);
      } catch (e) {
        console.error(`layer ${layer.id} failed`, e);
      }
      ctx.restore();
    }
  };

  const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
    mediaTime = meta.mediaTime;
    video.requestVideoFrameCallback(onFrame);
  };
  video.requestVideoFrameCallback(onFrame);
  video.addEventListener('seeked', () => {
    mediaTime = video.currentTime;
  });
  video.addEventListener('play', () => {
    mediaTime = video.currentTime;
  });

  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);
  resize();

  // A steady animation loop: paused redraws (seek, store change, blinking markers) come for free.
  const loop = () => {
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
