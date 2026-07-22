# Natural Selection Current Status

Last verified locally: 2026-07-22

## Current posture

- Branch: `codex/s1-completion-recovery`; `HEAD` remains `2eae4b8afd64750ca070d43a65c996d985ad9999`.
- The interaction-polish and challenge-remediation work is intentionally **uncommitted and unstaged**: 35 tracked files are modified and 47 entries are untracked. The untracked source/test work includes the Observation route, action dock, renderer diagnostics, label-coverage tests, and browser suites; `.playwright-cli/` and `output/` are generated local directories. Do not stage generated artifacts by default.
- `AGENTS.md` and `KEYUR_WORKFLOW.md` have no current diff and are outside this work.
- No branch was pushed, no preview was created or changed, and production was not deployed.
- The only existing preview remains the older pre-C, pre-F2 build: `https://biology-natural-selection-890vhwk4u-keyur159263-5904s-projects.vercel.app`.

## Completed local work

### Inclusive study route and portrait flow

- Mission now offers a deliberate Predator study or Observation study choice. Observation is an intentional no-canvas route, reaches the same science sequence, and is distinct from graphics-failure fallback.
- Draft schema `2.1` stores the selected route. Legacy `2.0` drafts migrate as Predator studies; completed results remain schema `2.0` and contain no identity or network data.
- Mission, Evidence, and CER use the in-flow sticky `StageActionDock`; Mission opens with an explicit Predator-or-Observation role statement, Evidence has the five required evidence checkpoints, and CER preserves its 40-character reasoning gate and exposes an in-flow submit when the keyboard reduces the visual viewport.
- At iPad portrait widths, Evidence keeps the same ordered five checkpoints in a readable three-then-two layout rather than a cramped five-column strip. It remains one document scroll with no nested vertical scroll surface.
- The live Predator renderer is inside the main landmark, its live heading receives stage focus, and the app has one polite live region. A renderer failure now focuses its native Observation fallback heading because the session stage does not change during that failure. Correct misconception feedback replaces that one message rather than adding another status announcer.
- The first generation now visibly explains the fixed-population teaching model and that a deterministic seed does not claim nature follows one exact sequence. CER wording now accurately says reasoning is saved only on this device and is not automatically graded.

### Habitat label consistency and release evidence

- Every student-visible prediction, generation review, graph, table, Observation round, and renderer fallback now derives its labels from `HABITAT_STUDENT_COPY[habitatId].morphLabels`. Reef fish consistently use `reef-matched pattern` / `high-contrast pattern`; bark moths use `mottled bark pattern` / `solid light pattern`.
- `HabitatLabels.test.tsx` covers both habitats across prediction, generation review, Observation, graph legend/table, and SVG graph description. Renderer fallback coverage verifies the same labels.
- The release gameplay screenshots explicitly run at the actual 25-second Standard duration and assert that they capture live rounds rather than the resolver. The current portrait artifacts show live reef fish and live bark moths with their active HUDs; renderer-field captures use viewport screenshots to avoid interrupting the Phaser clock with a full-page canvas capture. The fallback artifact now uses product-neutral unavailable-graphics wording, and visual recheck confirmed graph/table vocabulary matches its evidence cards.

### Fair visual and motion correction

- Reef fish use deterministic morph-neutral placement, muted reef-adjacent palettes, shared dark eyes, and pattern/texture rather than a bright locator cue. Habitat texture is noninteractive and does not alter hit geometry.
- Fish retain their approved 62×30 visual size, 72×48 tap region, 26–46 CSS-pixel-per-second Standard range, timers, score rules, biology, and reduced-motion contract.
- Every fish in a reef round now shares the same seeded horizontal speed and initial direction. Curve phase/amplitude/period remain slot-only; no movement input is derived from morph.
- Background band artwork was removed, but screenshots still show five broad distribution bands. Do **not** claim row/lane hunting is eliminated until the student pilot measures strategy and time-to-12.

## Verified local evidence

- `npm run check` passed lint, **98/98** unit/component tests, and the production build.
  - Initial JavaScript: **87.95 KB gzip**.
  - Lazy Phaser chunk: **366.23 KB gzip**. The existing large-chunk advisory and three pre-existing `HabitatGame.tsx` hook-dependency warnings remain non-failing and need a separately scoped review.
- Chromium regression: **24 passed, 59 intentionally skipped**, verified file-by-file: Natural Selection journey **3/3**, S1 remediation **3/3**, study routes **7/7**, release screenshots **4/4**, and direct interaction **7/7**. The skipped set is the opt-in/manual challenge baseline, the optional resolving artifact, and the opt-in soak tests. Coverage includes Standard/Extended journeys, Predator and Observation routes, renderer/storage fallback, portrait Evidence/CER, direct touch, protected parents, pause/resume, rotation, reduced motion, moths, renderer lifecycle, focus, and disclosure checks.
  - A single all-files Chromium invocation exceeded this harness's five-minute outer limit because the independent files total longer than that. It produced no test failure; retain the passing file-by-file evidence rather than treating that outer timeout as a product defect.
