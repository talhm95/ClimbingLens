import { describe, expect, it } from 'vitest';
import { createStore } from '../src/state/store';

describe('createStore', () => {
  it('set merges the patch', () => {
    const s = createStore({ a: 1, b: 2 });
    s.set({ b: 3 });
    expect(s.get()).toEqual({ a: 1, b: 3 });
  });

  it('set accepts an updater function', () => {
    const s = createStore({ n: 1 });
    s.set((st) => ({ n: st.n + 1 }));
    expect(s.get().n).toBe(2);
  });

  it('subscribe fires once per set', () => {
    const s = createStore({ n: 0 });
    let calls = 0;
    s.subscribe(() => calls++);
    s.set({ n: 1 });
    s.set({ n: 2 });
    expect(calls).toBe(2);
  });

  it('unsubscribe stops notifications', () => {
    const s = createStore({ n: 0 });
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.set({ n: 1 });
    off();
    s.set({ n: 2 });
    expect(calls).toBe(1);
  });
});
