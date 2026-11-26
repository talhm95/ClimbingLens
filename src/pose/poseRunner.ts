// Runs MediaPipe PoseLandmarker once over a whole video (ARCHITECTURE.md section 4.1).
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { chooseClimber } from '../analysis/pickClimber';
import { MODEL, NUM_POSES, SAMPLE_RATE, SWAP_LR } from '../config';
import type { Landmark, PoseFrame, PoseTrack } from '../types';
import { LR_PAIRS } from './landmarks';
import { installOfflineGuard } from './offlineGuard';

let landmarker: PoseLandmarker | null = null;
let initPromise: Promise<void> | null = null;
// VIDEO mode needs strictly increasing timestamps across every call, also across videos.
let tsBase = 0;

const base = import.meta.env.BASE_URL;

async function create(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  installOfflineGuard();
  const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${base}models/pose_landmarker_${MODEL}.task`, delegate },
    runningMode: 'VIDEO',
    numPoses: NUM_POSES,
  });
}

/** Load the model once (GPU, falling back to CPU). */
export function initPose(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        landmarker = await create('GPU');
      } catch (e) {
        console.warn('PoseLandmarker GPU init failed, using CPU', e);
        landmarker = await create('CPU');
      }
    })();
    initPromise.catch(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', done);
      resolve();
    };
    // Safety net: some files never fire `seeked` for a no-op seek.
    const timer = setTimeout(done, 3000);
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });
}

function swapLR(lm: Landmark[]): Landmark[] {
  const out = lm.slice();
  for (const [l, r] of LR_PAIRS) {
    out[l] = lm[r];
    out[r] = lm[l];
  }
  return out;
}

/** Sample the video at SAMPLE_RATE, detect up to NUM_POSES people per sample, keep the climber. */
export async function processVideo(video: HTMLVideoElement, onProgress: (p: number) => void): Promise<PoseTrack> {
  await initPose();
  const lmk = landmarker!;
  const dims = { videoW: video.videoWidth, videoH: video.videoHeight };
  const n = Math.max(1, Math.floor(video.duration * SAMPLE_RATE));
  const cands: Landmark[][][] = [];
  video.pause();

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    await seek(video, t);
    const ts = tsBase + Math.round(t * 1000);
    const result = lmk.detectForVideo(video, ts);
    let people: Landmark[][] = (result.landmarks ?? []).map((pts) =>
      pts.map((p) => ({ x: p.x, y: p.y, v: p.visibility ?? 0 })),
    );
    if (SWAP_LR) people = people.map(swapLR);
    cands.push(people);
    if (i % 5 === 0) onProgress(i / n);
  }
  tsBase += Math.round(video.duration * 1000) + 1000;
  // The climber is chosen over the whole clip, not frame by frame (D39).
  const chosen = chooseClimber(cands, dims, SAMPLE_RATE);
  const frames: PoseFrame[] = chosen.map((lm, i) => ({ t: i / SAMPLE_RATE, lm }));
  onProgress(1);
  return { sampleRate: SAMPLE_RATE, videoW: dims.videoW, videoH: dims.videoH, frames };
}