- WebKit iPad-profile post-remediation checks passed: study routes **7/7** (including portrait docks and forced renderer fallback focus) and real lazy-import renderer fallback **1/1**. The earlier full **11/11** WebKit interaction record remains valid for the untouched touch/rotation/reduced-motion renderer code; it has not been relabeled as a fresh full-suite run.
- Renderer soak: **2/2 passed**: a 60-second full-density sample and three accelerated studies retained one renderer without progressive slowdown.
- Screenshot coverage: **4/4 passed** for the release matrix, now including a real-clock active bark-moth round; the optional landscape resolving-overlay capture also passed **1/1**. The current local-review images are under `test-results/release-screenshots/`; the interaction-only resolving artifacts remain under `test-results/interaction-screenshots/` and use a test-only long timer.
- The authoritative local challenge baseline used a fresh Playwright page for each field: all 12 raw placement seeds (`101`–`112`) at `768×1024`, `1024×768`, `820×1180`, and `1180×820`; 48 fields and 192 snapshots at 0/5/10/20 seconds.
  - Every sampled field had 40 organisms, correct 20/20 morph representation, and **zero eligible hit-region overlap**.
  - Maximum checkpoint overshoot was **1.014 seconds**; the suite now fails a field that lands more than 1.5 seconds late.
  - Local baseline minimum FPS was **45.87** and maximum p95 frame time was **25 ms**. These are desktop-browser diagnostics, not a physical-iPad claim.
  - Portrait `768×1024` has real traffic pressure: 143–221 total solver turns by about 20 seconds, with at most 11 turns for one actor. It did not create overlap or a direct-touch failure. Do not change speed, target size, or biology from this count alone; check whether students see repeated reversals or use row/location during Gate 1/2.
  - Treat only `test-results/challenge-baseline/fish-*-isolated-seed-*.json` as the authoritative all-field record. Earlier grouped/partial artifacts are ignored diagnostics and must not be used for release conclusions.
- Representative fresh-field screenshots were captured at 0/5/10/20 seconds for all four target viewports. The current release matrix also includes Mission, reef play, evidence selection, moth play, CER, Results, student-selected Observation, and renderer-fallback portrait/landscape captures under `test-results/release-screenshots/`.

## Deliberately unchanged

- Population model, inherited traits, predation outcomes, scoring separation, production timers, result schema, privacy boundaries, and local-only persistence.
- No new packages, external artwork, sound, vibration, analytics, storage fields, identities, network submission, deployment, or production work.
- No physical iPad, school Wi-Fi, Safari VoiceOver, or student pilot result has been claimed or simulated.

## Remaining release gates

1. **Gate 0 (only when Keyur authorizes it):** push the verified work and create a Vercel **preview only**, browser-verify it, then use that preview for device testing. This is not production deployment.
2. **Gate 1:** run the target-iPad/Safari/school-Wi-Fi protocol in `docs/handoffs/INTERACTION_PILOT.md`, including cold start, touch accuracy, feedback latency, rotation, hidden-tab Resume, reduced motion, Observation/VoiceOver, and three consecutive sessions.
3. **Gate 2:** run the anonymous 6–8 student pilot. It must measure time-to-12, misses, morph capture mix, stated hunting strategy, Mission/Evidence next-action discovery, CER navigation, Observation completion, and any noticeable repeated fish reversals.
4. **Gate 3:** make at most one evidence-based tuning pass if Gate 1/2 finds a reliability, accessibility, misconception, or actual visual-challenge problem; rerun all affected checks.
5. Production still requires Keyur’s separate explicit approval after preview review and the relevant gates.

## Safe resume actions

1. Review the refreshed Mission, Evidence, live reef, live moth, and fallback images under `test-results/release-screenshots/`; do not make another speculative challenge change without Gate 1/2 evidence.
2. For future local browser verification, run the six E2E files individually rather than one outer five-minute command; their combined runtime exceeds that harness limit even when each file passes.
3. When the target iPad and school Wi-Fi are available, ask Keyur whether to use an approved local-network build or authorize a Vercel preview; do not publish silently.
4. Run Gate 1 exactly as written, then record only anonymous Gate 2 observations.
5. If evidence supports an adjustment, prototype one bounded topology/visual change without changing biology, tap areas, scoring, or timing; otherwise retain the approved C/F2 baseline.
6. Ask Keyur before any production deployment.
