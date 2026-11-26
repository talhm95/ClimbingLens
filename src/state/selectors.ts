import type { AppState, Take } from '../types';

export function activeTake(s: AppState): Take | null {
  return s.takes[s.active];
}
