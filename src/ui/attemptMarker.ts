// Manual attempt marks (D18): "Attempt start" / "Attempt end" at the playhead, "Clear attempts",
// and "Auto-detect" to go back to automatic attempts (D37).
import { activeTake } from '../state/selectors';
import { updateTake, type Store } from '../state/store';
import type { AppState } from '../types';
import { bdi, mmss } from './format';
import { tr } from './i18n';

export function renderAttemptMarker(root: HTMLElement, store: Store<AppState>, video: HTMLVideoElement): void {
  // A start without an end yet. UI-only: analysis ignores it until the attempt is closed.
  let pending: { take: 'A' | 'B'; start: number } | null = null;

  const button = (key: string, onClick: () => void, disabled: boolean) => {
    const b = document.createElement('button');
    b.textContent = tr(key);
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  };

  const render = (s: AppState) => {
    root.replaceChildren();
    const take = activeTake(s);
    const ready = !!take?.poses && s.mode !== 'processing';
    if (pending && pending.take !== s.active) pending = null;

    const start = button('attempts.start', () => {
      const st = store.get();
      const t = activeTake(st);
      if (!t) return;
      // The first manual mark replaces the automatic attempts.
      if (t.attemptsSource === 'auto') updateTake(store, st.active, { attemptsSource: 'manual', attempts: [] });
      pending = { take: st.active, start: video.currentTime };
      render(store.get());
    }, !ready);

    const end = button('attempts.end', () => {
      const st = store.get();
      const t = activeTake(st);
      if (!t || !pending) return;
      const a = { start: pending.start, end: video.currentTime };
      pending = null;
      updateTake(store, st.active, { attemptsSource: 'manual', attempts: [...t.attempts, a] });
    }, !ready || !pending);

    const clear = button('attempts.clear', () => {
      pending = null;
      updateTake(store, store.get().active, { attemptsSource: 'manual', attempts: [] });
    }, !ready);

    const auto = button('attempts.auto', () => {
      pending = null;
      updateTake(store, store.get().active, { attemptsSource: 'auto' });
    }, !ready || take?.attemptsSource === 'auto');

    root.append(start, end, clear, auto);

    if (take?.poses) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = take.attemptsSource === 'auto' ? tr('attempts.badgeAuto') : tr('attempts.badgeManual');
      root.append(badge);
    }
    if (pending) {
      const p = document.createElement('span');
      p.className = 'pending';
      p.append(tr('attempts.pending') + ' ', bdi(mmss(pending.start)));
      root.append(p);
    }
  };

  let key: unknown[] = [];
  const maybe = (s: AppState) => {
    const take = activeTake(s);
    const k = [s.mode, s.lang, s.active, !!take?.poses, take?.attemptsSource, take?.attempts];
    if (k.every((v, i) => v === key[i])) return;
    key = k;
    render(s);
  };
  maybe(store.get());
  store.subscribe(maybe);
}
