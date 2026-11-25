# ClimbingLens MVP: Design

Source of truth: SPEC.md. Mechanics: ARCHITECTURE.md. Every choice made
without Tal is in DECISIONS.md (D#). Anything unresolved is in OPEN_QUESTIONS.md (Q#).

## Intent

Coaches analyse climbing attempts by hand, late and imprecisely. ClimbingLens gives
feedback on a take **before the next attempt**. A coach films from a tripod, uploads
the take, and within a minute or two sees which limb went on which hold, how often
the feet re-adjusted, and how long the attempt and rests took. They then compare it
with a previous take of the same route. The build is a hackathon demo for the Israel
Climbing Federation challenge.

## Goals
- Tier 1 from SPEC.md section 4, end to end, in one browser tab: upload → process → checklist
  of overlays → metrics → second take → aligned comparison.
- Runs on one laptop in Chrome, offline, free, with no keys (D2, D8, D9).
- Numbers that a coach can check by eye against the video (contact list with
  timestamps, click on the timeline to seek).

## Non-goals
Everything in SPEC.md section 7 (depth, 3D, learning rate, cm accuracy, wearables, VLM feedback,
body-type comparison). Automatic hold detection, automatic attempt cutting,
homography, DTW, live processing.

## Anti-goals (a failure even if it works)
- Numbers that look precise but are wrong. Each metric must trace back to visible
  contacts on the timeline.
- A demo that needs the internet, an account or an API key.
- Feature creep past the SPEC tiers.

## Constraints
- Back-view tripod footage. The climber may be small in the frame, and left/right may be confused (Q2, Q3).
- A few hours for Tier 1.
- Sans-serif font throughout; Hebrew/RTL labels as an option.

## Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| 1 | **Vite + vanilla TypeScript + MediaPipe PoseLandmarker + Vitest** | Few dependencies, typed, pure analysis code unit-tested; manual DOM updates | **Chosen** (D5–D7) |
| 2 | Vite + React + TypeScript + MediaPipe | Easier UI state; more boilerplate and dependencies for a small UI | Runner-up |
| 3 | Single HTML file, plain JS, MediaPipe from a CDN | Fastest start; no types, no tests, needs the internet | Rejected |
| — | Python `rock_climbing` backend (Option B) | Automatic holds; paid API, internet, minutes per video | Out (given) |

Pose library: MediaPipe over MoveNet, because only MediaPipe has heel and toe points (D5).
Processing: seek-and-detect at 15 samples/s after upload, not live (D11).

## Decided (given by Tal)
Option A browser-only; manual hold numbering by clicking on the first frame; Tier 1
before Tier 2; SPEC.md section 7 stays out.

## Decided by Claude (see DECISIONS.md)
Contacts = still segments merged into placements; corrections = re-settles on the same
hold (D15, D16). Normalized coordinates plus body-scale units (D13). Take A = reference,
and B copies A's holds (D19, D20). Alignment by hold first-touch anchors with a
piecewise-linear map (D21). Checklist driven by a layer registry (D25).

## Left to the builder
Exact pixel styling, colours per limb, the blink rate of the correction dot, and
the wording of English labels. Threshold tuning on a real clip (task 6 in PLAN.md).

## Builder check (done by Claude itself, D26)
Questions a builder would ask, and how each was settled:
- *Which point is "the foot"?* Answered: the heel/toe mean (D14).
- *What if the person is not detected in a frame?* `lm: null`; it counts as missing data and
  gaps over 0.3 s break segments (ARCHITECTURE section 4.3).
- *What if take B has a different resolution?* Normalized coordinates handle it if the framing
  is the same; different framing is out of scope (SPEC.md section 5).
- *Does analysis re-run when a hold is added after processing?* Yes. Analysis is pure and
  fast, and re-runs on every hold or attempt change (ARCHITECTURE section 1).
- *Is the playhead time the media time or the wall clock?* The media time
  (`requestVideoFrameCallback` `mediaTime`).
- *Theirs (needs Tal):* real clip availability, L/R swap, climber size, touch-vs-correction
  counting → OPEN_QUESTIONS Q1–Q3, Q5.
