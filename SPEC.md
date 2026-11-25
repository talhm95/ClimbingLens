# ClimbingLens — MVP Spec

Video-based performance analysis and feedback for climbers. Hackathon MVP + demo.

Sources for this spec: the challenge brief (Olympic Committee of Israel hackathon, challenge by Simon, Israel Climbing Federation), the team's metrics review doc ("Metrics review — climbing feedback system"), and the team's discussions of the demo UI.

## 1. Background

- **Problem:** coaches analyse every climber's attempt by hand, usually after training. Feedback is slow, imprecise and trial-and-error.
- **Success (per the brief):** feedback on a route that can be used to improve **between one attempt and the next**.
- **Data that already exists:** training/competition videos, Excel training logs.
- **Mentor input that shapes the design:** sensors may disturb the climber; climbers plan the route in advance and rarely change mid-climb; competition rules forbid shouting/comments; gloves are uncomfortable and not allowed in competition. So: **camera-only, feedback between attempts, no wearable sensors in the MVP.**

## 2. MVP goal

A simple web demo:

1. The user uploads a climbing video.
2. A side **checklist** turns analysis layers and metrics on/off.
3. The video plays with the selected overlays; a metrics panel shows the numbers.
4. The user uploads a **second take of the same route** and compares the checked metrics.

Processing happens **after upload**, not live. Define "real time" in the pitch as: analysis ready within minutes of the attempt, before the next one. Confirm with Simon.

## 3. Holds: numbering and markers

Like the output videos of the reference repo (section 8):

- Every hold on the route gets a **number** (1, 2, 3, ...), drawn on the video.
- Each **hand/foot contact** is marked: which limb (LH / RH / LF / RF) and which hold number it landed on, plus the time.
- A **contact sequence** list is shown: "00:03 RH → hold 2, 00:05 LF → hold 4, ..."
- Contacts per limb are counted from this.

**How holds get their numbers (decide with the team):**
- **MVP default — manual marking:** on the first frame the user clicks each hold; they are numbered in click order. Each landing is assigned to the nearest hold. Needs no extra model.
- **Optional — automatic:** take hold positions from the reference repo's output (its `rock_climbing` pipeline detects holds by colour). Needs its paid API and a route with holds of one clear colour. Not verified on our videos.

**Deferred: landing accuracy in centimetres.** The metrics doc lists "landing accuracy on the hold, in cm", but it is not clear how the mentors define centimetre-level accuracy, and pose points (wrist / ankle) are not precise to a few centimetres. To be clarified with Simon. In the MVP we only show *which hold* a limb landed on, not a distance.

## 4. MVP metrics (checklist items)

Tier 1 = build for the demo. Tier 2 = build if time allows. The tiering is a suggestion, to be agreed with the team.

| Tier | Metric | What the user sees | How |
|------|--------|--------------------|-----|
| 1 | **Stick figure** | Skeleton over the climber | Pose estimation keypoints per frame |
| 1 | **Hold numbers + limb contact markers** | Section 3 | Manual hold marking + contact detection |
| 1 | **Touch count** | Contacts per limb and total | Each "still" segment of a limb = one contact |
| 1 | **Foot corrections after placement** | Blinking dot on the foot + number of corrections. From the metrics doc, main slab metric, **complexity 4/5** because the foot is small and often hidden in back-view video | Foot placed on a hold, then moves again while still on that hold |
| 1 | **Attempt duration and rest time** | Timeline of attempts and rests, rest timer | Manual trim of attempt start/end for the demo; automatic cutting is a stretch |
| 1 | **Comparison overlay (two takes)** | Section 5 | Section 5 |
| 2 | **Foot-contact heatmap** | Watermark spots where feet stood; stronger with more visits / longer time | Accumulate still-foot frames into a heatmap |
| 2 | **Weight shift over the supporting foot** | Vertical line from the pelvis, turns red when it leaves the area above the supporting foot. Metrics doc: simplest of the five (complexity 2/5) | Horizontal offset of the pelvis from the supporting foot, in 2D |
| 2 | **Joint angles** | Angles on the stick figure (elbows first) | 3 keypoints; this is a 2D projected angle, not the true anatomical angle |
| 2 | **Jump performance** | Arrow from the pelvis scaled to speed, next to a grey arrow of the successful take, plus landing order | Pelvis velocity and direction at take-off, first limb to land. Needs good pose tracking during fast motion |
| 2 | **Hand/foot drop events** | Markers on the timeline | A limb in contact that suddenly moves fast; expect false positives |

## 5. Comparison mode (overlay)

