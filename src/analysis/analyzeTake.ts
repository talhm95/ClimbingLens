// Runs the whole analysis chain for one take (ARCHITECTURE.md section 4.3). Pure.
import type { Attempt, Contact, Metrics, Take } from '../types';
import { clipToAttempts, detectContacts } from './contacts';
import { bodyScale } from './limbs';
import { computeMetrics, normalizeAttempts } from './metrics';

export type TakeAnalysis = { contacts: Contact[]; metrics: Metrics; attempts: Attempt[] };

export function analyzeTake(take: Take): TakeAnalysis {
  if (!take.poses) return { contacts: [], metrics: computeMetrics([], []), attempts: [] };
  const track = take.poses;
  const all = detectContacts({ track, S: bodyScale(track), holds: take.holds });
  const attempts: Attempt[] = normalizeAttempts(take.attempts, take.duration);
  const contacts = clipToAttempts(all, attempts);
  return { contacts, metrics: computeMetrics(contacts, attempts), attempts };
}
