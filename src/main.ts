import './styles.css';
import { startRenderLoop } from './overlay/renderLoop';
import { startAnalysisRunner } from './state/analysisRunner';
import { createStore } from './state/store';
import type { AppState, LayerId } from './types';
import { renderAttemptMarker } from './ui/attemptMarker';
import { renderChecklist } from './ui/checklist';
import { compareTableExtra } from './ui/compareTable';
import { renderContactList } from './ui/contactList';
import { mountDebug } from './ui/debug';
import { renderHoldMarker } from './ui/holdMarker';
import { setLang, tr } from './ui/i18n';
import { renderMetricsPanel } from './ui/metricsPanel';
import { renderProgress } from './ui/progress';
import { restTimerExtra } from './ui/restTimer';
import { syncVideoToActiveTake, takeSwitcher } from './ui/takeSwitcher';
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

function renderHeader(s: AppState) {
  header.replaceChildren();
  const h1 = document.createElement('h1');
  h1.textContent = tr('app.title');
  const busy = s.mode === 'processing';
  const loadA = fileButton(tr('upload.takeA'), (f) => loadTake(store, video, 'A', f));
  loadA.classList.toggle('disabled', busy);
  const addB = fileButton(tr('upload.takeB'), (f) => loadTake(store, video, 'B', f));
  addB.classList.toggle('disabled', busy || !s.takes.A?.poses);
  header.append(h1, takeSwitcher(store), loadA, addB);
  mountDebug(header, store);
  header.append(langToggle(s));
}

function langToggle(s: AppState): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'switcher';
  for (const l of ['en', 'he'] as const) {
    const b = document.createElement('button');
    b.textContent = tr(`lang.${l}`);
    b.lang = l;
    b.classList.toggle('active', s.lang === l);
    b.addEventListener('click', () => {
      setLang(l);
      store.set({ lang: l });
    });
    wrap.append(b);
  }
  return wrap;
}

let headerKey: unknown[] = [];
function maybeHeader(s: AppState) {
  const k = [s.mode, s.lang, s.active, s.takes.A?.poses, s.takes.B?.poses, !!s.takes.A, !!s.takes.B];
  if (k.every((v, i) => v === headerKey[i])) return;
  headerKey = k;
  renderHeader(s);
}

const sidebar = document.getElementById('sidebar')!;
const checklistEl = document.createElement('div');
const holdsEl = document.createElement('div');
sidebar.append(checklistEl, holdsEl);

startAnalysisRunner(store);
maybeHeader(store.get());
store.subscribe(maybeHeader);
syncVideoToActiveTake(store, video);
renderProgress(document.getElementById('progress')!, store);
renderChecklist(checklistEl, store);
renderHoldMarker(holdsEl, store, video, canvas);
renderMetricsPanel(document.getElementById('metrics')!, store, [restTimerExtra(store, video), compareTableExtra]);
renderTimeline(document.getElementById('timeline')!, store, video);
renderAttemptMarker(document.getElementById('attempt-controls')!, store, video);
renderContactList(document.getElementById('contacts')!, store, video);
startRenderLoop(video, canvas, store);
store.subscribe((s) => {
  video.controls = s.mode !== 'processing';
});
