# Decisions log

Planning ran on 2026-11-26 while Tal was away. Each entry is a question the
brainstorming would have asked, the answer chosen, and why. Anything not
decidable from SPEC.md is in OPEN_QUESTIONS.md. Override any of these by
editing this file and the affected docs.

Format: **Q** question · **A** answer · **Why** reason. "Given" = set by Tal's
instructions, not chosen by Claude.

---

## Product and scope

**D1. Q:** What is this for, and what does success look like?
**A:** A hackathon demo for the Israel Climbing Federation challenge. Success:
a coach uploads a take and gets usable feedback (contacts, foot corrections,
timing) before the climber's next attempt, then compares two takes.
**Why:** SPEC.md sections 1 and 2.

**D2. Q:** Browser-only (Option A) or build on the Python `rock_climbing` repo (Option B)?
**A:** Option A: browser only, no backend, no paid API, no API keys. *(Given.)*
The optional "show `rock_climbing` output on a pre-processed video" from the
spec's middle path is **not** in the plan. It is a pitch asset, not app code.
**Why:** Given default. It also avoids internet and cost risk at the demo.

**D3. Q:** Which features get built?
**A:** Tier 1 from SPEC.md section 4 first. Tier 2 only after Tier 1 works end
to end. Everything in SPEC.md section 7 stays out. *(Given.)*
**Why:** Given default.

**D4. Q:** How do holds get their numbers?
**A:** Manual. The user clicks holds on the first frame and they are numbered in
click order. Controls: undo last, clear all. *(Given.)*
**Why:** Given default; SPEC.md section 3 "MVP default".

## Stack

**D5. Q:** Which pose library?
**A:** MediaPipe Tasks Vision `PoseLandmarker` (`@mediapipe/tasks-vision`),
`pose_landmarker_full` model, GPU delegate with CPU fallback.
**Why:** It runs in the browser and is free. It has 33 landmarks, including
**heel and foot-index (toe)** points, and the foot metrics need those.
MoveNet (17 points) stops at the ankle. The `heavy` model is the fallback if
`full` misses the small climber (see OPEN_QUESTIONS Q3).

**D6. Q:** Framework?
**A:** Vite + vanilla TypeScript, with no UI framework. A tiny store with subscribe
drives re-renders.
**Why:** The UI is small (checklist, panels, timeline, a table). Without a framework
there are fewer dependencies and less boilerplate, which suits a few hours of work. React was the
runner-up; it would help if the UI grows. A no-build single HTML file was
rejected: it has no types and no unit tests, and loading from a CDN needs internet.

**D7. Q:** How do we test?
**A:** Vitest unit tests for all pure analysis code (smoothing, contacts,
corrections, metrics, alignment, diff), using **synthetic pose tracks** built in
code. UI tasks get explicit manual browser checks. No end-to-end browser framework.
**Why:** The analysis logic is where bugs would quietly produce wrong numbers.
Pure functions over arrays are fast to test. A Playwright setup costs more
than it saves in a few-hours build.

**D8. Q:** Target browser?
**A:** Desktop Chrome (latest) on the demo laptop. Other browsers are not tested.
**Why:** A demo runs on one known machine. Chrome has
`requestVideoFrameCallback` and good WebGL/WASM support for MediaPipe.

**D9. Q:** Must it work offline?
**A:** Yes, once set up. `npm run setup` copies the MediaPipe WASM files from
`node_modules` and downloads the model file into `public/` once. No CDN at
runtime.
**Why:** SPEC.md section 9 lists "works offline" as an Option A advantage, and venue Wi-Fi is a
demo risk.

**D10. Q:** Font and RTL?
**A:** One system sans-serif stack for headings and body text:
`"Segoe UI", system-ui, Arial, sans-serif` (all three cover Hebrew). No web
fonts. The layout uses CSS logical properties (`margin-inline-start`, etc.), so
setting `dir="rtl"` flips it. An EN/HE toggle swaps the label dictionary and `dir`.
**Why:** SPEC.md section 10. No web fonts keeps it offline.

## Processing

**D11. Q:** When and how is pose estimation run?
**A:** After upload, in one pass. The video is seeked frame by frame at a fixed
sample rate (default **15 samples/s**) and `detectForVideo` runs on each frame, with
a progress bar. The results are stored as a `PoseTrack`. Playback only looks up the
stored poses; it never runs the model.
**Why:** SPEC.md section 2 ("after upload, not live"). Seeking gives exact,
repeatable timestamps; play-through capture can skip frames. 15/s is
enough for contact timing (about 67 ms resolution) and halves processing time against
30/s. A 60 s clip should take well under a minute.

