// Limb points, pose lookup and body scale (ARCHITECTURE.md section 4.2). Pure.
import type { PoseFrame, PoseTrack } from '../types';

/** Nearest pose sample to time t, or null outside the track. */
export function frameAt(track: PoseTrack, t: number): PoseFrame | null {
  const i = Math.round(t * track.sampleRate);
  if (i < 0 || i >= track.frames.length) return null;
  return track.frames[i];
}
