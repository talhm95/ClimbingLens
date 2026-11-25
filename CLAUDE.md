# ClimbingLens

A browser-only demo for analysing climbing videos. Upload a back-view tripod clip and click
the holds to number them. Then see a stick figure, which limb touched which hold, foot
corrections, and attempt and rest time, toggled from a checklist. Compare two takes of
the same route, aligned by hold. Built for a hackathon (Israel Climbing Federation challenge).

## Source of truth
- `SPEC.md`: what to build. **Stay in scope of SPEC.md.** Build only SPEC.md section 4
  items, Tier 1 before Tier 2. Nothing from SPEC.md section 7. Do not add features; if
  something seems missing, add it to `OPEN_QUESTIONS.md` instead of building it.
- `ARCHITECTURE.md`: components, data flow, types, where each metric is computed.
- `PLAN.md`: ordered tasks with done and check criteria. Work through it in order.
- `DECISIONS.md`: decisions already made (D#). Do not reopen them silently.
- `OPEN_QUESTIONS.md`: questions waiting on Tal (Q#).

## Stack
Vite + vanilla TypeScript, `@mediapipe/tasks-vision` (PoseLandmarker), Vitest.
No backend, no API keys, no runtime network calls. Target: desktop Chrome.

## Run and test
```
npm install
npm run setup       # once: copies MediaPipe wasm and downloads models into public/
npm run dev         # open the printed URL in Chrome
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build && npx vite preview
```
Sample clips go in `samples/` (git-ignored). Add `?debug` to the URL for the pose JSON export.

## Code conventions
- `src/analysis/` is pure: it imports only `src/types.ts` and `src/config.ts`. No DOM,
  no MediaPipe. Every function there has a Vitest test, written first.
- Every threshold and constant lives in `src/config.ts`.
- Positions are normalized (0–1 of the video). Distances are in pixels and divided by the
  body scale `S`. Time is in seconds (media time).
- New checklist item = a new entry in `src/overlay/layers/registry.ts` plus its layer file.
- Small focused files. Type names come from `src/types.ts` and are never redefined.
- Commit after each PLAN.md task, on the `mvp` branch.

## UI rules
- Sans-serif for headings and body: `"Segoe UI", system-ui, Arial, sans-serif`.
  No web fonts.
- RTL-friendly: all visible text goes through `tr(key)` in `src/ui/i18n.ts` (en + he).
  CSS uses logical properties only (`margin-inline-start`, never `margin-left`).
  Wrap times and numbers in `<bdi>`.
- Limb codes stay LH / RH / LF / RF in both languages.
