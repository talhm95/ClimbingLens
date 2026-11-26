# ClimbingLens Tier 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-only app: upload a back-view climbing video, see a stick figure, numbered holds and limb contacts, foot corrections and attempt and rest timing, toggled from a checklist, and compare two takes aligned by hold.

**Architecture:** Vite + vanilla TypeScript. MediaPipe PoseLandmarker processes the whole video once after upload into a `PoseTrack`. Pure analysis functions (`src/analysis/`) turn it into contacts and metrics. Canvas layers listed in a single registry draw over the video, and a checklist toggles them.

**Tech Stack:** Vite, TypeScript, `@mediapipe/tasks-vision`, Vitest. Node 24 / npm 11 (checked on this machine). Desktop Chrome.

**Spec:** `SPEC.md` (source of truth) → `docs/superpowers/specs/2026-11-26-climbinglens-design.md` → `ARCHITECTURE.md` (types, signatures, folder layout). Decisions: `DECISIONS.md` (D#). Unresolved: `OPEN_QUESTIONS.md` (Q#).

**Time budget:** Tier 1 = tasks 1–15 plus 10b, about **5 h 20 min** in total. The first working slice (upload → stick figure → one checkbox) is done after task 3 (about 1 h 10 min).

**Reference repo:** contact hysteresis and dwell, per-run smoothing, climber selection and the attempt start/top-out rules are adapted from `jeremyipark/vision-demos/rock_climbing` (Apache-2.0), re-implemented in TypeScript. Credit rules: D38.

## Global Constraints

- No backend, no runtime network calls, no API keys. All assets are served from `public/` after `npm run setup` (D2, D9).
- Target: latest desktop Chrome. Input: MP4/H.264 (Q4).
- Font for headings and body: `font-family: "Segoe UI", system-ui, Arial, sans-serif;`. No web fonts.
- All user-visible text goes through `tr(key)` from `src/ui/i18n.ts`. CSS uses logical properties only (`margin-inline-start`, `inset-inline-end`, …), never `left`/`right`, so `dir="rtl"` flips the layout. Times and numbers go in `<bdi>`.
- `src/analysis/**` imports only `src/types.ts` and `src/config.ts`. No DOM, no MediaPipe.
- Every threshold lives in `src/config.ts`, nowhere else.
- Scope: SPEC.md section 4 Tier 1, then Tier 2. Nothing from SPEC.md section 7. No unlisted features.
- Stored positions are normalized (0–1). Distances are computed in pixels (`x*videoW`, `y*videoH`) and divided by body scale `S` (pixels).

`src/config.ts` (exact values; created in task 2, extended later):
```ts
export const SAMPLE_RATE = 15;        // pose samples per second (D11)
export const MODEL = 'full';          // 'full' | 'heavy' (Q3)
export const SWAP_LR = false;         // Q2
export const NUM_POSES = 2;           // candidates per frame (D36)
export const CLIMBER_MAX_JUMP = 1.5;  // body scales between frames (D36)
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
```

## Review Focus

Inputs the spec implies that a real user will hit, with the test that pins each:

1. **Climber lost for a stretch** (out of frame, occluded, `lm: null` for > 0.3 s): one contact must not be bridged across the gap. *Pinned:* task 7 test `splits a contact at a long missing-data gap`.
2. **Holds edited after processing** (a hold added or undone): contacts and metrics must update without reprocessing the video. *Pinned:* task 8 test `analyzeTake reflects changed holds`.
3. **Take B touches holds in a different order** (skips one, goes back): the alignment must stay monotonic and must not crash. *Pinned:* task 12 test `drops anchors that break monotonic order`.
4. **Attempt marks entered badly** (end before start, overlapping, or none), **or auto-detection finds nothing**: duration and rest must still make sense. *Pinned:* task 10 tests on `normalizeAttempts`, and task 10b test `no start detected gives []`.
5. **No holds marked, or no shared holds between takes**: contacts get `holdId: null`, and comparison falls back to a linear stretch. *Pinned:* task 8 test `zero holds gives null holdIds` and task 12 test `falls back to linear stretch`.

Also checked by hand in task 2: a file Chrome cannot decode shows an error message instead of hanging.

---

## Tier 1

### Task 1: Project scaffold and offline assets (15 min)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles.css`, `scripts/setup-assets.mjs`, `.gitignore`, `tests/smoke.test.ts`, `CREDITS.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test` (`vitest run`), `typecheck` (`tsc --noEmit`), `setup` (`node scripts/setup-assets.mjs`). Static assets served at `/mediapipe/wasm/` and `/models/pose_landmarker_full.task` (also `_heavy`).

- [ ] **Step 1:** Make the first commit of the planning docs on `main` if Tal has not (`git add -A && git commit -m "docs: planning"`), then `git switch -c mvp` (D30).
- [ ] **Step 2:** Scaffold with `npm create vite@latest . -- --template vanilla-ts` (keep the existing files). Delete the template's demo code. Add dependencies: `npm i @mediapipe/tasks-vision` and `npm i -D vitest`.
- [ ] **Step 3:** In `scripts/setup-assets.mjs`, copy `node_modules/@mediapipe/tasks-vision/wasm/*` to `public/mediapipe/wasm/` and download
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`
  and the `pose_landmarker_heavy` equivalent into `public/models/`. Skip files that already exist.
- [ ] **Step 4:** `.gitignore`: `node_modules`, `dist`, `public/mediapipe`, `public/models`, `samples`.
- [ ] **Step 5:** `index.html` = the layout shell from ARCHITECTURE.md section 7 with empty containers: `#header`, `#stage` (`<video id="video">` + `<canvas id="overlay">` stacked), `#sidebar`, `#timeline`, `#metrics`, `#contacts`. `styles.css`: CSS grid, the font stack from Global Constraints, logical properties only.
- [ ] **Step 6:** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 7:** `CREDITS.md` as described in D38: the repo URL, "Apache-2.0", the list of adapted ideas, and "re-implemented in TypeScript, no code copied". Also add a credits line for MediaPipe (Apache-2.0).

**Done:** The app opens with an empty three-area layout in the sans-serif font. Assets are on disk.
**Check:** `npm run setup` → `public/models/pose_landmarker_full.task` exists (~9 MB). `npm test` → 1 passed. `npm run typecheck` → no errors. `npm run dev` → open the URL in Chrome and see the empty layout.
- [ ] **Commit:** `chore: scaffold vite + ts + vitest, offline mediapipe assets`

---

### Task 2: Types, store, upload and pose processing (35 min)

**Files:**
- Create: `src/types.ts` (all types in ARCHITECTURE.md section 3, verbatim; a new `Take` starts with `attemptsSource: 'auto'`), `src/config.ts` (Global Constraints block), `src/state/store.ts`, `src/pose/landmarks.ts`, `src/pose/poseRunner.ts`, `src/analysis/pickClimber.ts`, `src/ui/upload.ts`, `src/ui/progress.ts`, `src/ui/i18n.ts` (English only for now)
- Modify: `src/main.ts`
- Test: `tests/store.test.ts`, `tests/pickClimber.test.ts`

**Interfaces:**
- Produces:
  - `createStore<T>(init: T): { get(): T; set(patch: Partial<T> | ((s: T) => Partial<T>)): void; subscribe(fn: (s: T) => void): () => void }`
  - `updateTake(store: Store<AppState>, id: 'A'|'B', patch: Partial<Take>): void` (in `store.ts`)
  - `landmarks.ts`: `LM` index constants (`L_SHOULDER=11, R_SHOULDER=12, L_ELBOW=13, R_ELBOW=14, L_WRIST=15, R_WRIST=16, L_PINKY=17, R_PINKY=18, L_INDEX=19, R_INDEX=20, L_HIP=23, R_HIP=24, L_HEEL=29, R_HEEL=30, L_FOOT=31, R_FOOT=32`), `SKELETON_EDGES: [number, number][]`, and `LR_PAIRS: [number, number][]`
  - `initPose(): Promise<void>` (GPU, falling back to CPU; `numPoses: NUM_POSES`), `processVideo(video: HTMLVideoElement, onProgress: (p: number) => void): Promise<PoseTrack>`
  - `pickClimber(candidates: Landmark[][], prevPelvis: Vec | null, dims: { videoW: number; videoH: number }): Landmark[] | null` (pure, D36). Torso length and distances are in pixels. A candidate more than `CLIMBER_MAX_JUMP` torso lengths from `prevPelvis` is rejected.
  - `tr(key: string): string`, `setLang(lang: 'en'|'he'): void`

- [ ] **Step 1:** Test `store.test.ts`: `set` merges the patch; `subscribe` fires once per `set`; the unsubscribe function stops notifications. Run `npx vitest run tests/store.test.ts` → FAIL. Implement it → PASS.
- [ ] **Step 2:** Test `pickClimber.test.ts` (1000×1000 px). Build candidates with a helper that places a person with pelvis at (x, y) and torso length L:
  - `[]` → `null`.
  - One candidate, no previous pelvis → that candidate.
  - Two candidates, no previous pelvis, torso 0.2 vs 0.1 → the 0.2 one.
  - Two candidates with pelvis at (0.3, 0.6) and (0.7, 0.6), previous pelvis (0.32, 0.6) → the first, even if the second has the longer torso.
  - One candidate at (0.8, 0.6), torso 0.2, previous pelvis (0.3, 0.6) (2.5 torso lengths away) → `null`.

  FAIL → implement → PASS. Add the credit header (D38).
- [ ] **Step 3:** Implement `processVideo` as in ARCHITECTURE.md section 4.1: seek `t = i / SAMPLE_RATE`, await `seeked`, `detectForVideo(video, Math.round(t*1000))`, map each `result.landmarks[k]` to `Landmark{x,y,v: visibility}`, then `pickClimber(…, prevPelvis)`. `prevPelvis` = the last chosen pelvis; reset it to `null` after 1 s with no chosen pose. Apply `SWAP_LR` with `LR_PAIRS`.
- [ ] **Step 4:** `upload.ts`: a file input sets take A (`URL.createObjectURL`). On `loadedmetadata` it sets `mode: 'processing'`, calls `processVideo`, stores `poses`, then sets `mode: 'idle'` and seeks to 0. On a video `error` event it shows `tr('error.video')` ("This video format can't be played in Chrome. Convert to MP4 (H.264).") and leaves the processing state.
- [ ] **Step 5:** `progress.ts` renders `state.progress` as a bar while `mode === 'processing'`.

**Done:** Choosing an MP4 shows a progress bar, then `store.get().takes.A.poses.frames.length ≈ duration × 15`.
**Check:** `npm test` passes. Manual check: upload a clip (from `samples/`, or any MP4 of a person), and in DevTools run `__store.get().takes.A.poses.frames.length` (expose `window.__store` in dev only). Upload a `.mov` HEVC file and see the error message.
- [ ] **Commit:** `feat: upload and pose processing into PoseTrack`

---

### Task 3: Overlay, skeleton layer and checklist (vertical slice) (20 min)

**Files:**
- Create: `src/overlay/viewport.ts`, `src/overlay/renderLoop.ts`, `src/overlay/layers/registry.ts`, `src/overlay/layers/skeleton.ts`, `src/ui/checklist.ts`, `src/analysis/limbs.ts` (only `frameAt` for now)
- Test: `tests/viewport.test.ts`, `tests/frameAt.test.ts`

**Interfaces:**
- Produces:
  - `type Viewport = { ox: number; oy: number; w: number; h: number }`, `computeViewport(canvasW, canvasH, videoW, videoH): Viewport`, `toCanvas(v: Viewport, p: Vec): Vec`, `toNorm(v: Viewport, px: Vec): Vec | null`
  - `frameAt(track: PoseTrack, t: number): PoseFrame | null` (nearest sample, `null` outside the range)
  - `LayerDef` exactly as in ARCHITECTURE.md section 5, and `LAYERS: LayerDef[]`
  - `startRenderLoop(video: HTMLVideoElement, canvas: HTMLCanvasElement, store: Store<AppState>): void`
  - `renderChecklist(root: HTMLElement, store): void`

- [ ] **Step 1:** Tests: `computeViewport(1000, 500, 1920, 1080)` → `{ox: 55.55…, oy: 0, w: 888.88…, h: 500}` (letterboxed at the sides); `toNorm` of a point inside the black bars → `null`; `toCanvas(toNorm(p)) ≈ p`. `frameAt` with sampleRate 15: `t=0.12` → frame 2 (0.1333 is nearer than 0.0667; avoid `t=0.1`, which sits exactly halfway between samples); `t=-1` → `null`. Run → FAIL; implement → PASS.
- [ ] **Step 2:** `skeleton.ts`: draw `SKELETON_EDGES` and the joints for `frameAt(track, t)`, skipping landmarks with `v < MIN_VISIBILITY`. Line width 3 CSS px, colour white with a dark outline so it reads on any wall.
- [ ] **Step 3:** `renderLoop.ts`: `video.requestVideoFrameCallback((_, meta) => …)` using `meta.mediaTime`. Also redraw on `seeked` and on store change (for a paused video). Resize the canvas to the stage with `devicePixelRatio`.
- [ ] **Step 4:** Registry with one entry: `{ id: 'skeleton', tier: 1, label: {en: 'Stick figure', he: 'שלד'}, needs: ['poses'], draw }`. The checklist renders it as a checkbox, enabled by default.

**Done (first slice):** Upload → process → play: the stick figure tracks the climber, and unchecking "Stick figure" hides it.
**Check:** `npm test` passes. Manual check: play, pause, seek and resize the window; the skeleton stays on the body in all cases.
- [ ] **Commit:** `feat: overlay render loop, skeleton layer, checklist`

---

### Task 4: Real-clip check (10 min, manual; needs Q1)

**Files:**
- Create: `src/ui/debug.ts` (only when `location.search` has `debug`)
- Modify: `src/config.ts` (only if a finding requires it)

**Interfaces:**
- Produces: a debug button that downloads the active take's `PoseTrack` as `poses-<fileName>.json` (D28). The JSON files go to `samples/` and are not committed.

- [ ] **Step 1:** Load a real tripod back-view clip. Check: (a) is the skeleton found on most frames? (b) Are the left and right labels correct? Colour the left limbs differently while checking. (c) Are the feet tracked when they are small?
- [ ] **Step 2:** If L/R is swapped consistently, set `SWAP_LR = true`. If the climber is lost often, try `MODEL = 'heavy'`. Write the findings in OPEN_QUESTIONS.md under Q2 and Q3.
- [ ] **Step 3:** Export `poses.json` for later threshold tuning.

**Done:** Q2 and Q3 answered with evidence, or marked "no clip yet".
**Check:** Findings are written in OPEN_QUESTIONS.md.
- [ ] **Commit:** `chore: debug pose export, config from real-clip check`

---

### Task 5: Hold marking and hold-number layer (15 min)

**Files:**
- Create: `src/ui/holdMarker.ts`, `src/overlay/layers/holds.ts`
- Modify: `src/overlay/layers/registry.ts`, `src/ui/i18n.ts`

**Interfaces:**
- Consumes: `toNorm` (task 3), `updateTake` (task 2)
- Produces: `Take.holds` filled in click order with `id = holds.length + 1`. Layer `holds` (label en "Hold numbers", he "מספרי אחיזות").

- [ ] **Step 1:** "Mark holds" button: pauses, seeks to 0, sets `mode: 'markHolds'`. A canvas click → `toNorm` → push a hold (clicks outside the video are ignored). Buttons "Undo" (pop) and "Done". Draw a crosshair cursor in this mode.
- [ ] **Step 2:** `holds.ts`: a circle (radius 14 CSS px) and the number, centred, in bold sans-serif with a high-contrast outline.

**Done:** Clicking 5 holds shows 1–5 at the click points. Undo removes 5. The numbers stay put through resizing and playback.
**Check:** Manual check as above. `__store.get().takes.A.holds` shows normalized x,y values between 0 and 1.
- [ ] **Commit:** `feat: manual hold marking and numbered hold layer`

---

### Task 6: Limb points, smoothing, body scale (15 min, TDD)

**Files:**
- Create: `src/analysis/smoothing.ts`, `tests/fixtures/synth.ts`
- Modify: `src/analysis/limbs.ts`
- Test: `tests/smoothing.test.ts`, `tests/limbs.test.ts`

**Interfaces:**
- Produces:
  - `interpolateGaps(pts: (Vec|null)[], dt: number, maxGap: number): (Vec|null)[]`. Fills a run of nulls linearly when it has points on both sides and the time between those two known samples is ≤ `maxGap` seconds.
  - `gaussianSmooth(pts: (Vec|null)[], sigma: number): (Vec|null)[]`. Gaussian kernel truncated at 3σ, applied **separately to each contiguous non-null run**, and renormalized over the samples that exist (no padding). Nulls stay null.
  - `limbPoint(lm: Landmark[] | null, limb: Limb): Vec | null` and `pelvis(lm): Vec | null`, landmark sets as in ARCHITECTURE.md section 4.2, dropping `v < MIN_VISIBILITY`
  - `limbSeries(track: PoseTrack, limb: Limb): (Vec|null)[]` = limbPoint → interpolateGaps(MAX_INTERP_GAP) → gaussianSmooth(SMOOTH_SIGMA)
  - `bodyScale(track: PoseTrack): number` (pixels), `distPx(a: Vec, b: Vec, track: PoseTrack): number`
  - Fixture: `type Keyframe = { t: number; x: number; y: number }`; `synthTrack(o: { duration: number; limbs: Partial<Record<Limb, Keyframe[]>>; missing?: [number, number][] }): PoseTrack`. It uses sampleRate 15 and videoW = videoH = 1000, with shoulders at y 0.4 and hips at y 0.6, so **S = 200 px**. Each limb is piecewise-linear between keyframes and constant outside them. All landmarks have `v = 1`, and frames inside `missing` ranges get `lm: null`.

- [ ] **Step 1:** Tests:
  - `interpolateGaps` at dt 1/15 fills 2 nulls (known neighbours 0.2 s apart) linearly and leaves 6 nulls (0.47 s apart) as nulls.
  - `gaussianSmooth` with σ = 1 on x values `[0,0,3,0,0]` → the middle ≈ 1.208 (3 / (1 + 2·(0.6065 + 0.1353))), and the result is symmetric.
  - `gaussianSmooth` on `[0,0,null,10,10]` → unchanged: the two runs are smoothed separately, so nothing leaks across the gap.
  - `limbPoint` for LH = the mean of 15, 17 and 19; with landmark 17 at `v=0.2` it is the mean of 15 and 19.
  - `bodyScale(synthTrack({duration: 2, limbs: {}}))` → 200.
- [ ] **Step 2:** Run `npx vitest run tests/smoothing.test.ts tests/limbs.test.ts` → FAIL. Implement → PASS.

- [ ] **Step 3:** Add the credit header (D38) to `smoothing.ts` (per-run smoothing is adapted from the repo).

**Done / Check:** Both test files pass. `npm run typecheck` is clean.
- [ ] **Commit:** `feat: limb points, gap fill, smoothing, body scale`

---

### Task 7: Contact detection (40 min, TDD)

Rules: ARCHITECTURE.md section 4.3 (D15, D16). A contact = on a hold with hysteresis **and** settled. Detection runs over the whole video; attempts are applied afterwards by `clipToAttempts`.

**Files:**
- Create: `src/analysis/contacts.ts` (with the credit header, D38)
- Test: `tests/contacts.test.ts`

**Interfaces:**
- Consumes: task 6 functions and the `synthTrack` fixture.
- Produces:
  - `type AnalysisCtx = { track: PoseTrack; S: number; holds: Hold[] }`
  - `type Run = { i0: number; i1: number }` (inclusive sample indices); `type Stay = { limb: Limb; holdId: number; i0: number; i1: number }`
  - `stillMask(series: (Vec|null)[], ctx: AnalysisCtx): boolean[]`
  - `stillSegments(series: (Vec|null)[], ctx: AnalysisCtx): Run[]` (still runs lasting ≥ `MIN_STILL`)
  - `holdStays(series: (Vec|null)[], limb: Limb, ctx: AnalysisCtx): Stay[]` (hysteresis walk, as in ARCHITECTURE.md section 4.3 step 3)
  - `confirmStays(stays: Stay[], series: (Vec|null)[], stills: Run[], ctx: AnalysisCtx): Contact[]` (with `attempt: -1`)
  - `footSmears(series: (Vec|null)[], limb: 'LF'|'RF', stills: Run[], confirmed: Contact[], ctx: AnalysisCtx): Contact[]`
  - `detectContacts(ctx: AnalysisCtx): Contact[]`: all four limbs over the whole video, sorted by `start`
  - `clipToAttempts(contacts: Contact[], attempts: Attempt[]): Contact[]`

- [ ] **Step 1:** Tests. With S = 200 px: still means < 0.1 normalized units/s, `HOLD_RADIUS` = 0.12 and `RELEASE_RADIUS` = 0.2 normalized units. Holds: 1 at (0.5, 0.3), 2 at (0.5, 0.2). Times have a ±0.15 s tolerance:
  - `confirms a settled contact`: RH still on hold 1 for 0–1 s → 1 contact, `holdId 1`, start ≈ 0, end ≈ 1.
  - `ignores a pass-by`: RH moves from (0.3, 0.3) to (0.7, 0.3) over 0–1.6 s (1.25 S/s). It is inside the radius for about 1 s but never still → 0 contacts.
  - `ignores a touch shorter than HOLD_DWELL`: RH arrives at 3 units/s, is still on hold 1 for 0.3 s, and leaves at 3 units/s → 0 contacts.
  - `hysteresis keeps the hold through a wiggle and counts a correction`: LF still on hold 1 for 0–1 s, out to (0.66, 0.3) by 1.15 s (0.8 S: outside the enter radius, inside the release radius), back by 1.3 s, still to 3 s → 1 contact on hold 1, `corrections.length === 1`, `corrections[0] ≈ 1.3`.
  - `leaving past RELEASE_RADIUS starts a new contact`: the same, but out to (0.76, 0.3) (1.3 S), still there for 0.5 s, then back → holdIds `[1, null, 1]` (the middle one is a smear), zero corrections.
  - `a deeper hold wins`: RH still on hold 1 for 0–1 s, moves to hold 2 by 1.2 s, still to 2.5 s → holdIds `[1, 2]` (hold 2 is only 0.5 S from hold 1, inside the release radius, so without this rule it would stay on 1).
  - `splits a contact at a long missing-data gap`: RH still on hold 1 for 0–3 s with `missing: [[1, 2]]` → 2 contacts.
  - `bridges a short missing-data gap`: `missing: [[1, 1.2]]` → 1 contact.
  - `foot smear`: LF still at (0.9, 0.9), no hold near, for 0–1 s → 1 contact with `holdId: null`.
  - `a still hand off any hold is not a contact`: RH still at (0.9, 0.9) → 0 contacts.
  - `clipToAttempts`: the "deeper hold" contacts with attempts `[{start: 1.5, end: 3}]` → only the hold-2 contact, start clipped to 1.5, `attempt: 0`. A contact fully outside is dropped, and so are corrections outside the clipped range.
- [ ] **Step 2:** Run `npx vitest run tests/contacts.test.ts` → FAIL. Implement → PASS. Speed per sample = `distPx(p[i], p[i-1]) * SAMPLE_RATE / S`, and nulls are not still. If smoothing pulls a synthetic wiggle below `STILL_SPEED`, make the wiggle faster in the fixture; do not change the config values.

**Done / Check:** All contact tests pass. `npm test` is green.
- [ ] **Commit:** `feat: contact detection with hysteresis, dwell and stillness`

---

### Task 8: Analysis wiring, contact markers, contact list, touch count, metrics panel (25 min)

**Files:**
- Create: `src/analysis/metrics.ts` (`computeMetrics` only; `normalizeAttempts` comes in task 10, so for now use `[{start: 0, end: duration}]`), `src/analysis/analyzeTake.ts`, `src/overlay/layers/contacts.ts`, `src/ui/contactList.ts`, `src/ui/metricsPanel.ts`
- Modify: `registry.ts`, `i18n.ts`, `main.ts` (re-run analysis when holds, attempts or poses change)
- Test: `tests/metrics.test.ts`, `tests/analyzeTake.test.ts`

**Interfaces:**
- Produces:
  - `computeMetrics(contacts: Contact[], attempts: Attempt[]): Metrics`. `touches` counts contacts per limb. `footCorrections` sums `corrections.length` for LF and RF. `attempts` and `rests` are filled in task 10 (until then: one attempt, no rests).
  - `analyzeTake(take: Take): { contacts: Contact[]; metrics: Metrics; attempts: Attempt[] }`. It returns empty results when `poses` is null. Chain: `detectContacts` → attempts (until tasks 10/10b: `[{start: 0, end: duration}]`) → `clipToAttempts` → `computeMetrics`. The full chain is in ARCHITECTURE.md section 4.3.
  - Layers `contacts` (en "Limb contacts", he "מגע גפיים") and `touches` (en "Touch count", he "מספר מגעים", metrics only, no `draw`).
  - Limb colours: LH `#4fc3f7`, RH `#1565c0`, LF `#ffb74d`, RF `#e65100` (left = lighter).

- [ ] **Step 1:** Tests:
  - `computeMetrics` on hand-built contacts (2 LH, 3 RH, 1 LF with 2 corrections, 2 RF with 1) → touches `{LH:2,RH:3,LF:1,RF:2,total:8}`, footCorrections `{LF:2,RF:1,total:3}`.
  - `analyzeTake reflects changed holds`: synthetic take with the LF still at hold 1's position; removing that hold changes the contact's `holdId` from 1 to null (a smear).
  - `zero holds gives null holdIds`: there are no hand contacts, the foot contacts are smears with `holdId === null`, and there is no exception.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** The `contacts` layer draws a limb-coloured ring with its label ("RH 2") at `pos` while `start ≤ t ≤ end`. The `contactList` shows `mm:ss LIMB → hold N` (or "→ no hold"); clicking a row seeks the video to `start`. The `metricsPanel` shows the rows of enabled layers.

**Done:** On a real clip with marked holds, the list reads like "00:03 RH → hold 2", and the rings appear on the video in sync. The touch counts match the list.
**Check:** `npm test` is green. Manually count a few contacts in the video against the list.
- [ ] **Commit:** `feat: contact markers, contact sequence, touch count`

---

### Task 9: Foot corrections layer (15 min)

**Files:**
- Create: `src/overlay/layers/corrections.ts`
- Modify: `registry.ts`, `i18n.ts`
- Test: `tests/corrections.test.ts`

**Interfaces:**
- Produces: `activeCorrections(contacts: Contact[], t: number): { limb: Limb; at: number }[]`, pure, in `src/analysis/metrics.ts`: the corrections of LF or RF with `|t − at| ≤ BLINK_WINDOW`. Layer `footCorrections` (en "Foot corrections", he "תיקוני רגל") draws and has metrics rows (LF, RF, total).

- [ ] **Step 1:** Test: corrections at 2.0 s and 5.0 s → `activeCorrections(…, 2.4)` returns 1, `(…, 3.0)` returns 0. Hand corrections are never returned.
- [ ] **Step 2:** FAIL → implement → PASS. Drawing: a filled dot on the foot's current `limbPoint` (from `frameAt`), alpha `0.5 + 0.5*sin(performance.now()/80)`, plus a small counter "LF ×2" for that placement so far.

**Done:** On a clip with a re-adjusting foot, the dot blinks on that foot at the right moment and the panel shows the total.
**Check:** `npm test` is green, plus the manual check above.
- [ ] **Commit:** `feat: foot corrections blinking marker and metric`

---

### Task 10: Attempts, timeline, duration and rest (25 min)

**Files:**
- Create: `src/ui/attemptMarker.ts`, `src/ui/timeline.ts`
- Modify: `src/analysis/metrics.ts`, `registry.ts`, `metricsPanel.ts`, `i18n.ts`
- Test: `tests/attempts.test.ts`

**Interfaces:**
- Produces:
  - `normalizeAttempts(attempts: Attempt[], duration: number): Attempt[]`. Swaps start/end when reversed, drops zero-length attempts, clamps to [0, duration], sorts, merges overlaps, and returns `[{start: 0, end: duration}]` when the list is empty. `analyzeTake` now uses it.
  - `computeMetrics` fills `attempts[i].duration` and `rests[i].duration` (the gaps between consecutive attempts).
  - `restAt(attempts: Attempt[], t: number): number | null`: seconds since the previous attempt ended if `t` is in a rest, else null.
  - Layer `timing` (en "Attempt & rest time", he "זמן ניסיון ומנוחה"): metrics rows, plus a rest timer in the panel.

- [ ] **Step 1:** Tests:
  - `normalizeAttempts([], 10)` → `[{0,10}]`; `[{start:5,end:2}]` → `[{2,5}]`; `[{0,4},{3,6}]` → `[{0,6}]`; `[{8,12}]` with duration 10 → `[{8,10}]`.
  - Metrics with attempts `[{0,20},{50,80}]` → durations [20, 30], rests [30].
  - `restAt` at t=30 → 10; at t=60 → null.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Buttons "Attempt start" and "Attempt end" use `video.currentTime` and set `attemptsSource: 'manual'`; the first manual mark replaces any automatic attempts (task 10b). A start without an end is shown as pending and is ignored by analysis. A "Clear attempts" button. The timeline is a full-width bar with attempt bands (coloured), rest bands (grey) and the playhead, plus the marks from every enabled layer's `timelineMarks()` (ARCHITECTURE.md section 5, D32). Add `timelineMarks` to the `contacts` entry (limb-coloured ticks at each `start`) and to the `footCorrections` entry (a tick at each correction). Clicking seeks.

**Done:** With two attempts marked, the panel shows each duration and the rest, and the rest timer counts up while playing through the rest.
**Check:** `npm test` is green, plus the manual check: the timeline ticks line up with the contact list times.
- [ ] **Commit:** `feat: manual attempts, timeline, duration and rest metrics`

---

### Task 10b: Automatic attempt start and end (25 min, TDD)

Added by Tal (D37). Rules: ARCHITECTURE.md section 4.6.

**Files:**
- Create: `src/analysis/autoAttempts.ts` (with the credit header, D38)
- Modify: `src/analysis/analyzeTake.ts`, `src/ui/attemptMarker.ts`, `src/ui/timeline.ts`, `src/ui/i18n.ts`
- Test: `tests/autoAttempts.test.ts`

**Interfaces:**
- Consumes: `detectContacts`, `clipToAttempts` (task 7), `normalizeAttempts` (task 10)
- Produces: `detectAttempts(contacts: Contact[], holds: Hold[], track: PoseTrack): Attempt[]`. It takes the **unclipped** contacts and uses only those with a non-null `holdId`; `track` supplies the sample times. `analyzeTake` uses it when `attemptsSource === 'auto'`.

- [ ] **Step 1:** Tests use hand-built contacts and a `synthTrack` used only for its sample times (15/s). Holds: 1 (0.5, 0.8) and 2 (0.6, 0.8) are footholds, 3 (0.5, 0.5) is a handhold, 9 (0.5, 0.1) is the top. Tolerance ±0.1 s.
  - `detects a topped-out attempt`: LF on 1 and RF on 2 for 2–12 s, RH on 3 for 2–9 s, then LH and RH both on 9 from 10 s → `[{start ≈ 2, end ≈ 10.5}]`.
  - `ends at a fall`: the same start, but every contact ends at 6 s → `end ≈ 6`.
  - `finds two attempts`: a fall at 6 s, then the same start pattern at 20 s and a top-out from 28 s → 2 attempts, the second `{≈ 20, ≈ 28.5}`.
  - `leaky start survives a one-sample miss`: RF's contact is split into 2–2.2 s and 2.27–12 s → start still ≈ 2.
  - `no start detected gives []`: hand contacts only → `[]`.
  - `analyzeTake respects the source`: `attemptsSource: 'manual'` with attempts `[{0, 5}]` → the returned attempts are `[{0, 5}]`; `'auto'` → the detected ones.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** UI: once holds are marked, the timeline shows automatic attempts with a dashed outline and an "Auto" badge (en "Auto", he "אוטומטי"). An "Auto-detect" button sets `attemptsSource: 'auto'`. The manual buttons switch to manual (task 10).

**Done:** On a real clip with every hold clicked (Q14), attempt bands appear without pressing anything, the durations look right, and manual marks override them.
**Check:** `npm test` is green, plus a manual check on a clip with a fall and a top-out.
- [ ] **Commit:** `feat: automatic attempt start and end`

---

### Task 11: Second take (15 min)

**Files:**
- Create: `src/ui/takeSwitcher.ts`
- Modify: `src/ui/upload.ts` ("Add second take"), `main.ts`, `i18n.ts`

**Interfaces:**
- Produces: `state.takes.B` processed by the same pipeline. When B loads, it gets `holds: structuredClone(A.holds)` (D20). The `active` switch changes the `<video src>` and keeps `enabled`. Everything that reads "the take" uses `takes[active]`.

- [ ] **Step 1:** "Add second take" is enabled only once A is processed. Loading B processes it and makes B active.
- [ ] **Step 2:** The A / B switcher swaps the video, overlays, list and panel. The hold-marking mode works on whichever take is active.

**Done:** Both takes can be viewed and switched, B shows A's hold numbers, and each has its own contacts and metrics.
**Check:** Manual check: switch back and forth during playback with no stale overlay; `__store.get().takes.B.holds` deep-equals A's.
- [ ] **Commit:** `feat: second take with shared holds and take switcher`

---

### Task 12: Time alignment (20 min, TDD)

**Files:**
- Create: `src/analysis/alignment.ts`
- Test: `tests/alignment.test.ts`

**Interfaces:**
- Produces:
  - `firstTouches(contacts: Contact[], attempt = 0): Map<number, number>` (holdId → earliest `start`; null holds are ignored)
  - `type Anchor = { a: number; b: number }`; `buildAnchors(A: Take, B: Take): Anchor[]` (uses normalized first attempts)
  - `timeMap(anchors: Anchor[]): (tB: number) => number` (piecewise-linear, clamped to the first and last anchors)

`buildAnchors` algorithm (not fixed by its signature):
```
pairs = [{a: A.start, b: B.start}]
      + for each hold id in both firstTouches maps: {a: tA, b: tB}
      + [{a: A.end, b: B.end}]
sort pairs by b
keep the longest subsequence strictly increasing in a (O(n²) DP is fine, n < 50)
```

- [ ] **Step 1:** Tests:
  - A touches holds 1, 2, 3 at 1, 3, 5 s (attempt 0–6); B touches them at 2, 6, 8 s (attempt 0–10). Anchors = `[{0,0},{1,2},{3,6},{5,8},{6,10}]`. `timeMap(4)` → 2, `timeMap(6)` → 3, `timeMap(-1)` → 0, `timeMap(12)` → 6.
  - `drops anchors that break monotonic order`: B touches hold 3 before hold 2 → the result has 4 anchors and is strictly increasing in both a and b.
  - `falls back to linear stretch`: no shared holds → 2 anchors; `timeMap(5)` → 3.
- [ ] **Step 2:** FAIL → implement → PASS.

**Done / Check:** `npx vitest run tests/alignment.test.ts` passes.
- [ ] **Commit:** `feat: hold-anchored time alignment between takes`

---

### Task 13: Comparison overlay and difference table (25 min)

**Files:**
- Create: `src/analysis/compare.ts`, `src/overlay/layers/comparison.ts`, `src/ui/compareTable.ts`
- Modify: `registry.ts`, `metricsPanel.ts`, `i18n.ts`
- Test: `tests/compare.test.ts`

**Interfaces:**
- Consumes: `buildAnchors`, `timeMap` (task 12), `pelvis` (task 6)
- Produces:
  - `type DiffRow = { key: string; a: number; b: number; delta: number; unit: 'count' | 's' }`
  - `diffMetrics(a: Metrics, b: Metrics, enabled: Record<LayerId, boolean>): DiffRow[]`. With `touches` enabled: rows `touches.LH|RH|LF|RF|total`. With `footCorrections`: `footCorrections.LF|RF|total`. With `timing`: `attempt.duration` (first attempt, unit `s`). `delta = b − a`.
  - Layer `comparison` (en "Compare with take A", he "השוואה לניסיון A"), with `needs: ['takeB']`.

- [ ] **Step 1:** Tests: with only `footCorrections` enabled → 3 rows. For a: 6, b: 2 → `delta −4`. With nothing enabled → `[]`. With `timing` → a row with unit `s`.
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** `comparison.ts` (only when active = B and A is processed): A's pelvis polyline over its first attempt in grey `#9e9e9e`, width 3; B's pelvis polyline from its attempt start to `t` in `#00e676`; a grey dot at A's pelvis at `frameAt(A.poses, timeMap(anchors)(t))`. Cache the anchors and the polylines per analysis run, not per frame.
- [ ] **Step 4:** `compareTable.ts` renders "label · a → b (Δ)", with Δ in green when it is better (fewer corrections or touches, shorter time) and red when worse, and `<bdi>` around the numbers.

**Done:** Playing B shows its green path growing over A's grey path, and the grey dot reaches each hold when B does. The table lists only the checked metrics.
**Check:** `npm test` is green, plus a manual check on two takes: at B's first touch of hold N, the grey dot is at or near hold N.
- [ ] **Commit:** `feat: two-take pelvis overlay and metric difference table`

---

### Task 14: Hebrew labels and RTL (10 min)

**Files:**
- Modify: `src/ui/i18n.ts` (Hebrew dictionary), `src/ui/*` header toggle, `styles.css`

**Interfaces:**
- Produces: an EN | עב toggle. `setLang` sets `state.lang`, `document.documentElement.lang` and `dir`. All panels re-render.

- [ ] **Step 1:** Write the Hebrew dictionary for every key added so far (first draft, flagged in Q7). Limb codes stay LH/RH/LF/RF (D31).
- [ ] **Step 2:** Switch to Hebrew: the sidebar moves to the left, text aligns right, and lines like "00:03 RH ← אחיזה 2" keep their time and number order thanks to `<bdi>`. The arrow direction follows `dir`.

**Done:** The whole UI reads correctly in both directions, with no clipped or mirrored numbers.
**Check:** Manual check in both languages. `grep -rnE "(margin|padding)-(left|right)|[^-]left:|[^-]right:" src/styles.css` → no matches.
- [ ] **Commit:** `feat: hebrew labels and rtl layout`

---

### Task 15: Tier 1 demo run-through (10 min)

**Files:** `src/config.ts` (tuning only), OPEN_QUESTIONS.md (findings)

- [ ] **Step 1:** Follow the SPEC.md section 11 demo script steps 1–4 on the two pre-recorded takes, in a fresh Chrome window with Wi-Fi off.
- [ ] **Step 2:** If the contact counts are clearly off, tune `HOLD_RADIUS`, `RELEASE_RADIUS`, `HOLD_DWELL`, `STILL_SPEED` and `MIN_STILL` against the exported `poses.json`. If the automatic attempts are off, tune `START_DWELL`, `TOP_DWELL` and `END_GAP`. Re-run `npm test` (the tests must stay green).
- [ ] **Step 3:** `npm run build && npx vite preview`, then repeat step 1 on the built app.

**Done:** The whole demo script runs offline without errors in the console.
**Check:** The DevTools console is clean, the Network tab shows no external requests, and `npm test` and `npm run typecheck` are green.
- [ ] **Commit:** `chore: tier 1 tuned and verified offline`

---

## Tier 2 (start only after task 15 passes; order per Q8)

Each task: a pure function in `src/analysis/` with a Vitest test on `synthTrack`, a layer in `src/overlay/layers/`, a registry entry with en/he labels, and a commit. Thresholds go in `config.ts` with the values in ARCHITECTURE.md section 4.5. The definitions, types (`Tier2Results`, `Metrics.tier2`, `DropEvent`, `Jump`) and difference-table rows (D33) are in ARCHITECTURE.md sections 3, 4.5 and 6. Each task fills its own fields in those and adds its own rows to `diffMetrics`.

| # | Task | Files | Done looks like | Check | Est. |
|---|---|---|---|---|---|
| 16 | **Foot-contact heatmap** | `analysis/heatmap.ts` `heatmap(track, contacts, cols=64, rows=36): Float32Array` (count of still-foot samples per cell, normalized 0–1); `layers/heatmap.ts` (offscreen canvas, blurred, alpha ≤ 0.5, built once per analysis) | Spots where the feet stood; more often = stronger | Test: a foot still for 2 s at one cell → that cell = 1 and empty cells = 0; manual look | 20 min |
| 17 | **Weight shift** | `analysis/weightShift.ts` `weightOffset(track, contacts, t): { offset: number; foot: Limb } \| null` (pelvis x − supporting-foot x, in S; supporting = the foot in contact, the lower one if both); `WEIGHT_TOL = 0.25`; `layers/weightShift.ts` vertical line from the pelvis, red when `|offset| > WEIGHT_TOL` | The line turns red when the hips swing off the foot | Tests: offset 0 → within tolerance; 0.4 → out; no foot in contact → null | 20 min |
| 18 | **Joint angles (elbows)** | `analysis/angles.ts` `angle2D(a: Vec, b: Vec, c: Vec, track): number` (degrees, at b, in pixel space); `layers/angles.ts` labels at landmarks 13 and 14 | Elbow angles drawn on the stick figure, labelled "2D" | Tests: right angle → 90; straight → 180; a non-square video does not distort it | 15 min |
| 19 | **Hand/foot drop events** | `analysis/drops.ts` `detectDrops(ctx, contacts): DropEvent[]` (within `DROP_WINDOW = 0.3` s after a contact ends, unsmoothed speed > `DROP_SPEED = 3` S/s and movement mostly downward, D34); `layers/drops.ts` with `timelineMarks` only | Red marks on the timeline at slips | Tests: a hand leaves its hold 0.3 units straight down in 0.1 s → 1 drop; the same move upward → 0; a slow downward step (0.1 units in 0.5 s) → 0 | 20 min |
| 20 | **Jump performance** | `analysis/jump.ts` `detectJumps(track, contacts, attempts): Jump[]` and `matchJump(jumps: Jump[], tA: number): Jump \| null` (`Jump` type in ARCHITECTURE.md section 3; take-off = no limb in contact and pelvis speed > `JUMP_SPEED = 2` S/s); `layers/jump.ts` arrow scaled to speed, plus A's grey arrow from the same origin (ARCHITECTURE.md section 6) | An arrow at each dyno; landing order listed | Test: synthetic pelvis jump → 1 jump with the right direction and first landing | 30 min |

---

## Self-review notes

- **Spec coverage:** every SPEC.md section 4 Tier 1 row maps to a task (stick figure 3; holds and markers 5, 7, 8; touch count 8; foot corrections 7, 9; duration and rest 10, plus automatic start/end 10b (added by Tal, D37); comparison 11–13). Section 3 contact sequence → 8. Section 5 → 11–13. Section 6 L/R check → 4. Section 10 UI → 1, 3, 10, 14. Section 11 demo → 15. Tier 2 → 16–20. Section 7 → nothing, as intended.
- **Type consistency:** `AnalysisCtx`, `Contact`, `Metrics`, `Anchor`, `DiffRow` and `LayerDef` are each defined once (ARCHITECTURE.md section 3 or the owning task's Interfaces) and used under the same names afterwards.
- **Estimates:** Tier 1 = 15+35+20+10+15+15+40+25+15+25+25 (10b)+15+20+25+10+10 = 320 min ≈ 5 h 20 min. Tier 2 ≈ 1 h 45 min.
