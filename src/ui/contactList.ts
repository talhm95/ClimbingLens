// The contact sequence: "00:03 RH → hold 2", click a row to seek (SPEC.md section 3).
import { LIMB_COLORS } from '../overlay/draw';
import { activeTake } from '../state/selectors';
import type { Store } from '../state/store';
import type { AppState } from '../types';
import { bdi, mmss } from './format';
import { tr } from './i18n';

export function renderContactList(root: HTMLElement, store: Store<AppState>, video: HTMLVideoElement): void {
  let rows: { li: HTMLElement; start: number; end: number }[] = [];

  const render = (s: AppState) => {
    root.replaceChildren();
    rows = [];
    const h = document.createElement('h2');
    h.textContent = tr('contacts.title');
    root.append(h);
    const take = activeTake(s);
    if (!s.enabled.contacts || !take?.poses) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = take?.poses ? tr('contacts.off') : tr('empty.noVideo');
      root.append(p);
      return;
    }
    if (!take.contacts.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = take.holds.length ? tr('contacts.none') : tr('contacts.markHolds');
      root.append(p);
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'contact-list';
    for (const c of take.contacts) {
      const li = document.createElement('li');
      const limb = document.createElement('span');
      limb.className = 'limb';
      limb.style.color = LIMB_COLORS[c.limb];
      limb.append(bdi(c.limb));
      const target = document.createElement('span');
      if (c.holdId === null) target.textContent = tr('contacts.noHold');
      else target.append(tr('contacts.toHold') + ' ', bdi(String(c.holdId)));
      li.append(bdi(mmss(c.start)), limb, target);
      if (c.corrections.length && (c.limb === 'LF' || c.limb === 'RF')) {
        const corr = document.createElement('span');
        corr.className = 'muted';
        corr.append('(', tr('contacts.corrections') + ' ', bdi(String(c.corrections.length)), ')');
        li.append(corr);
      }
      li.addEventListener('click', () => {
        video.pause();
        video.currentTime = c.start;
      });
      ul.append(li);
      rows.push({ li, start: c.start, end: c.end });
    }
    root.append(ul);
  };

  const highlight = () => {
    const t = video.currentTime;
    for (const r of rows) r.li.classList.toggle('current', t >= r.start && t <= r.end);
  };
  video.addEventListener('timeupdate', highlight);
  video.addEventListener('seeked', highlight);

  let key: unknown[] = [];
  const maybe = (s: AppState) => {
    const take = activeTake(s);
    const k = [take?.contacts, take?.poses, take?.holds.length, s.enabled.contacts, s.lang, s.active];
    if (k.every((v, i) => v === key[i])) return;
    key = k;
    render(s);
    highlight();
  };
  maybe(store.get());
  store.subscribe(maybe);
}
