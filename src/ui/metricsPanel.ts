// Metrics rows of every enabled layer that has `metrics` (ARCHITECTURE.md section 5).
import { isOn, LAYERS } from '../overlay/layers/registry';
import { activeTake } from '../state/selectors';
import type { Store } from '../state/store';
import type { AppState } from '../types';
import { bdi } from './format';
import { label, tr } from './i18n';

/** Extra blocks rendered after the layer rows (rest timer, comparison table). */
export type PanelExtra = (root: HTMLElement, s: AppState) => void;

export function renderMetricsPanel(root: HTMLElement, store: Store<AppState>, extras: PanelExtra[] = []): void {
  const render = (s: AppState) => {
    root.replaceChildren();
    const h = document.createElement('h2');
    h.textContent = tr('metrics.title');
    root.append(h);
    const take = activeTake(s);
    if (!take?.metrics) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = tr('empty.noVideo');
      root.append(p);
      return;
    }
    for (const layer of LAYERS) {
      if (!layer.metrics || !isOn(layer, s)) continue;
      const rows = layer.metrics(s);
      if (!rows.length) continue;
      const group = document.createElement('div');
      group.className = 'group';
      const title = document.createElement('h3');
      title.textContent = label(layer.label);
      title.style.fontSize = '0.9rem';
      group.append(title);
      for (const r of rows) {
        const row = document.createElement('div');
        row.className = 'row';
        const l = document.createElement('span');
        l.className = 'label';
        l.append(bdi(r.label));
        row.append(l, bdi(r.value));
        group.append(row);
      }
      root.append(group);
    }
    for (const extra of extras) extra(root, s);
  };

  let key: unknown[] = [];
  const maybe = (s: AppState) => {
    const k = [s.takes.A?.metrics, s.takes.B?.metrics, s.takes.A?.attempts, s.takes.B?.attempts, s.enabled, s.lang, s.active];
    if (k.every((v, i) => v === key[i])) return;
    key = k;
    render(s);
  };
  maybe(store.get());
  store.subscribe(maybe);
}
