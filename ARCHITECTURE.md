# ClimbingLens Architecture

Browser-only app (SPEC.md section 9, Option A). There is no server. The video never leaves
the machine. Decisions referenced as D# are in DECISIONS.md. Mermaid diagrams of this
architecture, explained in Hebrew: `docs/architecture-diagram.he.md`.

Parts of the contact, smoothing and attempt logic are adapted from the reference repo
`jeremyipark/vision-demos`, folder `rock_climbing` (Apache-2.0). They are re-implemented
in TypeScript, not copied. See `CREDITS.md` and D38.

## 1. Data flow

```
 video file ──► <video> element
                   │  (seek frame by frame, 15 samples/s)          src/pose/
                   ▼
            MediaPipe PoseLandmarker ──► PoseTrack (33 landmarks/frame, normalized)
                                              │
     user clicks holds ──► Hold[]             │                    src/analysis/
                   │                          ▼
                   │                limb points (LH RH LF RF), smoothed, body scale S
                   │                          │
                   └──────────────► contact detection over the whole video ──► Contact[]
                                              │
                         auto: detectAttempts ┤ or manual marks ──► Attempt[]
                                              ▼
                                 clipToAttempts ──► contacts inside attempts
                                              │
                                              ▼
                                      metrics (touches, corrections, timing)
                                      Tier 2: heatmap, drops, jumps, off-balance
                                              │
            take B (same pipeline) ──► alignment (hold first-touch anchors) ──► comparison
                                              │
                                              ▼
  playback (requestVideoFrameCallback) ──► overlay layers draw at time t ──► canvas   src/overlay/
                                         panels render from state         ──► DOM      src/ui/
```

Analysis runs once after processing, and again whenever holds or attempts change
(it takes milliseconds: it is pure array math on the stored PoseTrack). Playback only
reads. Two Tier 2 values are not stored: weight shift and joint angles are computed for
each drawn frame from the stored pose, because they are a few arithmetic steps on one frame.

Tier 1 is built first (PLAN.md tasks 1–15). Tier 2 (tasks 16–20) plugs into the same
pipeline without changing Tier 1 code: new files in `analysis/` and `layers/`, one
registry entry each, optional fields in `Metrics` and `Take`.

## 2. Folder layout

