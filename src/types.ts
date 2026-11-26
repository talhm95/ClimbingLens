// Shared data types (ARCHITECTURE.md section 3). Type names are defined here once and never redefined.

export type Vec = { x: number; y: number };                 // normalized 0..1 of video w/h
export type Landmark = Vec & { v: number };                 // v = visibility 0..1
export type PoseFrame = { t: number; lm: Landmark[] | null }; // t seconds; null = no person
export type PoseTrack = {
  sampleRate: number;           // samples per second (15)
  videoW: number; videoH: number;
  frames: PoseFrame[];          // ordered by t, evenly spaced
};

export type Limb = 'LH' | 'RH' | 'LF' | 'RF';
export type Hold = { id: number; x: number; y: number };    // id = click order, from 1

export type Attempt = { start: number; end: number };       // seconds

export type Contact = {         // one placement of one limb
  limb: Limb;
  holdId: number | null;        // null = no hold within radius
  start: number; end: number;   // seconds, first segment start → last segment end
  pos: Vec;                     // median position of the first segment
  corrections: number[];        // times (s) the limb re-settled on the same hold
  attempt: number;              // index into attempts
};

export type Metrics = {
  touches: Record<Limb, number> & { total: number };
  footCorrections: { LF: number; RF: number; total: number };
  attempts: { duration: number }[];   // seconds, per attempt
  rests: { duration: number }[];      // gaps between attempts
  tier2?: {                           // Tier 2 scalars, absent until built
    drops: number;                    // total drop events in attempts
    jumps: number;                    // number of jumps
    firstJumpSpeed: number | null;    // take-off speed of first jump, S/s
    offBalance: number;               // 0..1, share of supported time outside WEIGHT_TOL
  };
};

// ---- Tier 2 ----
export type DropEvent = { limb: Limb; t: number };          // t = end of the contact that dropped
export type Jump = {
  t: number;                    // take-off time (first airborne sample)
  v: Vec;                       // pelvis velocity at take-off, normalized units / s
  speed: number;                // |v| in body scales / s
  firstLanding: Limb | null;    // limb of the first contact starting after t
};
export type Tier2Results = {
  heatmap: Float32Array;        // HEATMAP_COLS × HEATMAP_ROWS, row-major, 0..1
  drops: DropEvent[];
  jumps: Jump[];
};

export type Take = {
  id: 'A' | 'B';
  fileName: string; url: string;      // object URL
  duration: number;
  poses: PoseTrack | null;            // null until processed
  holds: Hold[];
  attempts: Attempt[];                // [] = whole video is one attempt
  attemptsSource: 'auto' | 'manual';  // auto = detectAttempts fills `attempts` (D37)
  contacts: Contact[];                // already clipped to attempts
  metrics: Metrics | null;
  tier2?: Tier2Results;               // Tier 2, absent until built
};

export type LayerId = 'skeleton' | 'holds' | 'contacts' | 'touches'
  | 'footCorrections' | 'timing' | 'comparison'
  /* Tier 2 */ | 'heatmap' | 'weightShift' | 'angles' | 'jump' | 'drops';

export type AppState = {
  takes: { A: Take | null; B: Take | null };
  active: 'A' | 'B';
  enabled: Record<LayerId, boolean>;
  mode: 'idle' | 'processing' | 'markHolds';
  progress: number;                   // 0..1 while processing
  lang: 'en' | 'he';
};

// ---- Overlay (ARCHITECTURE.md section 5) ----
export type Viewport = { ox: number; oy: number; w: number; h: number }; // video rect in canvas CSS px

export type TimelineMark = { t: number; color: string; kind: 'tick' | 'event' };  // tick = small, event = tall

export type LayerDef = {
  id: LayerId;
  tier: 1 | 2;
  label: { en: string; he: string };
  needs?: ('poses' | 'holds' | 'takeB')[];        // greyed out until available
  draw?: (ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number) => void;
  metrics?: (s: AppState) => { label: string; value: string }[];
  timelineMarks?: (s: AppState) => TimelineMark[];   // marks this layer adds to the timeline (D32)
};
