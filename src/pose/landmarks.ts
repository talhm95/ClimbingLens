// MediaPipe Pose landmark indices (33-point model) used by ClimbingLens.
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_PINKY: 17, R_PINKY: 18,
  L_INDEX: 19, R_INDEX: 20,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
  L_HEEL: 29, R_HEEL: 30,
  L_FOOT: 31, R_FOOT: 32,
} as const;

/** Stick-figure edges: torso, arms (to the hand), legs (to heel and toe). */
export const SKELETON_EDGES: [number, number][] = [
  [LM.L_SHOULDER, LM.R_SHOULDER], [LM.L_HIP, LM.R_HIP],
  [LM.L_SHOULDER, LM.L_HIP], [LM.R_SHOULDER, LM.R_HIP],
  [LM.L_SHOULDER, LM.L_ELBOW], [LM.L_ELBOW, LM.L_WRIST], [LM.L_WRIST, LM.L_INDEX], [LM.L_WRIST, LM.L_PINKY],
  [LM.R_SHOULDER, LM.R_ELBOW], [LM.R_ELBOW, LM.R_WRIST], [LM.R_WRIST, LM.R_INDEX], [LM.R_WRIST, LM.R_PINKY],
  [LM.L_HIP, LM.L_KNEE], [LM.L_KNEE, LM.L_ANKLE], [LM.L_ANKLE, LM.L_HEEL], [LM.L_HEEL, LM.L_FOOT], [LM.L_ANKLE, LM.L_FOOT],
  [LM.R_HIP, LM.R_KNEE], [LM.R_KNEE, LM.R_ANKLE], [LM.R_ANKLE, LM.R_HEEL], [LM.R_HEEL, LM.R_FOOT], [LM.R_ANKLE, LM.R_FOOT],
];

/** Left/right landmark pairs, swapped when SWAP_LR is set (Q2). */
export const LR_PAIRS: [number, number][] = [
  [1, 4], [2, 5], [3, 6], [7, 8], [9, 10],
  [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22],
  [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
];

/** Landmark indices on the climber's left side, used to colour left limbs differently. */
export const LEFT_SIDE = new Set(LR_PAIRS.map(([l]) => l));
