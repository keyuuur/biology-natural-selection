# Natural Selection Current Status

Last updated: 2026-07-20

## Current posture

- Branch: `codex/s1-completion-recovery`, created from the frozen F2 checkpoint `b109cb4651620217b9611292b82f7989f355f0f3`.
- Verified remediation code checkpoints:
  - `fc1f0b5` â€” `fix: preserve exact predator accuracy`
  - `538848f` â€” `fix: persist renderer fallback and stabilize field layout`
- This handoff is the final local checkpoint for the S1 remediation. `AGENTS.md`, `KEYUR_WORKFLOW.md`, `PROJECT_CONTEXT.md`, and local-only `CODEX_START.md` were not changed.
- No branch was pushed. No Vercel preview was created or changed. Production was not deployed.
- Existing interaction-polish preview remains the older pre-C, pre-F2 build: `https://biology-natural-selection-890vhwk4u-keyur159263-5904s-projects.vercel.app`.

## S1 remediation completed

### Exact predator accuracy

- `calculatePredatorAccuracyPercent(manualCaptures, misses)` is now the shared, exact calculation for result construction and schema validation.
- Stored results retain fractional values such as `100 / 3`; only Results renders a rounded whole-number display such as `33%`.
- Protected-parent attempts remain excluded. Biology, score rules, result schema version, storage keys, and privacy boundaries are unchanged.
- Strict validation still rejects a rounded or otherwise inconsistent stored aggregate.

### Renderer failure recovery

- Phaser startup now has one lazy-loader boundary and a 10-second readiness watchdog.
- Import rejection, controller-construction failure, runtime renderer error, and never-ready behavior all flow through one study-level fallback latch.
- A failed study completes all six generations through observation mode without retrying the renderer between generations or habitats. Replay unmounts the failed renderer and permits one fresh attempt.
- Construction and disposal are transactional: partial observers, listeners, games, and canvases are cleaned up, diagnostics increment only after successful setup, and disposal remains idempotent.
- A construction-time ready race, late controller attach, duplicate completion, and delayed active-frame reset are covered by component tests.

### Field-layout correction found during verification

- Direct-touch tracing found a CSS height feedback loop that could grow the live canvas to 2,818 pixels, putting coordinate taps outside the viewport.
- The gameplay frame now owns one explicit responsive height and the Phaser host fills it absolutely. Portrait at 820 Ã— 1180 now measured a stable 451-pixel field; the 72 Ã— 48 standard hit areas, movement rules, artwork, timer, scoring, and biology did not change.
- Browser QA now scrolls the active canvas into view before direct coordinate taps and chooses a background miss outside current hit regions with a small movement margin.
- Browser blur and hidden-tab pause reasons now accumulate independently and require the existing Resume action to clear.

## Verification evidence

- Focused unit/component remediation suite: **27 passed**.
- Final `npm run check`: **passed** â€” lint, **73/73** unit/component tests, and production build.
  - Initial JavaScript: **84.43 KB gzip**.
  - Lazy Phaser chunk: **366.16 KB gzip**. The existing Vite large-chunk warning remains informational.
- Focused Chromium S1 browser suite: **3 passed**.
- Focused WebKit iPad-profile renderer-failure journey: **1 passed**.
- Focused direct-touch retests passed for Chromium and WebKit, including 12 manual catches, one miss, deliberate camouflage targeting, protected-parent behavior, Extended hit regions, rotation, and pause/resume.
- Final full `npm run test:e2e`: **16 passed, 3 intentional opt-in paths skipped** in 6.5 minutes. It includes Standard and Extended science journeys, storage/renderer fallback, S1 accuracy/failure journeys, Chromium direct touch, and tagged WebKit iPad-profile touch paths.
- The existing three-study renderer lifecycle soak passed: **1 passed** in 1.0 minute, with one renderer and no progressive slowdown.
- One earlier full-suite wrapper reached 20 minutes without a named Playwright assertion or final reporter output. It was classified as indeterminate. The same command was rerun once with a longer allowance and passed as recorded above.
- Manual screenshot review confirmed the corrected live reef field in portrait and landscape. QA artifacts remain ignored under `test-results/interaction-screenshots/`.

## Deliberately unchanged / still open

- The approved F2 Field Station Inserts interface and the C reef/moth visuals remain the canonical product direction.
- Remaining final-review S2/S3 findings were deliberately not absorbed by this S1 pass.
- Gate 1 physical target-iPad/Safari/school-Wi-Fi verification remains open, including cold start, touch latency, sustained FPS, rotation, background-tab restoration, reduced motion, replay, and three consecutive sessions.
- Gate 2 anonymous 6â€“8 student pilot remains open.
- Gate 3 allows only one evidence-based tuning pass after those gates.
- The earlier mixed local 60-second performance sample does not establish physical-iPad performance; do not claim that gate is passed.

## Safe next actions

1. Review the local commits and the corrected portrait/landscape gameplay captures.
2. If Keyur approves sharing the checkpoint, push `codex/s1-completion-recovery`; do not merge or deploy as part of that action.
3. Keep preview and production deployment blocked until the physical-iPad gate and anonymous pilot are complete, then request Keyurâ€™s separate deployment approval.
4. When the target iPad and school Wi-Fi are available, run Gate 1 exactly as written in `docs/handoffs/INTERACTION_PILOT.md`.
5. If Gate 1 passes, run the anonymous pilot and limit any follow-up work to evidence-backed release blockers.
