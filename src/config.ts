// Every threshold and constant lives here (CLAUDE.md). D# = DECISIONS.md, Q# = OPEN_QUESTIONS.md.

export const SAMPLE_RATE = 15;        // pose samples per second (D11)
export const MODEL: 'full' | 'heavy' = 'full'; // Q3
export const SWAP_LR = false;         // Q2
export const NUM_POSES = 3;           // candidates per frame (D36; 3 so spectators cannot crowd out the climber, D39)
export const CLIMBER_MAX_JUMP = 1.5;  // body scales between frames (D36)
export const CLIMBER_RESET = 1.0;     // s without a match before a person's tracklet ends (D36, D39)
export const CLIMBER_MIN_SPEED = 0.15; // torso lengths / s averaged over a tracklet; slower = spectator (D39)
export const PATH_BREAK = 1.5;        // body scales between two samples: a drawn path breaks there (person switch)
export const MIN_VISIBILITY = 0.5;    // D14
export const MAX_INTERP_GAP = 0.3;    // s (D14)
export const SMOOTH_SIGMA = 1;        // samples, Gaussian, per contiguous run (D17)
export const FALLBACK_BODY_SCALE = 0.15; // fraction of video height, only when no torso is ever seen
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

// ---- Tier 2 (ARCHITECTURE.md section 4.5) ----
export const HEATMAP_COLS = 64, HEATMAP_ROWS = 36;
export const WEIGHT_TOL = 0.25;     // body scales, horizontal pelvis-to-foot offset
export const DROP_SPEED = 3;        // body scales / s
export const DROP_WINDOW = 0.3;     // s after a contact ends
export const JUMP_SPEED = 2;        // body scales / s, pelvis
export const JUMP_MIN_AIR = 0.2;    // s, shortest airborne run that counts as a jump (shorter = pose jitter)
export const JUMP_MIN_RISE = 0.25;  // take-off: upward share of the speed (about 15 degrees above level)
export const JUMP_SHOW = 0.8;       // s an arrow stays on screen after take-off
export const JUMP_MATCH = 1.0;      // s, max aligned-time gap to pair A and B jumps
export const JUMP_ARROW_SCALE = 0.2; // arrow length in S per (S/s) of speed
