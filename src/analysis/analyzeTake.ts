// Runs the whole analysis chain for one take (ARCHITECTURE.md sections 4.3 and 4.5). Pure.
import type { Attempt, Contact, Metrics, Take, Tier2Results } from '../types';
import { detectAttempts } from './autoAttempts';
import { clipToAttempts, detectContacts } from './contacts';
import { heatmap } from './heatmap';
import { bodyScale } from './limbs';
import { computeMetrics, normalizeAttempts } from './metrics';
import { offBalanceFraction } from './weightShift';

export type TakeAnalysis = { contacts: Contact[]; metrics: Metrics; attempts: Attempt[]; tier2: Tier2Results };

const emptyTier2 = (): Tier2Results => ({ heatmap: heatmap({ sampleRate: 15, videoW: 1, videoH: 1, frames: [] }, []), drops: [], jumps: [] });

/**
 * detectContacts over the whole video → attempts (auto: detectAttempts; manual: the marks) →
 * normalizeAttempts → clipToAttempts → computeMetrics, then the Tier 2 results on the same
 * clipped contacts.
 */
export function analyzeTake(take: Take): TakeAnalysis {
  if (!take.poses) return { contacts: [], metrics: computeMetrics([], []), attempts: [], tier2: emptyTier2() };
  const track = take.poses;
  const S = bodyScale(track);
  const all = detectContacts({ track, S, holds: take.holds });
  const marked = take.attemptsSource === 'auto' ? detectAttempts(all, take.holds, track) : take.attempts;
  const attempts = normalizeAttempts(marked, take.duration);
  const contacts = clipToAttempts(all, attempts);

  const tier2: Tier2Results = { heatmap: heatmap(track, contacts), drops: [], jumps: [] };
  const metrics: Metrics = {
    ...computeMetrics(contacts, attempts),
    tier2: { drops: tier2.drops.length, jumps: tier2.jumps.length, firstJumpSpeed: null, offBalance: offBalanceFraction(track, contacts, attempts) },
  };
  return { contacts, metrics, attempts, tier2 };
}
