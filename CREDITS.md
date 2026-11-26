# Credits

## jeremyipark/vision-demos, folder `rock_climbing`

- Source: https://github.com/jeremyipark/vision-demos (folder `rock_climbing`)
- Licence: Apache-2.0
- What ClimbingLens adapted (ideas and rules, re-implemented in TypeScript, **no code copied**):
  - contact hysteresis (an enter radius and a larger release radius) and the dwell time a limb must
    stay on a hold before it counts;
  - "a deeper hold wins": a nearer hold inside the enter radius takes over from the current one;
  - smoothing each contiguous run of pose samples separately, so a path is never drawn across a gap;
  - climber selection when more than one person is in the frame (we use pelvis continuity instead
    of wall overlap);
  - automatic attempt start (feet and a hand on holds, counted leakily) and top-out rules;
  - the merge rule behind foot corrections (a grip settling again on the same hold is not a new move).
- Every adapted file starts with:
  `// Adapted from jeremyipark/vision-demos rock_climbing (Apache-2.0). See CREDITS.md.`

## MediaPipe

- `@mediapipe/tasks-vision` (PoseLandmarker) and the `pose_landmarker_full` / `pose_landmarker_heavy`
  models, by Google. Licence: Apache-2.0. https://github.com/google-ai-edge/mediapipe
