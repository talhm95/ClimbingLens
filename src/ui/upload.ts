import { processVideo } from '../pose/poseRunner';
import { updateTake, type Store } from '../state/store';
import type { AppState, Take } from '../types';
import { tr } from './i18n';
import { showMessage } from './progress';

/** Point the <video> at a URL and wait for its metadata. Rejects when Chrome can't decode it. */
export function loadVideo(video: HTMLVideoElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      off();
      // An undecodable codec (e.g. HEVC without hardware support) can load with no picture.
      if (!video.videoWidth || !video.videoHeight) reject(new Error('no video track'));
      else resolve();
    };
    const fail = () => {
      off();
      reject(new Error('video error'));
    };
    const off = () => {
      video.removeEventListener('loadeddata', ok);
      video.removeEventListener('error', fail);
    };
    video.addEventListener('loadeddata', ok);
    video.addEventListener('error', fail);
    video.src = url;
    video.load();
  });
}

export function newTake(id: 'A' | 'B', file: File): Take {
  return {
    id,
    fileName: file.name,
    url: URL.createObjectURL(file),
    duration: 0,
    poses: null,
    holds: [],
    attempts: [],
    attemptsSource: 'auto',
    contacts: [],
    metrics: null,
  };
}

/** Load a file as take `id`, make it active, and process its poses. */
export async function loadTake(store: Store<AppState>, video: HTMLVideoElement, id: 'A' | 'B', file: File): Promise<void> {
  showMessage(null);
  const take = newTake(id, file);
  const prev = store.get().takes[id];
  if (prev) URL.revokeObjectURL(prev.url);
  if (id === 'B' && store.get().takes.A) take.holds = structuredClone(store.get().takes.A!.holds); // D20
  store.set((s) => ({ takes: { ...s.takes, [id]: take }, active: id, mode: 'processing', progress: 0 }));
  try {
    await loadVideo(video, take.url);
  } catch {
    showMessage(tr('error.video'));
    store.set((s) => ({ takes: { ...s.takes, [id]: null }, mode: 'idle', active: s.takes.A && id === 'B' ? 'A' : s.active }));
    return;
  }
  updateTake(store, id, { duration: video.duration });
  try {
    const poses = await processVideo(video, (p) => store.set({ progress: p }));
    updateTake(store, id, { poses });
  } catch (e) {
    console.error(e);
    showMessage(tr('error.pose'));
  } finally {
    store.set({ mode: 'idle' });
    video.currentTime = 0;
  }
}

/** A file button. The input is reset after each pick so the same file can be chosen again. */
export function fileButton(text: string, onFile: (f: File) => void): HTMLLabelElement {
  const lbl = document.createElement('label');
  lbl.className = 'file-btn';
  const span = document.createElement('span');
  span.textContent = text;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*,.mov,.mp4';
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    input.value = '';
    if (f) onFile(f);
  });
  lbl.append(span, input);
  return lbl;
}
