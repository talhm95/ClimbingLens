// "Mark holds" mode (D4): click holds on the video in route order; they are numbered 1, 2, 3, …
import { lastViewport } from '../overlay/renderLoop';
import { toNorm } from '../overlay/viewport';
import { activeTake } from '../state/selectors';
import { updateTake, type Store } from '../state/store';
import type { AppState } from '../types';
import { tr } from './i18n';

export function renderHoldMarker(root: HTMLElement, store: Store<AppState>, video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
  const stage = canvas.parentElement!;

  canvas.addEventListener('click', (e) => {
    const s = store.get();
    const take = activeTake(s);
    if (s.mode !== 'markHolds' || !take) return;
    const r = canvas.getBoundingClientRect();
    const p = toNorm(lastViewport(), { x: e.clientX - r.left, y: e.clientY - r.top });
    if (!p) return; // a click in the black bars
    updateTake(store, s.active, { holds: [...take.holds, { id: take.holds.length + 1, x: p.x, y: p.y }] });
  });

  const button = (key: string, onClick: () => void, disabled = false, active = false) => {
    const b = document.createElement('button');
    b.textContent = tr(key);
    b.disabled = disabled;
    b.classList.toggle('active', active);
    b.addEventListener('click', onClick);
    return b;
  };

  const render = (s: AppState) => {
    const take = activeTake(s);
    const marking = s.mode === 'markHolds';
    stage.classList.toggle('marking', marking);
    root.replaceChildren();
    const h = document.createElement('h2');
    h.textContent = tr('holds.title');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '0.5rem';
    const canMark = !!take?.poses && s.mode !== 'processing';
    if (!marking) {
      row.append(
        button('holds.mark', () => {
          video.pause();
          video.currentTime = 0;
          store.set({ mode: 'markHolds' });
        }, !canMark),
      );
    } else {
      row.append(
        button('holds.done', () => store.set({ mode: 'idle' }), false, true),
        button('holds.undo', () => take && updateTake(store, s.active, { holds: take.holds.slice(0, -1) }), !take?.holds.length),
        button('holds.clear', () => take && updateTake(store, s.active, { holds: [] }), !take?.holds.length),
      );
    }
    const info = document.createElement('div');
    info.className = 'hint';
    const n = document.createElement('bdi');
    n.textContent = String(take?.holds.length ?? 0);
    info.append(marking ? tr('holds.hint') + ' ' : '', tr('holds.count') + ' ', n);
    root.append(h, row, info);
  };

  let key = '';
  const maybe = (s: AppState) => {
    const take = activeTake(s);
    const k = JSON.stringify([s.mode, s.lang, s.active, !!take?.poses, take?.holds.length]);
    if (k === key) return;
    key = k;
    render(s);
  };
  maybe(store.get());
  store.subscribe(maybe);
}