```
index.html
src/
  main.ts                 wires store, player, overlay loop, UI panels
  config.ts               every threshold and constant (D13–D17)
  types.ts                shared data types (section 3)
  state/store.ts          createStore(): get / set / subscribe
  pose/
    landmarks.ts          MediaPipe landmark indices, skeleton edges
    poseRunner.ts         init PoseLandmarker, processVideo(video, onProgress) → PoseTrack
  analysis/               PURE functions only: no DOM, no MediaPipe. All unit-tested.
    smoothing.ts          interpolateGaps, gaussianSmooth (per contiguous run)
    limbs.ts              frameAt(track, t), limbPoint(lm, limb), pelvis(lm), limbSeries(track, limb), bodyScale(track), distPx(a, b, track)
    pickClimber.ts        pickClimber(candidates, prevPelvis, dims) → the climber's landmarks
    contacts.ts           stillMask(), stillSegments(), holdStays(), confirmStays(), footSmears(), detectContacts(), clipToAttempts()
    autoAttempts.ts       detectAttempts(contacts, holds, track) → Attempt[]
    metrics.ts            normalizeAttempts(), computeMetrics(contacts, attempts) → Metrics, activeCorrections(), restAt()
    alignment.ts          buildAnchors(), timeMap(anchors) → (tB) => tA
    compare.ts            diffMetrics(a, b, enabledLayers) → DiffRow[]
    analyzeTake.ts        runs the whole chain for one take → { contacts, metrics, attempts, tier2? }
    heatmap.ts            (Tier 2) heatmap(track, contacts, cols, rows) → Float32Array
    weightShift.ts        (Tier 2) weightOffset(track, contacts, t), offBalanceFraction(track, contacts, attempts)
    angles.ts             (Tier 2) angle2D(a, b, c, track), elbowAngles(lm, track)
    drops.ts              (Tier 2) detectDrops(ctx, contacts) → DropEvent[]
    jump.ts               (Tier 2) detectJumps(track, contacts, attempts) → Jump[], matchJump()
  overlay/
    viewport.ts           normalized ↔ canvas pixel mapping (object-fit: contain)
    renderLoop.ts         requestVideoFrameCallback loop, calls enabled layers' draw()
    layers/registry.ts    LAYERS: LayerDef[] (section 5)
    layers/skeleton.ts
    layers/holds.ts       hold dots + numbers
    layers/contacts.ts    limb markers at active contacts
    layers/corrections.ts blinking dot on the foot at each correction
    layers/comparison.ts  pelvis trails, A vs B
    layers/heatmap.ts     (Tier 2) foot-contact watermark
    layers/weightShift.ts (Tier 2) vertical line from the pelvis, red when off balance
    layers/angles.ts      (Tier 2) elbow angle labels
    layers/drops.ts       (Tier 2) no draw(); timeline marks + metrics only
    layers/jump.ts        (Tier 2) take-off arrow, grey arrow of take A
  ui/
    upload.ts             file input, "Add second take"
    takeSwitcher.ts       A / B
    holdMarker.ts         "Mark holds" mode: click = add, undo, clear
    attemptMarker.ts      "Attempt start" / "Attempt end" buttons, "Auto-detect", auto/manual badge
    checklist.ts          generated from LAYERS
    timeline.ts           attempt/rest bands + marks from enabled layers' timelineMarks(), click to seek
    contactList.ts        "00:03 RH → hold 2"
    metricsPanel.ts       metrics rows of enabled layers, rest timer
    compareTable.ts       "A → B (Δ)"
    i18n.ts               en / he dictionaries, setLang() sets <html dir>
    progress.ts           processing progress bar
  styles.css
scripts/setup-assets.mjs  copies MediaPipe wasm to public/mediapipe/, downloads model
public/                   mediapipe/wasm/*, models/pose_landmarker_full.task (git-ignored)
tests/
  fixtures/synth.ts       builds synthetic PoseTracks (limbs moving between holds)
  *.test.ts
samples/                  real clips, git-ignored
```

Rule: `analysis/` imports only `types.ts` and `config.ts`. This keeps it
testable without a browser.

## 3. Data structures (`src/types.ts`)

```ts
type Vec = { x: number; y: number };                 // normalized 0..1 of video w/h
type Landmark = Vec & { v: number };                 // v = visibility 0..1
type PoseFrame = { t: number; lm: Landmark[] | null }; // t seconds; null = no person
type PoseTrack = {
  sampleRate: number;           // samples per second (15)
  videoW: number; videoH: number;
  frames: PoseFrame[];          // ordered by t, evenly spaced
};

type Limb = 'LH' | 'RH' | 'LF' | 'RF';
type Hold = { id: number; x: number; y: number };    // id = click order, from 1

type Attempt = { start: number; end: number };       // seconds

type Contact = {                // one placement of one limb
  limb: Limb;
  holdId: number | null;        // null = no hold within radius
  start: number; end: number;   // seconds, first segment start → last segment end
  pos: Vec;                     // median position of the first segment
  corrections: number[];        // times (s) the limb re-settled on the same hold
  attempt: number;              // index into attempts
};

type Metrics = {
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
type DropEvent = { limb: Limb; t: number };          // t = end of the contact that dropped
type Jump = {
  t: number;                    // take-off time (first airborne sample)
  v: Vec;                       // pelvis velocity at take-off, normalized units / s
  speed: number;                // |v| in body scales / s
  firstLanding: Limb | null;    // limb of the first contact starting after t
};
type Tier2Results = {
  heatmap: Float32Array;        // HEATMAP_COLS × HEATMAP_ROWS, row-major, 0..1
  drops: DropEvent[];
  jumps: Jump[];
};

type Take = {
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

type LayerId = 'skeleton' | 'holds' | 'contacts' | 'touches'
  | 'footCorrections' | 'timing' | 'comparison'
  /* Tier 2 */ | 'heatmap' | 'weightShift' | 'angles' | 'jump' | 'drops';

type AppState = {
  takes: { A: Take | null; B: Take | null };
  active: 'A' | 'B';
  enabled: Record<LayerId, boolean>;
  mode: 'idle' | 'processing' | 'markHolds';
  progress: number;                   // 0..1 while processing
  lang: 'en' | 'he';
};
```

