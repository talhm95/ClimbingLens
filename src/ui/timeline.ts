// Timeline under the video: attempt bands, rest bands, marks from enabled layers (D32), playhead.
// Click to seek. Time runs left to right in both languages, like the video's own scrubber.
import { normalizeAttempts } from '../analysis/metrics';
import { isOn, LAYERS } from '../overlay/layers/registry';
import { activeTake } from '../state/selectors';
import type { Store } from '../state/store';
import type { AppState } from '../types';

export function renderTimeline(root: HTMLElement, store: Store<AppState>, video: HTMLVideoElement): void {
  root.dir = 'ltr';
  const bands = document.createElement('div');
  const marks = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'playhead';
  root.append(bands, marks, head);

  const dur = () => activeTake(store.get())?.duration || video.duration || 0;
  const pct = (t: number) => `${(100 * t) / Math.max(dur(), 1e-6)}%`;

  const render = (s: AppState) => {
    bands.replaceChildren();
    marks.replaceChildren();
    const take = activeTake(s);
    if (!take?.poses || !take.duration) return;
    const attempts = normalizeAttempts(take.attempts, take.duration);
    const auto = take.attemptsSource === 'auto';
    let prevEnd: number | null = null;
    for (const a of attempts) {
      if (prevEnd !== null && a.start > prevEnd) bands.append(band('rest', prevEnd, a.start));
      const b = band('attempt', a.start, a.end);
      if (auto) b.classList.add('auto');
      bands.append(b);
      prevEnd = a.end;
    }
    for (const layer of LAYERS) {
      if (!layer.timelineMarks || !isOn(layer, s)) continue;
      for (const m of layer.timelineMarks(s)) {
        const el = document.createElement('div');
        el.className = `mark ${m.kind}`;
        el.style.insetInlineStart = pct(m.t);
        el.style.background = m.color;
        marks.append(el);
      }
    }
  };

  const band = (kind: 'attempt' | 'rest', a: number, b: number) => {
    const el = document.createElement('div');
    el.className = `band ${kind}`;
    el.style.insetInlineStart = pct(a);
    el.style.inlineSize = `calc(${pct(b)} - ${pct(a)})`;
    return el;
  };

  root.addEventListener('click', (e) => {
    const r = root.getBoundingClientRect();
    const d = dur();
    if (!d) return;
    video.currentTime = Math.min(d, Math.max(0, ((e.clientX - r.left) / r.width) * d));
  });

  const tick = () => {
    head.style.insetInlineStart = pct(video.currentTime);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  let key: unknown[] = [];
  const maybe = (s: AppState) => {
    const take = activeTake(s);
    const k = [take?.contacts, take?.attempts, take?.attemptsSource, take?.poses, take?.tier2, s.enabled, s.active];
    if (k.every((v, i) => v === key[i])) return;
    key = k;
    render(s);
  };
  maybe(store.get());
  store.subscribe(maybe);
}
