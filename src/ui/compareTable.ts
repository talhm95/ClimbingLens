// "label · a → b (Δ)" for each checked metric (SPEC.md section 5). Lower is better for every
// Tier 1 row (fewer touches or corrections, shorter time).
import { diffMetrics, firstAttemptMetrics, type DiffRow } from '../analysis/compare';
import { isOn, LAYERS } from '../overlay/layers/registry';
import type { AppState } from '../types';
import { bdi } from './format';
import { tr } from './i18n';
import type { PanelExtra } from './metricsPanel';

const fmt = (v: number, unit: DiffRow['unit']) =>
  unit === 's' ? `${v.toFixed(1)} s` : unit === '%' ? `${Math.round(v)}%` : unit === 'S/s' ? v.toFixed(1) : String(Math.round(v));
const signed = (v: number, unit: DiffRow['unit']) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v), unit);

function rowLabel(key: string): string {
  const [group, part] = key.split('.');
  const name = tr(`diff.${group}`);
  if (part === 'total') return `${name} (${tr('metrics.total')})`;
  if (part === 'firstSpeed') return tr('jump.firstSpeed');
  if (part === 'LH' || part === 'RH' || part === 'LF' || part === 'RF') return `${name} ${part}`;
  return name;
}

export const compareTableExtra: PanelExtra = (root, s: AppState) => {
  const layer = LAYERS.find((l) => l.id === 'comparison');
  const ta = s.takes.A;
  const tb = s.takes.B;
  if (!layer || !isOn(layer, s) || !ta?.metrics || !tb?.metrics) return;
  // Attempt against attempt: the first attempt of each take (D19).
  const A = firstAttemptMetrics(ta);
  const B = firstAttemptMetrics(tb);
  const box = document.createElement('div');
  box.className = 'group compare';
  const h = document.createElement('h3');
  h.style.fontSize = '0.9rem';
  h.textContent = tr('diff.title');
  box.append(h);
  const rows = diffMetrics(A, B, s.enabled);
  if (!rows.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = tr('diff.none');
    box.append(p);
  }
  for (const r of rows) {
    const line = document.createElement('div');
    line.className = 'row';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = rowLabel(r.key);
    const v = document.createElement('span');
    const delta = bdi(signed(r.delta, r.unit));
    // Fewer and shorter is better; jumps are neutral (faster is not always better, D33).
    const neutral = r.key.startsWith('jumps.');
    delta.className = neutral || r.delta === 0 ? 'muted' : r.delta < 0 ? 'better' : 'worse';
    // Separate runs plus a direction-aware arrow: "6 → 2" in English, A on the right in Hebrew.
    v.append(bdi(fmt(r.a, r.unit)), ` ${tr('arrow')} `, bdi(fmt(r.b, r.unit)), ' (', delta, ')');
    line.append(l, v);
    box.append(line);
  }
  root.append(box);
};
