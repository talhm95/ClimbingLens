import type { AppState, Take } from '../types';

export type Store<T> = {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: (s: T) => void): () => void;
};

export function createStore<T>(init: T): Store<T> {
  let state = init;
  const subs = new Set<(s: T) => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...p };
      for (const fn of [...subs]) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

/** Merge a patch into one take. No-op when that take does not exist. */
export function updateTake(store: Store<AppState>, id: 'A' | 'B', patch: Partial<Take>): void {
  store.set((s) => {
    const take = s.takes[id];
    if (!take) return {};
    return { takes: { ...s.takes, [id]: { ...take, ...patch } } };
  });
}
