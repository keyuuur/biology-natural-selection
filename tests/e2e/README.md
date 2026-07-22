# End-to-end test contract

These tests intentionally describe the approved student experience before the
replacement UI lands. They use semantic roles for student-visible actions and
`data-testid` only for dynamic game state that would otherwise be brittle.

## Test-only query contract

The app should honor these parameters only when `e2e=1` and the build is
running locally, under the Playwright test command, or in an explicitly
non-public `VITE_E2E_CONTROLS=1` automation artifact:

- `e2eRoundMs`: shortens each generation timer without changing production timing.
- `e2eSeed`: supplies the initial deterministic session seed.
- `e2ePlacementSeed`: QA-only raw renderer placement seed; requires both
  `e2e=1` and `qa=1` and does not alter biology or movement seeds.
- `e2eRenderer=fail`: forces the DOM observation fallback.
- `e2eStorage=fail`: makes saver calls fail while keeping the study playable.
- `qa=1`: exposes the raw interaction diagnostics bridge only in a local or
  explicit E2E-control build. In a facilitator preview created with
  `VITE_INTERACTION_QA=1`, `?qa=1` instead exposes only the closed aggregate
  facilitator panel; it does not require `e2e=1` and must not activate any
  timer, seed, storage, renderer, or bridge override by itself.

Production and facilitator-preview sessions must ignore E2E controls. Replay
must replace the supplied initial seed with a fresh seed.

## Interaction QA bridge

The direct-touch suite reads `window.__NS_INTERACTION_QA__.snapshot()`. Actor
centers and hit bounds are CSS viewport coordinates so they can be passed to
`page.touchscreen.tap` without reaching through Phaser internals. The snapshot
contains round state, actor targets, renderer lifecycle counts, pause reasons,
feedback latency, frame metrics, and duplicate-completion diagnostics. It is
in-memory only and contains no identity or assessment responses.

The visible `facilitator-qa-panel` is separate from the bridge. It is an
in-flow, closed-by-default facilitator aid below the active field. It shows
only resettable aggregate caught/miss/protected counts, numeric callback-latency
samples, and current renderer counts/performance. Its reset begins a fresh
facilitator measurement window without changing live population, timer, HUD, or
assessment state. It never renders actor IDs, traits, positions, seed values,
predictions, answers, CER text, names, or network data. A QA preview does not
publish the raw bridge at all. Students use the plain preview URL; facilitators
alone use `?qa=1` during Gate 1 and reset session data before each technical
session.

Chromium runs the ordinary browser suite; manual challenge-baseline cases and
opt-in capture/soak cases are skipped unless their environment flag is set. The
`webkit-ipad` project runs every test tagged `@webkit`, including study-route,
touch, rotation, pause/resume, reduced motion, Observation, and renderer-failure
coverage. The
60-second performance sample and three-study lifecycle sample are tagged `@soak`
and run only when `RUN_INTERACTION_SOAK=1` is set.
The dedicated landscape resolving artifact runs only when
`CAPTURE_INTERACTION_SCREENSHOTS=1` is set.

## Challenge-field baseline

`challenge-baseline.spec.ts` is opt-in and writes ignored local evidence under
`test-results/challenge-baseline/`.

- `CAPTURE_CHALLENGE_ISOLATED_BASELINE=1` records the authoritative fresh-page
  0/5/10/20-second diagnostic for each requested raw placement. With no seed
  list it covers `101`–`112` across all four target viewports.
- `CHALLENGE_BASELINE_PLACEMENT_SEEDS=101,102,...` limits that manual run to a
  unique subset of `101` through `112`.
- `CAPTURE_CHALLENGE_REPRESENTATIVE_SCREENSHOTS=1` captures fresh representative
  fields at 0, 5, 10, and 20 seconds. It is intentionally separate from the
  diagnostic timeline because inline canvas screenshots can disrupt Phaser's
  logical clock.

Only files named `fish-*-isolated-seed-*.json` are authoritative all-field
baseline records. Grouped or partial artifacts are exploratory diagnostics.

## Required stable test IDs

- Shell and recovery: `app-shell` with `data-session-seed`, `mission-screen`,
  `primary-action`, `draft-recovery`.
- Prediction and habitat: `prediction-reef_fish`, `prediction-bark_moths`,
  `habitat-title`, `start-generation`, `continue-generation`,
  `generation-summary` with `data-generation`.
- Evidence: `population-graph-reef_fish`, `population-table-reef_fish`,
  `evidence-reef_fish-g0`, `evidence-reef_fish-g3`,
  `evidence-bark_moths-g0`, `evidence-bark_moths-g3`, and
  `evidence-within-generation`.
- Misconceptions: `misconception-1` through `misconception-4`,
  `answer-feedback`, plus the concept-keyed option IDs used in `support.ts`.
- CER/results: `cer-screen`, `cer-claim-population-change`, `cer-reasoning`,
  `results-screen`, `science-completion`, `timing-mode-result`,
  `first-attempt-score`, and `predator-score-unavailable`.
- Fallback: `dom-observation-fallback`.
- Facilitator-only QA: `facilitator-qa-panel`, `qa-reset`,
  `qa-caught-count`, `qa-miss-count`, `qa-protected-count`,
  `qa-latency-count`, `qa-renderer-counts`, `qa-frame-sample-count`, and
  `qa-duplicate-ends`.

The Playwright output directory, HTML report, and generated screenshots should be
ignored by Git. The selected release screenshots are written under
`test-results/release-screenshots/` and attached to the HTML report.
