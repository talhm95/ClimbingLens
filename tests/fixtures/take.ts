import type { Hold, PoseTrack, Take } from '../../src/types';

export function takeOf(poses: PoseTrack | null, holds: Hold[], extra: Partial<Take> = {}): Take {
  return {
    id: 'A',
    fileName: 'synth.mp4',
    url: '',
    duration: poses ? poses.frames.length / poses.sampleRate : 0,
    poses,
    holds,
    attempts: [],
    attemptsSource: 'manual',
    contacts: [],
    metrics: null,
    ...extra,
  };
}