## 4. Pipeline details

### 4.1 Pose processing (`pose/poseRunner.ts`)
- `PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath:
  '/models/pose_landmarker_full.task', delegate: 'GPU' }, runningMode: 'VIDEO',
  numPoses: 2 })`. If GPU init fails, retry with `delegate: 'CPU'`.
- For `t = 0, 1/15, 2/15, … < duration`: set `video.currentTime = t`, await
  `seeked`, call `detectForVideo(video, Math.round(t * 1000))`, then
  `pickClimber(result.landmarks, prevPelvis, track)` and push the chosen pose.
  Timestamps increase monotonically, as VIDEO mode requires.
- **Climber selection (D36).** SPEC.md section 6 says people walk through the frame. Up to 2 people are detected
  per frame. `pickClimber` keeps the candidate whose pelvis is closest to the previous
  frame's chosen pelvis. With no previous pelvis (the first detection, or after a gap), it keeps the
  candidate with the longest torso, since on a tripod shot of the route the climber is the main
  subject. A candidate more than `CLIMBER_MAX_JUMP` (1.5 S) from the previous pelvis
  counts as a different person. If no candidate is that close, the frame is `lm: null`, rather than
  locking onto a passer-by.
- If `SWAP_LR` is set (config, D-Q2), swap left/right landmark pairs at this step, so
  nothing downstream knows about it.

### 4.2 Limb points (`analysis/limbs.ts`)
| Limb | Landmarks (MediaPipe index) |
|------|-----------------------------|
| LH | mean of 15 wrist, 17 pinky, 19 index |
| RH | mean of 16, 18, 20 |
| LF | mean of 29 heel, 31 foot index |
| RF | mean of 30, 32 |
| pelvis | mean of 23, 24 (hips) |

Landmarks with `v < 0.5` are dropped. If all are dropped, the limb point is missing for
that frame. `bodyScale(track)` = median over frames of |mid(11,12) − mid(23,24)|,
measured in pixels using videoW/videoH so the aspect ratio does not distort it, and stored
back in normalized units per axis where needed.

### 4.3 Contact detection (`analysis/contacts.ts`)

A contact needs two kinds of evidence: **where** (the limb is on a hold) and **still** (the limb
settled there). Position alone counts a limb passing near a hold. The reference repo needed a
separate "graze" rule for that. Stillness alone counts a hand in the chalk bag. Requiring
both cancels out the two failures (D15).

1. **Series.** `limbSeries` = `limbPoint` → `interpolateGaps(MAX_INTERP_GAP = 0.3 s)` →
   `gaussianSmooth(SMOOTH_SIGMA = 1 sample)`. The smoothing runs separately on each contiguous
   non-null run, so it never draws a path across a gap (D17).
2. **`stillMask`.** A sample is still when |Δpos| (pixels) × SAMPLE_RATE / S `< STILL_SPEED`
   (0.5 S/s). A null sample is not still.
3. **`holdStays`** walks the samples of one limb with **hysteresis** (D15):
   - If the limb has a current hold and is within `RELEASE_RADIUS` (1.0 S) of it, it keeps
     that hold. *Exception:* another hold within `HOLD_RADIUS` that the limb is **closer to**
     takes over ("a deeper hold wins", for holds set closer together than the release radius).
   - Otherwise the current hold becomes the nearest hold within `HOLD_RADIUS` (0.6 S), or none.
   - A null sample (a gap longer than 0.3 s that survived step 1) ends the stay.
   - Output: `Stay = { limb, holdId, i0, i1 }`, a run of sample indices on one hold.
