import './styles.css';
import { startRenderLoop } from './overlay/renderLoop';
import { startAnalysisRunner } from './state/analysisRunner';
import { createStore } from './state/store';
import type { AppState, LayerId } from './types';
import { renderAttemptMarker } from './ui/attemptMarker';
import { renderChecklist } from './ui/checklist';
import { renderContactList } from './ui/contactList';
import { mountDebug } from './ui/debug';
import { renderHoldMarker } from './ui/holdMarker';
import { tr } from './ui/i18n';
import { renderMetricsPanel } from './ui/metricsPanel';
import { renderProgress } from './ui/progress';
import { restTimerExtra } from './ui/restTimer';
import { renderTimeline } from './ui/timeline';
import { fileButton, loadTake } from './ui/upload';

const TIER1: LayerId[] = ['skeleton', 'holds', 'contacts', 'touches', 'footCorrections', 'timing', 'comparison'];
const ALL: LayerId[] = [...TIER1, 'heatmap', 'weightShift', 'angles', 'jump', 'drops'];

const store = createStore<AppState>({
  takes: { A: null, B: null },
  active: 'A',
  enabled: Object.fromEntries(ALL.map((id) => [id, TIER1.includes(id)])) as Record<LayerId, boolean>,
  mode: 'idle',
  progress: 0,
  lang: 'en',
});

if (import.meta.env.DEV) (window as unknown as { __store: typeof store }).__store = store;

const video = document.getElementById('video') as HTMLVideoElement;
const header = document.getElementById('header')!;
const canvas = document.getElementById('overlay') as HTMLCanvasElement;

function renderHeader() {
  header.replaceChildren();
  const h1 = document.createElement('h1');
  h1.textContent = tr('app.title');
  header.append(h1, fileButton(tr('upload.takeA'), (f) => loadTake(store, video, 'A', f)));
  mountDebug(header, store);
}

const sidebar = document.getElementById('sidebar')!;
const checklistEl = document.createElement('div');
const holdsEl = document.createElement('div');
sidebar.append(checklistEl, holdsEl);

startAnalysisRunner(store);
renderHeader();
renderProgress(document.getElementById('progress')!, store);
renderChecklist(checklistEl, store);
renderHoldMarker(holdsEl, store, video, canvas);
renderMetricsPanel(document.getElementById('metrics')!, store, [restTimerExtra(store, video)]);
renderTimeline(document.getElementById('timeline')!, store, video);
renderAttemptMarker(document.getElementById('attempt-controls')!, store, video);
renderContactList(document.getElementById('contacts')!, store, video);
startRenderLoop(video, canvas, store);
store.subscribe((s) => {
  video.controls = s.mode !== 'processing';
});