- Upload a second take of the same route (same camera position).
- The overlay (from the metrics doc): **pelvis trajectory** of the current attempt over the trajectory of the successful attempt, **after time alignment**.
- **Time alignment by events:** with numbered holds, align the takes at the moment each hold is first touched, so "move 4" of take B lines up with "move 4" of take A even if the pace differed. (DTW on the pelvis path is the alternative.)
- Below it, a small table: each checked metric as a difference from the other take ("foot corrections: 6 → 2", "time: -6 s").
- Camera moved between takes: align to fixed points on the wall (homography). Not for the MVP; film from a tripod instead.

## 6. Recording assumptions

- Camera on a tripod, same position for both takes.
- Climber large enough in the frame.
- Back view is expected; the pose model may confuse left and right. Check early.
- Notes from the team's sample videos (from the project notes, not re-verified by me): some are hand-held with changing zoom, people walk through the frame, the climber is only 15–25% of the frame height, a lot of dead time between attempts. This is why section 4 uses manual trimming in the demo.
- Pre-record two good takes for the live demo.

## 7. Out of scope for MVP (show in the pitch as roadmap)

- **Hip distance from the wall** and **jump arc in space**: top mentor requests, but need depth (a side camera or LiDAR). Not measurable from back-view videos. If the mentors provide side-view videos, hip distance becomes a simple metric and moves up.
- **Learning rate** (how many attempts from the coach's comment to the metric improving): needs training videos with the coach's comments logged.
- **Landing accuracy in cm** (section 3).
- Heart rate (a smartwatch is enough, training only), body-worn sensors (NIRS, shoe motion sensor): not recommended now.
- Any 3D measurement.
- Written coaching feedback from a vision-language model.
- Comparison to another climber with a similar body type.

## 8. Reference repo

**[jeremyipark/vision-demos](https://github.com/jeremyipark/vision-demos)**, Apache-2.0, folder **`rock_climbing`** (2D).

- Detects route holds by colour (SAM 3.1, a prompt like "green climbing hold"), numbers them, tracks the skeleton with ViTPose+ (keypoints saved to `poses.json`), computes which hold each limb used, in what order, for how long, and total climb time.
- Compares several attempts of the same route aligned to the same hold numbers.
- Output: annotated video plus JSON/CSV.

Gaps for us: not real time (minutes per video); needs the paid VLM Run API (100 credits = $1; a free account gives about $1 of credit per a third-party source; cost per video unknown, the code prints the cost of each run); no biomechanical metrics (angles, pelvis offset, jump speed), which we compute from `poses.json`. The 3D folder needs a depth recording from a private iPhone app and is not runnable.

Seen only by description, not opened: VLM-CLIMBR (VLM-written feedback on top of `vision-demos`), RockClimbingAssist (real-time voice coach), ClimbingCoM (3D pose and centre of mass).

Before building on any of them: keep the licence notice and credit the source; check that the hackathon rules allow open-source reuse; state clearly in the pitch what was reused and what we built.

## 9. Technical approach — decision to make first

**Option A — Browser only (MediaPipe Pose or similar).** No server, no API cost, works offline. We write contact detection, numbering, heatmap, metrics and comparison ourselves. Hold numbers come from manual marking. First check: the pose library runs in the target browser on a real back-view tripod clip.

**Option B — Build on `rock_climbing` (Python) with our own UI.** Hold detection, numbering and attempt comparison exist. Paid API, minutes per video, a backend, internet needed at the demo.

**Middle path (suggested):** Option A for the live demo. Show `rock_climbing` output on a pre-processed video as "what automatic hold detection adds".

## 10. UI notes

- Layout: video in the centre, checklist on the side, metrics panel below, "Add second take" button.
- Timeline under the video with contact and drop markers.
- Font: **sans-serif for headings and body text**.
- RTL-friendly Hebrew labels as an option.

## 11. Demo script (draft)

1. Upload take A, click the holds to number them.
2. Stick figure on; contact markers show which limb landed on which hold.
3. Foot corrections and touch counts; heatmap and angles if built.
4. Upload take B, overlay of pelvis paths aligned by hold, table of differences.
5. Roadmap slide: depth metrics, learning rate, heart rate, written AI feedback.

## 12. Open questions

- Manual or automatic hold numbering (section 3).
- What centimetre-level accuracy means for the mentors (ask Simon).
- Option A vs B (section 9).
- Does "feedback within minutes, before the next attempt" satisfy "real time"?
- Hackathon rules on reusing open source.
- Tripod footage of real climbs: film a short clip now, needed for testing from the start.
- Tiering in section 4: which Tier 2 items are worth the time?
