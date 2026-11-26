// One-time setup: copy the MediaPipe wasm files and download the pose models into public/,
// so the app runs with no network calls (DECISIONS D2, D9). Existing files are skipped.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
const wasmDst = 'public/mediapipe/wasm';
const modelDst = 'public/models';
const MODELS = ['full', 'heavy'].map((m) => ({
  file: `pose_landmarker_${m}.task`,
  url: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${m}/float16/latest/pose_landmarker_${m}.task`,
}));

mkdirSync(wasmDst, { recursive: true });
mkdirSync(modelDst, { recursive: true });

for (const f of readdirSync(wasmSrc)) {
  const dst = join(wasmDst, f);
  if (existsSync(dst)) continue;
  copyFileSync(join(wasmSrc, f), dst);
  console.log('copied', dst);
}

for (const { file, url } of MODELS) {
  const dst = join(modelDst, file);
  if (existsSync(dst)) {
    console.log('exists', dst);
    continue;
  }
  console.log('downloading', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
  console.log('saved', dst);
}
