// A / B switch: swaps the video, overlays, list and panels; `enabled` stays as it is.
import { activeTake } from '../state/selectors';
import type { Store } from '../state/store';
import type { AppState } from '../types';
import { tr } from './i18n';

export function takeSwitcher(store: Store<AppState>): HTMLElement {
  const s = store.get();
  const wrap = document.createElement('div');
  wrap.className = 'switcher';
  for (const id of ['A', 'B'] as const) {
    const b = document.createElement('button');
    b.textContent = tr(id === 'A' ? 'take.A' : 'take.B');
    b.classList.toggle('active', s.active === id);
    b.disabled = !s.takes[id] || s.mode === 'processing';
    b.addEventListener('click', () => store.set({ active: id, mode: 'idle' }));
    wrap.append(b);
  }
  return wrap;
}

/** Keep the <video> showing the active take (outside processing, which drives the video itself). */
export function syncVideoToActiveTake(store: Store<AppState>, video: HTMLVideoElement): void {
  const sync = (s: AppState) => {
    if (s.mode === 'processing') return;
    const url = activeTake(s)?.url ?? '';
    // Also restores take A's video after a take B file that Chrome could not decode.
    if (url && video.src !== url) {
      const t = video.currentTime;
      video.src = url;
      video.addEventListener('loadedmetadata', () => (video.currentTime = Math.min(t, video.duration || 0)), { once: true });
    }
  };
  store.subscribe(sync);
  sync(store.get());
}
