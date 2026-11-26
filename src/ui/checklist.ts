import { isAvailable, LAYERS } from '../overlay/layers/registry';
import type { Store } from '../state/store';
import type { AppState } from '../types';
import { label, tr } from './i18n';

/** One checkbox per registry entry; toggling sets state.enabled[id]. */
export function renderChecklist(root: HTMLElement, store: Store<AppState>): void {
  const render = (s: AppState) => {
    root.replaceChildren();
    root.className = 'checklist';
    const h = document.createElement('h2');
    h.textContent = tr('checklist.title');
    root.append(h);
    for (const layer of LAYERS) {
      const avail = isAvailable(layer, s);
      const row = document.createElement('label');
      row.classList.toggle('unavailable', !avail);
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = s.enabled[layer.id];
      box.addEventListener('change', () => store.set((st) => ({ enabled: { ...st.enabled, [layer.id]: box.checked } })));
      const text = document.createElement('span');
      text.textContent = label(layer.label);
      row.append(box, text);
      if (layer.tier === 2) {
        const tier = document.createElement('span');
        tier.className = 'tier';
        tier.textContent = tr('checklist.tier2');
        row.append(tier);
      }
      root.append(row);
    }
  };
  // Re-render only when something the checklist shows changes.
  let key = '';
  const maybe = (s: AppState) => {
    const k = JSON.stringify([s.enabled, s.lang, LAYERS.map((l) => isAvailable(l, s))]);
    if (k === key) return;
    key = k;
    render(s);
  };
  maybe(store.get());
  store.subscribe(maybe);
}
