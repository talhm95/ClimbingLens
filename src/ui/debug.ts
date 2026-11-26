// Dev-only helper (D28): with ?debug in the URL, a button downloads the active take's PoseTrack
// as poses-<fileName>.json, for threshold tuning and test fixtures. Not a user feature.
import { activeTake } from '../state/selectors';
import type { Store } from '../state/store';
import type { AppState } from '../types';

export function mountDebug(root: HTMLElement, store: Store<AppState>): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const btn = document.createElement('button');
  btn.textContent = 'Export poses.json';
  btn.addEventListener('click', () => {
    const take = activeTake(store.get());
    if (!take?.poses) return;
    const blob = new Blob([JSON.stringify(take.poses)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `poses-${take.fileName.replace(/\.[^.]+$/, '')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  root.append(btn);
}
