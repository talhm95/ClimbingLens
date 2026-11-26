// Live rest timer under the timing rows: counts up while the playhead is in a rest.
import { restTimerText } from '../overlay/layers/timing';
import { isOn, LAYERS } from '../overlay/layers/registry';
import type { Store } from '../state/store';
import type { AppState } from '../types';
import { bdi } from './format';
import { tr } from './i18n';
import type { PanelExtra } from './metricsPanel';

export function restTimerExtra(store: Store<AppState>, video: HTMLVideoElement): PanelExtra {
  let el: HTMLElement | null = null;
  let value: HTMLElement | null = null;
  const tick = () => {
    if (el && value && el.isConnected) {
      const text = restTimerText(store.get(), video.currentTime);
      el.hidden = text === null;
      if (text !== null && value.textContent !== text) value.textContent = text;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return (root, s) => {
    const timing = LAYERS.find((l) => l.id === 'timing');
    if (!timing || !isOn(timing, s)) return;
    el = document.createElement('div');
    el.className = 'rest-timer';
    value = bdi('');
    el.append(tr('timing.restNow') + ' ', value);
    el.hidden = true;
    root.append(el);
  };
}