**D12. Q:** Run the model in a Web Worker?
**A:** No. Main thread, with a progress bar and the UI locked while processing.
**Why:** It is simpler, and the user waits for processing anyway.

**D13. Q:** Coordinate system?
**A:** All stored positions (landmarks, holds) are **normalized video
coordinates** (0–1 of the video's width and height). Distances and speeds are measured in
**body-scale units**: S = the median torso length (shoulder midpoint to hip
midpoint) over the take, in pixels, converted back to normalized units where needed.
**Why:** Normalized coordinates survive canvas resizing and letterboxing. Body-scale
units make the thresholds independent of camera distance (the climber is 15–25% of the frame
in some sample clips).

## Contact detection and metrics

**D14. Q:** Which point represents each limb?
**A:** Hand = mean of wrist, index and pinky landmarks. Foot = mean of heel and
foot-index (toe). A landmark with visibility < 0.5 counts as missing.
Gaps up to 0.3 s are linearly interpolated; longer gaps break segments.
**Why:** The wrist alone sits a palm's length off the hold. In back view the toe is
often hidden, so averaging with the heel is steadier. The values are in `src/config.ts` to tune.

**D15. Q:** What is a "contact"?
**A:** A limb is *still* while its smoothed speed is < 0.5 S/s. Each still run
lasting ≥ 0.3 s is a **still segment**. A segment is assigned to the nearest hold
within 0.6 S of the segment's median position, otherwise `holdId: null`
("no hold": smear or wall). Contacts are counted only inside marked attempts
(the whole video if none are marked).
**Why:** SPEC.md section 4 ("each still segment of a limb = one contact"). The numbers
are first guesses, collected in `config.ts` and tuned on a real clip in plan task 6.

**D16. Q:** Does a foot correction also count as an extra touch?
**A:** No. Still segments of the **same foot on the same hold** are merged into one
**placement** when the movement between them is ≤ 1.5 s long and never leaves the hold
radius. Each extra segment inside a placement is one **correction**. Touch
count = number of placements.
**Why:** Otherwise one jittery foot inflates both metrics at once and the
touch count stops meaning "holds used". Hands get the same merge, so a hand
re-grip on the same hold is not a new touch either (hand re-grips are not shown
as a metric). Confirm with the coach: OPEN_QUESTIONS Q5.

**D17. Q:** Smoothing method?
**A:** A centred moving average over 5 samples (about 0.33 s at 15/s), applied to
limb points before the speed is computed.
**Why:** Processing is offline, so a non-causal filter is fine and simpler than a
One-Euro filter.

**D18. Q:** How are attempts and rests marked?
**A:** Manually. Buttons set "attempt start" and "attempt end" at the current
playhead. One video can hold several attempts. Rests = gaps between
consecutive attempts. The rest timer counts up while the playhead is inside a
rest. If no attempt is marked, the whole video is one attempt.
**Why:** SPEC.md section 4 Tier 1 ("manual trim"). Automatic cutting is a stretch goal and is
out.

## Comparison

**D19. Q:** Which take is the reference?
**A:** Take A (the first upload) is the reference, drawn as the "successful" take in grey.
Take B is the current attempt, drawn in colour. Comparison uses the
**first marked attempt** of each take.
**Why:** It matches the demo script (SPEC.md section 11): upload A, then B. A "swap
reference" control would be a new feature, so it is left out.

**D20. Q:** Does take B need its holds re-marked?
**A:** No. B copies A's holds when it loads (same tripod and route). The user can
re-mark with the same hold-marking mode if the frame shifted.
**Why:** SPEC.md section 5 assumes the same camera position.

**D21. Q:** Time alignment method?
**A:** Event alignment. For each hold touched in both takes, the anchor pair is (first-touch
time in A, first-touch time in B), plus the attempt start and end pairs. Pairs are sorted by B time,
and any pair that breaks monotonicity in A is dropped (longest increasing
subsequence). B time maps to A time by piecewise-linear interpolation. With no
shared holds, the alignment falls back to a linear start-to-end stretch.
**Why:** SPEC.md section 5. DTW is the spec's alternative and is not built.

**D22. Q:** What does the comparison overlay show?
**A:** While B plays: B's pelvis trail so far (colour), A's full pelvis path
(grey), and a grey dot at A's pelvis position at the aligned time. Pelvis =
midpoint of the hips.
**Why:** SPEC.md section 5. The same camera means the normalized coordinates line up
directly; homography is out of scope.

**D23. Q:** Which metrics go in the difference table?
**A:** Every **checked** scalar metric: touches per limb and in total, foot corrections
(left, right, total), attempt duration. Rest time is per video, so it is
shown but not differenced. Shown as "A → B (Δ)".
**Why:** SPEC.md section 5 ("each checked metric as a difference").

## UI

**D24. Q:** Layout?
**A:** Header with take switcher (A / B) and the "Add second take" button; video
with the overlay canvas in the centre; checklist on the inline-end side; timeline under
the video; metrics panel and contact-sequence list below.
**Why:** SPEC.md section 10.

**D25. Q:** How does the checklist work?
**A:** One registry of layers. Each layer has an id, labels (en/he), a tier, an optional
`draw()` for the overlay, and an optional metrics section. The checklist is generated
from the registry. Toggling a layer shows or hides both its overlay and its metrics rows.
Only layers that are already built appear.
**Why:** Adding a Tier 2 item = adding one registry entry and its files.

## Process

**D26. Q:** Builder check on the design: subagent or self?
**A:** Done by Claude itself, reading the design as a builder would.
**Why:** The session's guidance is not to spawn agents unless asked, and the skill
allows a self-review in that case.

**D27. Q:** Commit the planning docs?
**A:** Not committed. The files are written to the working tree only.
**Why:** The rule is to commit only when the user asks, and `main` has no
commits yet. Tal can review and make the first commit.

**D28. Q:** A debug export of `poses.json`. Is it a feature?
**A:** It is a dev-only helper, shown only with `?debug` in the URL. It downloads the
`PoseTrack` of the current take so real clips can become test fixtures and
thresholds can be tuned offline.
**Why:** It is needed for testing on real footage (SPEC.md section 12, "needed for testing from the
start"). It is not a user feature and stays hidden.

**D29. Q:** Plan format: the writing-plans skill's default (full code in every step) or Tal's format?
**A:** Tal's format: per task, the files, what "done" looks like, how to check it, and an estimate. It also
includes the skill's useful parts (TDD order for analysis tasks, exact
commands, function signatures). Full code is not written out.
**Why:** Tal's instructions override skill defaults, and full code for about 25 tasks would bury
the plan.

**D30. Q:** Which branch does the build happen on?
**A:** The planning docs are the first commit on `main`. The build happens on a branch named `mvp`.
**Why:** Keeps `main` as the reviewed baseline. It is easy to collapse if Tal prefers working on `main`.

**D31. Q:** Translate the limb codes (LH/RH/LF/RF) in Hebrew mode?
**A:** No. The codes stay in Latin letters in both languages. Only the surrounding labels are translated.
**Why:** SPEC.md section 3 uses these codes as the notation, and short Latin codes inside
`<bdi>` avoid mixed-direction confusion in the contact list.

## Tier 2 architecture (added 2026-11-26, after Tal asked for the architecture to cover both tiers)

**D32. Q:** How do layers put marks on the timeline (needed for drop events)?
**A:** `LayerDef` gets an optional `timelineMarks(state) → TimelineMark[]`. The timeline
draws attempt and rest bands itself and collects marks from enabled layers. The Tier 1 contact
and correction ticks use the same hook (PLAN task 10).
**Why:** Without it, a layer could only draw on the video, and drop markers would be hard-wired
into the timeline. With it, every checklist item stays a self-contained addition.

**D33. Q:** Which Tier 2 metrics appear in the A-vs-B difference table?
**A:** Drops (total), jumps (count, first take-off speed) and weight shift as an
**off-balance %** (share of time standing on a foot with the pelvis outside `WEIGHT_TOL`).
Heatmap and angles are visual only.
**Why:** SPEC.md section 5 says "each checked metric as a difference", so each checked layer
needs one number. Off-balance % is the one number not named in SPEC.md, and it is
the simplest summary of the weight-shift line. If the coach doesn't want it, it is safe to drop.

**D34. Q:** What exactly is a "drop"?
**A:** A contact that ends in a fast **downward** movement: within 0.3 s after it ends,
the unsmoothed speed is > 3 body-lengths/s and the movement points mostly down.
**Why:** A contact is a still period by definition, so "a limb in contact that suddenly moves
fast" can only be seen as the way the contact *ends*. Normal moves go up or sideways, and slips
go down, so direction separates them better than speed alone. Unsmoothed speed keeps the spike
sharp.

**D35. Q:** Does the foot heatmap build up as the video plays, or show the whole take?
**A:** The whole take (all attempts), as a static watermark.
**Why:** SPEC.md calls it a watermark of where feet stood. A static map is simpler and is
computed once per analysis.
