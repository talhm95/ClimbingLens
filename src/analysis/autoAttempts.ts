// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.
// Automatic attempt start and end (ARCHITECTURE.md section 4.6, D37). Pure.
import { END_GAP, START_DWELL, START_DWELL_DECAY, TOP_DWELL } from '../config';
import type { Attempt, Contact, Hold, Limb, PoseTrack } from '../types';

/**
 * Walk the samples once, using only contacts on a hold (holdId not null):
 * - start: both feet and a hand on holds for START_DWELL, counted leakily, backdated to the
 *   first sample of that run;
 * - end: both hands on the top hold for TOP_DWELL (top-out), or no limb on any hold for END_GAP
 *   (fall), or the end of the video; a fall ends at the last on-hold sample.
 * After an end, the next start is only looked for once no limb is on a hold (the climber has
 * left the wall), so the top-out position cannot start a new attempt.
 */
export function detectAttempts(contacts: Contact[], holds: Hold[], track: PoseTrack): Attempt[] {
  const onHold = contacts.filter((c) => c.holdId !== null);
  if (!holds.length || !onHold.length) return [];
  const sr = track.sampleRate;
  const n = track.frames.length;
  const top = holds.reduce((a, b) => (b.y < a.y ? b : a)).id;
  const t = (i: number) => i / sr;

  const on = (limb: Limb, i: number, holdId?: number) =>
    onHold.some((c) => c.limb === limb && c.start <= t(i) + 1e-9 && t(i) <= c.end + 1e-9 && (holdId === undefined || c.holdId === holdId));

  const attempts: Attempt[] = [];
  let inside = false;
  let armed = true;
  let dwell = 0;
  let runStart = 0;
  let start = 0;
  let lastOn = 0;
  let topCount = 0;

  for (let i = 0; i < n; i++) {
    const anyOn = (['LH', 'RH', 'LF', 'RF'] as Limb[]).some((l) => on(l, i));
    if (!inside) {
      if (!armed) {
        if (!anyOn) armed = true;
        continue;
      }
      const started = on('LF', i) && on('RF', i) && (on('LH', i) || on('RH', i));
      if (started) {
        if (dwell === 0) runStart = i;
        dwell++;
      } else {
        dwell = Math.max(0, dwell - START_DWELL_DECAY);
      }
      if (dwell >= START_DWELL * sr) {
        inside = true;
        start = t(runStart);
        lastOn = i;
        topCount = 0;
      }
      continue;
    }
    if (anyOn) lastOn = i;
    topCount = on('LH', i, top) && on('RH', i, top) ? topCount + 1 : 0;
    const topOut = topCount >= TOP_DWELL * sr;
    const fell = !anyOn && (i - lastOn) / sr >= END_GAP;
    if (topOut || fell) {
      attempts.push({ start, end: topOut ? t(i) : t(lastOn) });
      inside = false;
      armed = !anyOn;
      dwell = 0;
    }
  }
  if (inside) attempts.push({ start, end: t(lastOn) });
  return attempts;
}
