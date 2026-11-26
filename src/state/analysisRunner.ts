// Re-runs the analysis of a take whenever its poses, holds or attempts change (milliseconds:
// pure array math on the stored PoseTrack). Playback only reads the results.
import { analyzeTake } from '../analysis/analyzeTake';
import type { AppState, Take } from '../types';
import { updateTake, type Store } from './store';

function inputsOf(t: Take): unknown[] {
  // In auto mode `attempts` is an output, so it is not an input.
  return [t.poses, t.holds, t.duration, t.attemptsSource, t.attemptsSource === 'manual' ? t.attempts : null];
}

export function startAnalysisRunner(store: Store<AppState>): void {
  const last: Record<'A' | 'B', unknown[] | null> = { A: null, B: null };
  const run = (s: AppState) => {
    for (const id of ['A', 'B'] as const) {
      const take = s.takes[id];
      if (!take?.poses) {
        last[id] = null;
        continue;
      }
      const inputs = inputsOf(take);
      if (last[id] && inputs.every((v, k) => v === last[id]![k])) continue;
      last[id] = inputs;
      const r = analyzeTake(take);
      updateTake(store, id, {
        contacts: r.contacts,
        metrics: r.metrics,
        ...(take.attemptsSource === 'auto' ? { attempts: r.attempts } : {}),
      });
    }
  };
  store.subscribe(run);
  run(store.get());
}
