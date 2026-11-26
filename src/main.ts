import './styles.css';
import { createStore } from './state/store';
import type { AppState, LayerId } from './types';
import { tr } from './ui/i18n';
import { renderProgress } from './ui/progress';
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

function renderHeader() {
  header.replaceChildren();
  const h1 = document.createElement('h1');
  h1.textContent = tr('app.title');
  header.append(h1, fileButton(tr('upload.takeA'), (f) => loadTake(store, video, 'A', f)));
}

renderHeader();
renderProgress(document.getElementById('progress')!, store);
store.subscribe((s) => {
  video.controls = s.mode !== 'processing';
});