4. **`confirmStays`.** A stay becomes a `Contact` when it lasts ≥ `HOLD_DWELL` (0.5 s) **and**
   contains at least one still run ≥ `MIN_STILL` (0.3 s). `start` = the first sample of the
   stay (backdated, so the dwell doesn't eat the start of the touch). `pos` = the
   median position. `corrections` = the start times of the 2nd, 3rd, … still runs
   ≥ `MIN_STILL` inside the stay: the limb moved and re-settled without leaving the hold
   (D16). Leaving past `RELEASE_RADIUS` and coming back is a new contact, not a correction.
5. **`footSmears`.** For LF/RF only: a still run ≥ `MIN_STILL` that overlaps no confirmed
   contact of that foot → `Contact` with `holdId: null` (a smear on the wall). A hand that is still
   with no hold (chalking, shaking out) is **not** a contact.
6. **`detectContacts(ctx)`** = steps 1–5 for all four limbs over the **whole video**, sorted by `start`.
   It does not know about attempts, which is what lets automatic attempt detection (section 4.6) use it.
7. **`clipToAttempts(contacts, attempts)`** clips each contact to the attempt it overlaps, sets
   `attempt`, and drops contacts outside every attempt and corrections outside the clipped range.

`analyzeTake(take)`: `all = detectContacts(ctx)` → `attempts = attemptsSource === 'auto' ?
detectAttempts(all, holds, track) : take.attempts` → `normalizeAttempts(attempts, duration)`
→ `contacts = clipToAttempts(all, attempts)` → `computeMetrics(contacts, attempts)`.
It returns `{ contacts, metrics, attempts }`, so the timeline shows the detected attempts.

### 4.4 Metrics: where each SPEC.md section 4 metric is computed

| SPEC metric (tier) | Computed in | Drawn / shown in |
|---|---|---|
| Stick figure (1) | `pose/poseRunner.ts` (keypoints) | `overlay/layers/skeleton.ts` |
| Hold numbers + limb contact markers (1) | `ui/holdMarker.ts` (holds), `analysis/contacts.ts` (contacts) | `layers/holds.ts`, `layers/contacts.ts`, `ui/contactList.ts`, `ui/timeline.ts` ticks |
| Touch count (1) | `analysis/metrics.ts` → `touches` (count of Contacts per limb) | `ui/metricsPanel.ts` |
| Foot corrections (1) | `analysis/contacts.ts` (merge) → `metrics.ts` → `footCorrections` | `layers/corrections.ts` (blinking dot ±0.6 s around each correction time), metrics panel |
| Attempt duration + rest (1) | `analysis/autoAttempts.ts` (auto start/end, D37) or manual marks → `analysis/metrics.ts` → `attempts`, `rests` | `ui/timeline.ts` bands (auto = dashed outline), metrics panel rest timer |
| Comparison overlay (1) | `analysis/alignment.ts`, `analysis/compare.ts` | `layers/comparison.ts`, `ui/compareTable.ts` |
| Foot heatmap (2) | `analysis/heatmap.ts` → `Take.tier2.heatmap` | `layers/heatmap.ts` |
| Weight shift (2) | `analysis/weightShift.ts`: per frame `weightOffset`; `offBalanceFraction` → `Metrics.tier2.offBalance` | `layers/weightShift.ts`, metrics panel |
| Joint angles (2) | `analysis/angles.ts`: per frame `elbowAngles` | `layers/angles.ts` |
| Drop events (2) | `analysis/drops.ts` → `Take.tier2.drops`, `Metrics.tier2.drops` | timeline marks via `layers/drops.ts`, metrics panel |
| Jump performance (2) | `analysis/jump.ts` → `Take.tier2.jumps`, `Metrics.tier2.jumps / firstJumpSpeed` | `layers/jump.ts`, metrics panel |

Details of each Tier 2 calculation are in section 4.5. Automatic attempts are in section 4.6.

### 4.5 Tier 2 analyses (built after Tier 1: PLAN.md tasks 16–20)

`analyzeTake` computes `Tier2Results` and `Metrics.tier2` once each Tier 2 module exists.
Everything is restricted to the normalized attempts, like contacts.

Constants (added to `config.ts` by the Tier 2 tasks):
```ts
export const HEATMAP_COLS = 64, HEATMAP_ROWS = 36;
export const WEIGHT_TOL = 0.25;     // body scales, horizontal pelvis-to-foot offset
export const DROP_SPEED = 3;        // body scales / s
export const DROP_WINDOW = 0.3;     // s after a contact ends
export const JUMP_SPEED = 2;        // body scales / s, pelvis
export const JUMP_SHOW = 0.8;       // s an arrow stays on screen after take-off
export const JUMP_MATCH = 1.0;      // s, max aligned-time gap to pair A and B jumps
export const JUMP_ARROW_SCALE = 0.2; // arrow length in S per (S/s) of speed
```

**Foot-contact heatmap** (`heatmap(track, contacts, cols = HEATMAP_COLS, rows = HEATMAP_ROWS)`).
For every LF/RF contact and every sample in `[start, end]`, add 1 to the grid cell under
that foot's `limbSeries` position. Divide by the maximum cell, giving values 0..1, so more visits and longer stays both make a cell
stronger. It covers the whole take, not "up to the playhead" (D35). Drawing: an offscreen canvas of
cols × rows pixels, one warm colour with alpha = value × 0.5, scaled to the viewport with
smoothing and `ctx.filter = 'blur(8px)'`. It is rebuilt only when the analysis re-runs.

**Weight shift** (`weightOffset(track, contacts, t): { offset: number; foot: Limb } | null`).
Supporting foot = the foot with a contact covering `t`; if both feet have one, the lower one (larger y);
if neither, `null`. `offset = (pelvis.x − foot.x) × videoW / S` (signed, in body scales). Back
view, so horizontal = sideways over the foot. Drawing: a vertical line from the pelvis down to the
foot's height, white when `|offset| ≤ WEIGHT_TOL`, red otherwise. `offBalanceFraction` =
share of samples inside attempts with a non-null offset where `|offset| > WEIGHT_TOL`.

**Joint angles** (`angle2D(a, b, c, track): number`, degrees at `b`, in pixel space so a
non-square video does not distort it). `elbowAngles(lm, track)` returns the left angle (11-13-15)
and the right angle (12-14-16), or `null` for a side with any landmark below `MIN_VISIBILITY`.
Elbows only (SPEC.md: "elbows first"). Drawn as "95°" next to each elbow. The checklist label
says "(2D)", because it is a projected angle, not the anatomical one.

**Drop events** (`detectDrops(ctx, contacts): DropEvent[]`). A drop = a contact that ends
in a fast **downward** movement: within `DROP_WINDOW` after `contact.end`, the gap-filled but
**unsmoothed** limb speed exceeds `DROP_SPEED`, and the limb's net movement over that window
points mostly down (`dy > 0` and `|dy| > |dx|`, image y grows downward) (D34). This applies to all four
limbs. SPEC.md warns to expect false positives. Shown as red marks on the timeline only (no
`draw`).

**Jump performance** (`detectJumps(track, contacts, attempts): Jump[]`). An *airborne*
sample = inside an attempt, no limb has a contact covering it, and the smoothed pelvis speed is
above `JUMP_SPEED`. Each run of airborne samples = one jump. `t` = first sample of the run,
`v` = pelvis velocity at `t` (central difference on the smoothed pelvis series), and
`firstLanding` = the limb of the earliest contact starting after `t` within the same attempt. Drawing:
for `t ≤ now ≤ t + JUMP_SHOW`, an arrow from the take-off pelvis position along `v`, with length
`speed × JUMP_ARROW_SCALE × S`, labelled with `firstLanding` ("→ RH"). This needs good tracking
in fast motion (SPEC.md). Pose may blur on a dyno, so this is the least reliable Tier 2 item.

### 4.6 Automatic attempt start and end (`analysis/autoAttempts.ts`, D37)

Adapted from the reference repo's start and top-out rules, without its floor detection.
`detectAttempts(contacts, holds, track): Attempt[]` walks the samples once, using only
contacts with a non-null `holdId`:

```
top = the hold with the smallest y (highest on the wall)
outside an attempt:
  started = LF and RF are each on a hold, and LH or RH is on a hold
  dwell   = started ? dwell + 1 : max(0, dwell − START_DWELL_DECAY)   // leaky, not a reset
  dwell ≥ START_DWELL → attempt starts at the first sample of that run (backdated)
inside an attempt:
  top-out: LH and RH both on `top` for TOP_DWELL → end = that sample
  fall/step-off: no limb on any hold for END_GAP → end = the last on-hold sample
the video ends inside an attempt → end = the last on-hold sample
```

Constants (`config.ts`): `START_DWELL = 0.4` s, `START_DWELL_DECAY = 1` sample,
`TOP_DWELL = 0.5` s, `END_GAP = 1.0` s.

- **Why leaky:** one frame where the pose drops a foot shouldn't restart the 0.4 s count.
  The reference repo's clock started 7 s late until it switched to a leaky count.
- **Why both feet on holds:** with no floor line, "feet on holds" is the only evidence the
  climber has left the ground. This needs the start footholds to be clicked (Q14).
- **Auto vs manual:** `attemptsSource` starts as `'auto'`. Any manual mark switches the take to
  `'manual'` (and the manual marks replace the detected ones). "Auto-detect" switches it back. With no holds, or
  no start detected, the result is `[]`, which `normalizeAttempts` turns into the whole video.
- Several attempts per video: after an end, the walk looks for the next start.

## 5. Checklist and layers

```ts
type LayerDef = {
  id: LayerId;
  tier: 1 | 2;
  label: { en: string; he: string };
  needs?: ('poses' | 'holds' | 'takeB')[];        // greyed out until available
  draw?: (ctx: CanvasRenderingContext2D, view: Viewport, s: AppState, t: number) => void;
  metrics?: (s: AppState) => { label: string; value: string }[];
  timelineMarks?: (s: AppState) => TimelineMark[];   // marks this layer adds to the timeline (D32)
};
type TimelineMark = { t: number; color: string; kind: 'tick' | 'event' };  // tick = small, event = tall
```

Where each layer shows up:

| Layer | Tier | `draw` | `metrics` | `timelineMarks` |
|---|---|---|---|---|
| heatmap | 2 | ✓ | | |
| holds | 1 | ✓ | | |
| weightShift | 2 | ✓ | off-balance % | |
| skeleton | 1 | ✓ | | |
| angles | 2 | ✓ | | |
| contacts | 1 | ✓ | | limb-coloured ticks |
| touches | 1 | | per limb + total | |
| footCorrections | 1 | ✓ | LF, RF, total | correction ticks |
| timing | 1 | | durations, rests, rest timer, auto/manual | |
| drops | 2 | | total | red events |
| jump | 2 | ✓ | count, first take-off speed | jump events |
| comparison | 1 | ✓ | (difference table) | |

The table order is the registry order, which is also the draw order (heatmap at the bottom, markers on top).

- `LAYERS` (in `layers/registry.ts`) is the single list. `checklist.ts` renders one checkbox
  per entry. Toggling sets `state.enabled[id]`.
- `renderLoop.ts`, on every video frame: clear the canvas, then for each enabled layer with
  `draw`, call it with the playhead time `t`. Draw order = registry order (table above).
- `timeline.ts` draws attempt and rest bands and the playhead itself, then collects
  `timelineMarks(state)` from every enabled layer. Turning off "Limb contacts" removes its
  ticks too. Marks are recomputed on store change, not per frame.
- The checklist shows only layers that exist in the registry (D25). Before Tier 2 is built, the
  Tier 2 entries are simply not there.
- `metricsPanel.ts` re-renders on store change: the rows of every enabled layer with
  `metrics`.
- `compareTable.ts` diffs only the metrics whose layer is enabled.
- Overlay drawing looks up the pose sample at `round(t * sampleRate)`, the nearest
  sample, with no interpolation.

## 6. Two-take comparison

1. **Add second take** loads take B. It copies A's `holds` (D20) and runs the same
   processing and analysis.
2. `alignment.ts`:
   - `buildAnchors(a, b)`: for each hold id, first touch time (any limb) in each take's
     first attempt. Plus `(A.start, B.start)` and `(A.end, B.end)`. Pairs are sorted by B
     time, and the longest subsequence that also increases in A is kept.
   - `timeMap(anchors)`: piecewise-linear `tB → tA`, clamped at the ends. If only the
     start and end anchors remain, this is a linear stretch.
3. `layers/comparison.ts` (draws only when the active take is B and A exists): B's pelvis
   path from attempt start to `t` (colour), A's full pelvis path in its first attempt
   (grey), and a grey dot at A's pelvis at `timeMap(t)`.
4. `compare.ts`: `diffMetrics(A.metrics, B.metrics, enabled)` → rows
   `{ label, a, b, delta }`. Time is shown as a signed difference in seconds ("−6 s").
   `compareTable.ts` renders them under the metrics panel.

5. **Tier 2 in comparison.**
   - *Difference table* (D33): with `drops` checked, a `drops.total` row; with `jump`, `jumps.count`
     and `jumps.firstSpeed` (unit `S/s`); with `weightShift`, `offBalance` (unit `%`). Tier 2
     extends `DiffRow.unit` to `'count' | 's' | '%' | 'S/s'`. Fewer drops and less off-balance
     are coloured "better". Jump speed is shown neutral (faster is not always better).
     Heatmap and angles are visual only and have no row.
   - *Jump arrows*: when B is active and A is processed, for each B jump on screen,
     `matchJump(A.tier2.jumps, timeMap(b.t))` returns A's jump nearest in aligned time
     within `JUMP_MATCH`, or null. Its arrow is drawn in grey from the **same origin** as B's
     arrow, so direction and length compare side by side (SPEC.md: "next to a grey arrow of the
     successful take"), with A's first landing in grey ("A → LH").

Same camera = same normalized coordinates. No homography (SPEC.md section 5).

## 7. UI layout

```
┌───────────────────────────────────────────────────────────────┐
│ ClimbingLens   [Take A][Take B]  [+ Add second take]   EN | עב │
├───────────────────────────────────────────┬───────────────────┤
│                                           │ Layers            │
│          video + overlay canvas           │ ☑ Stick figure    │
│                                           │ ☑ Holds           │
│                                           │ ☐ Contacts        │
│                                           │ ☐ Foot correct.   │
├───────────────────────────────────────────┤ ...               │
│ timeline ▓▓▓▓░░░░▓▓▓▓▓  | | |  ticks       │ [Mark holds]      │
│ [Attempt start] [Attempt end]             │ [Undo] [Clear]    │
├──────────────────────┬────────────────────┴───────────────────┤
│ Metrics              │ Contact sequence                       │
│ Touches LH 4 RH 5 …  │ 00:03 RH → hold 2                       │
│ Foot corr. 6         │ 00:05 LF → hold 4                       │
│ Rest 0:42            │ …                                       │
│ Compare A → B (Δ)    │                                         │
└──────────────────────┴────────────────────────────────────────┘
```
With `dir="rtl"` the sidebar moves to the left (CSS grid with logical properties). Font:
`"Segoe UI", system-ui, Arial, sans-serif` everywhere. Times and numbers are
wrapped in `<bdi>`, so mixed Hebrew/number lines keep their order.
