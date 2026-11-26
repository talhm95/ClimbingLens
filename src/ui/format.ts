/** 63.4 → "01:03" */
export function mmss(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 12.345 → "12.3 s" */
export function secs(d: number): string {
  return `${d.toFixed(1)} s`;
}

/**
 * A left-to-right isolated run (<bdi dir="ltr">) for a time, number or limb code, so it keeps its
 * own order inside Hebrew text and never reorders the text around it.
 */
export function bdi(text: string): HTMLElement {
  const el = document.createElement('bdi');
  el.dir = 'ltr';
  el.textContent = text;
  return el;
}
