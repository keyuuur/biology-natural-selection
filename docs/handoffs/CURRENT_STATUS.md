# Natural Selection Current Status

Last verified locally and on preview: 2026-07-22 (CDT)
Handoff refreshed: 2026-07-23 (CDT); no runtime, test, preview, or deployment
state changed after the documentation-only `bde1c94` checkpoint.

## Current candidate

- Branch: `codex/s1-completion-recovery`, tracking
  `origin/codex/s1-completion-recovery`.
- Tested runtime source: `9138e08` (`fix: harden facilitator pilot readiness`).
  The branch was pushed before the preview was created.
- Current QA-enabled Vercel **preview**:
  `https://biology-natural-selection-iopexnh7l-keyur159263-5904s-projects.vercel.app`
  - Deployment: `dpl_63ygWCZUfyanXbH3ai6dhLg3ixUF`, Ready.
  - Created 2026-07-22 16:16 CDT from `9138e08` with
    `VITE_INTERACTION_QA=1` only. It did **not** use
    `VITE_E2E_CONTROLS=1`.
  - This is the sole candidate for Gate 1 and Gate 2. Do not use earlier
    previews for device or pilot work.
- Production was not deployed or changed.
- `.playwright-cli/`, `output/`, and browser-test artifacts are ignored; do not
  stage them. `AGENTS.md` and `KEYUR_WORKFLOW.md` remain unchanged.

## Current pause

- Keyur explicitly requested that work stop once a real target-iPad,
  Safari, and school-Wi-Fi test is required. No physical-device or student
  pilot evidence has been collected.
- The source candidate is intentionally frozen. Do not substitute desktop,
  simulated WebKit, or automated browser evidence for Gate 1 or Gate 2.
- The next authorized product work is the Gate 1 procedure below; only after
  it passes may the anonymous A-H pilot begin.

## What changed at this checkpoint

- **Preview safety:** `VITE_INTERACTION_QA=1` now permits only the visible,
  query-gated aggregate facilitator panel. It ignores every `?e2e=1` timer,
  seed, renderer, and storage override, and it does not publish the raw
  `window.__NS_INTERACTION_QA__` bridge. Raw actor diagnostics remain local or
  explicitly non-public E2E-only.
- **Facilitator measurement:** **Reset facilitator session data** now resets
  aggregate outcomes, latency samples, frame samples, and duplicate-end count
  together without changing the population, live timer, HUD, actors,
  assessment, draft, or result.
- **Shared-device privacy:** beginning a new study, choosing Start over in
  draft recovery, and replaying after Results clears both the draft and prior
  local result, including a previous student's saved free-text CER.
- **Draft recovery accessibility:** the recovery dialog initially focuses
  Resume, makes the background inert/hidden from assistive technology, wraps
  Tab within its choices, and returns focus to the active stage heading after
  Resume or Start over.
- **Pilot instrument completeness:** the facilitator protocol now specifies an
  exact VoiceOver Observation smoke path and separately records whether a
  student understands that misses and predator points do not determine science
  completion. It retains only the prescribed anonymous outcome codes.
- Added Chromium/WebKit checks for the facilitator panel, focused draft
  recovery, shared-device result clearing, portrait/landscape panel placement,
  and resettable renderer samples. Biology, gameplay, scoring, timing, hit
  areas, persistence schema, and assessment requirements are unchanged.

## Verified evidence

### Local

- `npm run check`: passed.
  - Vitest: **106/106** tests passed across 15 files.
  - Production build passed.
  - Base JavaScript: **89.76 KB gzip**; lazy Phaser: **366.32 KB gzip**.
  - The same three pre-existing, non-failing `HabitatGame.tsx`
    hook-dependency warnings remain; this checkpoint added no lint warnings.
- A local production-style build with `VITE_INTERACTION_QA=1` was browser
  checked. The hostile-looking
  `?e2e=1&e2eRoundMs=100&e2eRenderer=fail&e2eStorage=fail` URL stayed a normal
  Mission route; `?qa=1` showed the panel but returned `false` for the raw
  bridge.
- Browser test groups passed:
  - Chromium original science journeys: **3/3** (Standard, Extended
    refresh/resume/correction, and renderer/storage fallback/replay).
  - Chromium direct touch: **8 passed**, **3 intentionally skipped**
    screenshot/soak cases; it covered manual catches, student agency, misses,
    protected parents, rotation, pause/resume, reduced motion, moths, and
    renderer reuse.
  - WebKit iPad profile: **15/15**, including the panel, touch, rotation,
    pause/resume, reduced motion, fallback, draft recovery, shared-device
    clearing, Observation, focus, and portrait document flow.
  - Chromium soak: **2/2** (60-second full-density renderer and three-study
    lifecycle/no-slowdown path).
- The one-shot `npm run test:e2e` command exceeded the five-minute command
  window after 304 seconds. Treat that aggregate command as a timeout, not a
  pass; the required release-relevant groups above were rerun and passed in
  smaller, observable commands.

### Preview

- `vercel inspect` reports deployment `dpl_63ygWCZUfyanXbH3ai6dhLg3ixUF` as
  Ready with target `preview`.
- On the plain/hostile E2E-parameter URL, the preview showed the ordinary
  Mission with no forced graphics/storage fallback and no facilitator control.
- On the facilitator URL only, a normal Predator path reached Reef Generation
  1 and exposed the in-flow panel below the field. It reported one controller,
  one canvas, 40 actors, zero frame samples before play, zero duplicate ends,
  and no pause reason. The raw bridge evaluated to `false`.
- Preview browser console: **0 errors / 0 warnings**. Its request list had
  only 5 static requests; no network submission was introduced.
- Ignored local screenshot from this exact preview:
  `.playwright-cli/page-2026-07-22T21-20-23-815Z.png` (open facilitator
  diagnostics below the ready Reef field).
- A final read-only release audit found no further local code, accessibility,
  privacy, QA, or pilot-readiness blocker. The remaining acceptance evidence
  must come from the physical-iPad and anonymous-student gates below.

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
   `codex/pilot-tuning` from `9138e08`; correct one category only, then rerun
   affected local checks, preview verification, and necessary external gates.
4. **Production gate.** Keyur must separately approve promotion after reviewing
   completed gate evidence.

## Safe resume actions

1. Confirm `git status --short --branch` is clean and the branch points to the
   current documentation checkpoint; keep runtime SHA `9138e08` and preview
   deployment `dpl_63ygWCZUfyanXbH3ai6dhLg3ixUF` paired.
2. On the target iPad and school Wi-Fi, students use the plain preview URL.
   The facilitator alone appends `?qa=1` for technical measurement.
3. Open **Facilitator diagnostics**, press **Reset facilitator session data**,
   then close the panel before each Gate 1 session. Use the exact measurement
   definitions in `INTERACTION_PILOT.md`, including its VoiceOver Observation
   smoke path.
4. Stop before Gate 2 if Gate 1 has a blocker. Do not modify the game between
   primary pilot sessions.
5. Ask Keyur before any production deployment.
