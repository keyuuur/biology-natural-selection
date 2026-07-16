# End-to-end test contract

These tests intentionally describe the approved student experience before the
replacement UI lands. They use semantic roles for student-visible actions and
`data-testid` only for dynamic game state that would otherwise be brittle.

## Test-only query contract

The app should honor these parameters only when `e2e=1` and the build is running
locally or under the Playwright test command:

- `e2eRoundMs`: shortens each generation timer without changing production timing.
- `e2eSeed`: supplies the initial deterministic placement/selection seed.
- `e2eRenderer=fail`: forces the DOM observation fallback.
- `e2eStorage=fail`: makes saver calls fail while keeping the study playable.
- `qa=1`: exposes the network-free interaction diagnostics bridge in development
  or a build created with `VITE_INTERACTION_QA=1`.

Production sessions must ignore these controls. Replay must replace the supplied
initial seed with a fresh seed.

## Interaction QA bridge

The direct-touch suite reads `window.__NS_INTERACTION_QA__.snapshot()`. Actor
centers and hit bounds are CSS viewport coordinates so they can be passed to
`page.touchscreen.tap` without reaching through Phaser internals. The snapshot
contains round state, actor targets, renderer lifecycle counts, pause reasons,
feedback latency, frame metrics, and duplicate-completion diagnostics. It is
in-memory only and contains no identity or assessment responses.

Chromium runs the complete suite. The `webkit-ipad` project runs only interaction
tests tagged `@webkit`. The 60-second performance sample and three-study lifecycle
sample are tagged `@soak` and run only when `RUN_INTERACTION_SOAK=1` is set.
The dedicated landscape resolving artifact runs only when
`CAPTURE_INTERACTION_SCREENSHOTS=1` is set.

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

The Playwright output directory, HTML report, and generated screenshots should be
ignored by Git. The twelve selected release screenshots are written under
`test-results/release-screenshots/` and attached to the HTML report.
