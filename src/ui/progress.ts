import type { Store } from '../state/store';
import type { AppState } from '../types';
import { tr } from './i18n';

/** Progress bar over the stage while poses are being processed. */
export function renderProgress(root: HTMLElement, store: Store<AppState>): void {
  root.innerHTML = '<div class="text"></div><div class="bar"><div class="fill"></div></div>';
  const text = root.querySelector<HTMLElement>('.text')!;
  const fill = root.querySelector<HTMLElement>('.fill')!;
  const update = (s: AppState) => {
    const on = s.mode === 'processing';
    root.classList.toggle('active', on);
    if (!on) return;
    const p = Math.round(s.progress * 100);
    text.textContent = tr('progress.processing', { p });
    fill.style.inlineSize = `${p}%`;
  };
  update(store.get());
  store.subscribe(update);
}

/** Show (or hide with null) the error banner over the stage. */
export function showMessage(text: string | null): void {
  const el = document.getElementById('message');
  if (!el) return;
  el.hidden = text === null;
  el.textContent = text ?? '';
}
