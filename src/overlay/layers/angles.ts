// Elbow angles (Tier 2) drawn as "95°" next to each elbow of the stick figure.
import { elbowAngles } from '../../analysis/angles';
import { frameAt } from '../../analysis/limbs';
import { activeTake } from '../../state/selectors';
import type { AppState, Viewport } from '../../types';
import { LIMB_COLORS, outlinedText } from '../draw';
import { toCanvas } from '../viewport';

export function drawAngles(ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number): void {
  const take = activeTake(s);
  if (!take?.poses) return;
  const lm = frameAt(take.poses, t)?.lm ?? null;
  if (!lm) return;
  const a = elbowAngles(lm, take.poses);
  // Image-left / image-right offsets keep the label off the bones.
  if (a.left !== null) {
    const p = toCanvas(view, lm[13]);
    outlinedText(ctx, `${Math.round(a.left)}°`, { x: p.x - 10, y: p.y }, 13, LIMB_COLORS.LH, 'right');
  }
  if (a.right !== null) {
    const p = toCanvas(view, lm[14]);
    outlinedText(ctx, `${Math.round(a.right)}°`, { x: p.x + 10, y: p.y }, 13, '#90caf9', 'left');
  }
}
