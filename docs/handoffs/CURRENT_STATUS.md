# Natural Selection Current Status

Last verified locally and on preview: 2026-07-22

## Current candidate

- Branch: `codex/s1-completion-recovery`, tracking
  `origin/codex/s1-completion-recovery`.
- Tested runtime source: `23ba90e` (`feat: add facilitator pilot diagnostics`).
  The branch was pushed before the preview was created.
- Current QA-enabled Vercel **preview**:
  `https://biology-natural-selection-qnpoevh8w-keyur159263-5904s-projects.vercel.app`
  - Deployment: `dpl_8mSKKrjfY23der7tUKfKW1Hvm5RK`, Ready.
  - Created 2026-07-22 15:27 CDT from `23ba90e` with
    `VITE_INTERACTION_QA=1`.
  - This is the sole candidate for Gate 1 and Gate 2. Do not use earlier
    previews for device or pilot work.
- Production was not deployed or changed.
- `.playwright-cli/`, `output/`, and browser-test artifacts are ignored; do not
  stage them. `AGENTS.md` and `KEYUR_WORKFLOW.md` remain unchanged.

## What changed at this checkpoint

- Added a closed, in-flow **Facilitator diagnostics** panel. It appears only in
  a QA-enabled build with `?qa=1`, below the live field, and never covers prey.
  Students use the plain preview URL.
- The panel reports resettable in-memory aggregate catches, misses, protected
  attempts, callback-latency samples, and current renderer lifecycle/frame
  facts. Reset changes only those facilitator counters.
- It does not save, send, or render student identity, predictions, answers, CER
  text, raw organism IDs, traits, or coordinates.
- The renderer now emits a bounded numeric callback-latency event for accepted,
  miss, and protected interactions. This measures Phaser input handling to
  feedback creation, not physical touch-to-photon latency.
- Rewrote `INTERACTION_PILOT.md` with exact Gate 1 measurements, Gate 2 A-H
  assignment, neutral help language, privacy controls, exit-prompt coding, and
  evidence-driven tuning rules. Biology, gameplay, scoring, timing, hit areas,
  persistence, and result schema are unchanged.

## Verified evidence

### Local

- `npm run check`: passed.
  - Vitest: **105/105** tests passed.
  - Production build passed.
  - Base JavaScript: **89.27 KB gzip**; lazy Phaser: **366.30 KB gzip**.
  - The three existing non-failing `HabitatGame.tsx` hook-dependency warnings
    remain; this checkpoint added no new lint warnings.
- Focused Chromium direct-touch browser test passed:
  `facilitator diagnostics are opt-in and reset without changing play`.
  It verified no panel on the ordinary test route; the opt-in panel, real touch
  capture, blank-canvas miss, live one-controller/one-canvas data, and reset
  without changing game HUD counts.
- Prior broad game, WebKit, fallback, and challenge-baseline evidence remains
  valid because the classroom mechanics did not change. It is not a substitute
  for physical iPad/Safari or student-pilot evidence.

### Preview

- `vercel inspect` reports the exact preview Ready.
- Plain preview Mission route rendered with no facilitator panel or visible QA
  control.
- On the facilitator URL only, a normal Predator path reached Reef Generation
  1 and exposed the panel. During live play it reported: running state, one
  controller/canvas, 40 actors, 60.0 average FPS, 16.7 ms frame p95, zero long
  frames, zero duplicate ends, and no pause reason in this desktop browser.
  These are desktop diagnostics, not physical-iPad claims.
- QA-preview browser console: **0 errors / 0 warnings**. Its request list had
  no non-static requests. No network submission was introduced.
- Ignored local screenshots from this exact preview:
  - `.playwright-cli/page-2026-07-22T20-32-40-530Z.png` (open facilitator
    panel, ready state)
  - `.playwright-cli/page-2026-07-22T20-34-06-743Z.png` (live reef field)

## Locked boundaries

- Preserve population totals, selection weights, inherited traits, hit areas,
  organism size, 25/40-second timing, scoring separation, result schema,
  local-only storage, and the absence of names, periods, accounts, analytics,
  cookies, or network submissions.
- Do not make speculative visual-challenge, speed, topology, biology, or
  scoring changes before real Gate 1 and Gate 2 evidence.
- Do not deploy to production without Keyur's separate explicit approval after
  the relevant gates pass.

## Remaining work before completion

1. **Gate 1 - target iPad/Safari/school Wi-Fi.** Use the current preview and
   complete the three sessions, VoiceOver check, and Observation check in
   `docs/handoffs/INTERACTION_PILOT.md`. A touch, timer, rotation, pause,
   crash, slowdown, clipping, or accessibility failure blocks the student
   pilot.
2. **Gate 2 - anonymous eight-student pilot.** Use A-H only: six Standard,
   two Extended, and one separate Observation replay. Record only the
   prescribed anonymous measurements and outcome codes.
3. **Gate 3 - one bounded evidence-driven correction, only if needed.** Create
   `codex/pilot-tuning` from `23ba90e`; correct one category only, then rerun
   affected local checks, preview verification, and necessary external gates.
4. **Production gate.** Keyur must separately approve promotion after reviewing
   completed gate evidence.

## Safe resume actions

1. Confirm `git status --short --branch` is clean and the branch points to the
   current documentation checkpoint; keep the tested runtime SHA `23ba90e`
   recorded as the preview source.
2. On the target iPad and school Wi-Fi, open the plain preview URL for students
   and append `?qa=1` only on the facilitator device.
3. Press **Reset facilitator counters** before each Gate 1 session, then follow
   the exact measurement definitions in `INTERACTION_PILOT.md`.
4. Stop before Gate 2 if Gate 1 has a blocker. Do not modify the game between
   primary pilot sessions.
5. Ask Keyur before any production deployment.
