# Open questions for Tal

These could not be decided from SPEC.md. The most important come first. Each one says
what the plan does until you answer, so nothing is blocked.

**Q1. Is there a real tripod back-view clip I can use now?**
Plan task 6 (real-clip check) needs one. Without it, the contact thresholds are
only tested on synthetic data.
*Until answered:* tasks 1–5 and all unit tests go ahead. Task 6 is skipped and
flagged. Drop clips into `samples/` (it is git-ignored, so there is no need to commit videos).

**Q2. In back view, does MediaPipe swap left and right?**
SPEC.md section 6 says "check early". If the swap is *consistent* on your footage, the fix is one
setting (`SWAP_LR` in `config.ts`). If it *flips between frames*, contact
detection per limb needs a fix-up pass (about 30–45 min extra, not in the estimate).
*Until answered:* `SWAP_LR = false`, checked in task 6.

**Q3. Is the climber big enough in the frame for the pose model?**
Some sample clips have the climber at 15–25% of the frame height. MediaPipe can lose
small people. Options if it fails: (a) the `heavy` model (slower, one-line change),
(b) re-film closer for the demo, (c) a manual crop box before processing (a new
feature, not planned).
*Until answered:* `full` model, with `heavy` as a config fallback. Crop box not built.

**Q4. Which tablet or laptop runs the demo, and is it Chrome?**
Everything is planned and tested for desktop Chrome. iPhone `.mov` (HEVC) files may not
play in Chrome on Windows; convert them with
`ffmpeg -i in.mov -c:v libx264 -crf 20 out.mp4`.
*Until answered:* desktop Chrome, MP4/H.264 input.

**Q5. Should a foot correction count as an extra touch? (needs the coach)**
SPEC.md says "each still segment = one contact", and corrections are "the foot moves again
while still on that hold". I count them separately: touches = placements,
corrections = re-settles inside a placement (DECISIONS D16). If Simon wants every
still segment as a touch, it is a one-line change in `metrics.ts`.

**Q6. Threshold values.**
Still speed 0.5 body-lengths/s, minimum still 0.3 s, hold radius 0.6 body-lengths,
correction gap 1.5 s. These are guesses. Task 6 tunes them on a real clip if one exists.
Do you or the coach have intuition for how long a "real" placement lasts?

**Q7. Hebrew label wording.**
The plan ships Hebrew labels for the checklist and panels (task 18) as first-draft
translations. Climbing terms in Hebrew (for example "תיקוני רגל" for foot corrections) should be
checked by a Hebrew-speaking climber.

**Q8. Which Tier 2 items, in what order?** (SPEC.md section 12)
The plan orders them by cost: heatmap → weight shift → joint angles →
drop events → jump performance. Reorder if the coach cares more about a specific one
(the metrics doc calls weight shift the simplest and most requested).

**Q9. Should take A always be the reference?**
Comparison treats the first upload as the "successful" reference (D19). If you want
to pick the reference after seeing both, that is a small swap control. It is a new feature, so it is
not planned.

**Q10. Should the pre-processed `rock_climbing` output be shown in the demo?**
SPEC.md section 9's middle path suggests it as a pitch asset. It is not app code, so it is not in the
plan. It would need someone to run that repo with its paid API before the
demo.

**Q11. Commit the planning docs?**
Nothing is committed (`main` has no commits). Review the docs, then
`git add -A && git commit -m "Planning docs"`.
