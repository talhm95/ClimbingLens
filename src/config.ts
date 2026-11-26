// Every threshold and constant lives here (CLAUDE.md). D# = DECISIONS.md, Q# = OPEN_QUESTIONS.md.

export const SAMPLE_RATE = 15;        // pose samples per second (D11)
export const MODEL: 'full' | 'heavy' = 'full'; // Q3
export const SWAP_LR = false;         // Q2
export const NUM_POSES = 2;           // candidates per frame (D36)
export const CLIMBER_MAX_JUMP = 1.5;  // body scales between frames (D36)
export const CLIMBER_RESET = 1.0;     // s without a chosen pose before continuity is dropped (D36)
export const MIN_VISIBILITY = 0.5;    // D14
export const MAX_INTERP_GAP = 0.3;    // s (D14)
export const SMOOTH_SIGMA = 1;        // samples, Gaussian, per contiguous run (D17)
export const STILL_SPEED = 0.5;       // body scales / s (D15)
export const MIN_STILL = 0.3;         // s (D15)
export const HOLD_RADIUS = 0.6;       // body scales, enter a hold (D15)
export const RELEASE_RADIUS = 1.0;    // body scales, leave a hold (D15)
export const HOLD_DWELL = 0.5;        // s on a hold before it counts (D15)
export const BLINK_WINDOW = 0.6;      // s each side of a correction
export const START_DWELL = 0.4;       // s, auto attempt start (D37)
export const START_DWELL_DECAY = 1;   // samples lost per miss, leaky (D37)
export const TOP_DWELL = 0.5;         // s, both hands on the top hold (D37)
export const END_GAP = 1.0;           // s with no limb on a hold = fall (D37)
