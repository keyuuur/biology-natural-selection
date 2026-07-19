# Natural Selection Current Status

Last updated: 2026-07-16

## Current posture

- Branch: `codex/f2-moderate-motion`
- HEAD: `3d4a81670d704212ffedad4aabdf0c88a4fc14ef` (`3d4a816 feat: adopt balanced moderate reef motion`).
- This branch was created locally from the verified `9b9bda6` interaction-polish checkpoint. It has not been pushed and has no deployment.
- Before-state comparison preview: `https://biology-natural-selection-d83r3yei6-keyur159263-5904s-projects.vercel.app`
- Interaction-polish preview: `https://biology-natural-selection-890vhwk4u-keyur159263-5904s-projects.vercel.app`
- Preview deployment: `dpl_7LAYPESLE47yM4Swnxbu5a5WmmdN` (`Ready`, preview target).
- That existing preview is the pre-C interaction-polish build. The moderate-motion branch has not been deployed.
- `AGENTS.md` and `KEYUR_WORKFLOW.md` retain pre-existing user changes and remain unstaged.
- `CODEX_START.md` remains local-only through `.git/info/exclude`.
- Production was not deployed. `https://biology-natural-selection.vercel.app` still returns 404.

## Paused checkpoint working tree

- Staged files: none.
- Unstaged user-owned files that must remain untouched unless Keyur separately requests them:
  - `AGENTS.md`
  - `KEYUR_WORKFLOW.md`
- Unstaged task handoff file:
  - `docs/handoffs/CURRENT_STATUS.md` (this checkpoint update)
- No other tracked or untracked project files are pending.
- The four review PNGs are generated, Git-ignored artifacts under `test-results/interaction-screenshots/`.

## Interaction polish completed

- Seeded Fisher-Yates shuffling removes morph-first location grouping while preserving reproducible layouts.
- Movement profiles, direction, rest behavior, patrol regions, and hit geometry are assigned by shuffled slot rather than morph.
- Standard hit regions are exactly 72 x 48 CSS pixels for fish and 64 x 52 for moths; Extended multiplies both dimensions by 1.2.
- Fish turn within bounded patrol cells. Moths use landed/drift cohorts with no more than 20% drifting. Reduced motion keeps moths landed and fish on slow linear paths.
- Immediate input locking prevents double capture. Blank taps create one miss; model-protected organisms cannot inflate attempts; a final-tap/timer race emits one completion.
- Reef Generation 1 includes the approved three-step coaching. The live HUD shows catches toward 12, no-penalty misses, model-protected taps, timer, and progress without points, streaks, accuracy, or morph-specific counts.
- Accepted catches, misses, model protection, and the 700-millisecond resolving state use neutral, nonviolent feedback. Later evidence identifies protection as a classroom-model safeguard rather than an organism behavior.
- Visibility, blur, host, and resize pause reasons are independent. Hidden time is not deducted, return requires Resume, and combined blur/visibility recovery clears correctly.
- Normalized actor positions remap and clamp through the four supported portrait/landscape sizes. Short-landscape play keeps the full habitat and live HUD visible together.
- QA-only diagnostics expose real active controller, canvas, loop, observer, listener, actor, tween, timer, pause, latency, frame, and duplicate-completion measurements. They remain in memory, contain no identity or assessment answers, and require both a QA-enabled build and `?qa=1`.
- The anonymous physical-iPad and student-pilot procedure is in `docs/handoffs/INTERACTION_PILOT.md`.

## Moderate reef challenge completed

- Candidate C is now the normal reef renderer behavior on this branch; the scratch baseline/visual/motion switches, comparison seed, DOM polling, and video harness were not shipped.
- The reef uses seeded staggered placement, low-contrast procedural habitat texture, subdued direction eyes, and pattern/luminance camouflage without changing the 8 x 5 ownership model.
- Standard reef speed is balanced across 26–46 px/s with wider safe patrols. Extended remains exactly 0.75 movement and 1.2 hit geometry; reduced motion remains 0.5 speed with no vertical bobbing.
- Profiles are normalized across both morphs at every permitted 4/36 through 36/4 population ratio, then deterministically shuffled within each morph so movement cannot become a trait cue.
- Same-row traffic uses bounded substeps, trailing holds, deterministic head-on turns, cooldowns, and large-frame safety. Normal gameplay and a dense 1.5-second frame case remain non-overlapping.
- Fish remain 62 x 30 with 72 x 48 Standard hit regions. Moth motion and appearance, timers, scoring, biology, persistence, assessment, fallback, and result schema are unchanged.

## Verified evidence

- `npm run lint`: passed.
- `npm test`: 59/59 tests passed across nine files.
- `npm run build`: passed. Initial JavaScript is 83.92 KB gzip; the lazy Phaser chunk is 366.03 KB gzip.
- Final full Playwright browser suite: 12 passed and 3 opt-in paths skipped in 3.6 minutes. The skipped paths were the 60-second soak, three-study lifecycle soak, and landscape screenshot refresh; all three were run separately and passed.
- 60-second full-density Chromium renderer sample: passed at the required 30 FPS minimum and 50-millisecond p95 frame-time ceiling.
- Three complete accelerated studies in one browser session: passed with one active controller/canvas/loop, stable listeners, no stale tweens, no duplicate completion, and less than 10% FPS degradation.
- Direct touch verification includes manual completion, deliberate camouflage targeting, representation-floor protection, blank miss, rapid repeat, exact Extended hit sizing, inner-edge hit, all four viewport rotations, combined visibility/blur restore, reduced motion, and a live bark-moth capture.
- Four fresh interaction screenshots are stored under `test-results/interaction-screenshots/`: active play and resolving overlay in portrait and landscape.
- The refreshed screenshots now show the approved C reef treatment; the stable screenshot helper overwrites these exact four files during the screenshot checks.
- Preview HTTP verification returned 200 with the expected title. Vercel inspection confirmed `target: preview` and `status: Ready`.
- Real-browser preview verification at 820 x 1180 loaded one canvas, had no horizontal overflow, ran the 25-second generation, produced the expected 40 started / 12 caught / 28 survived / 40 offspring sequence, and logged no console warnings or errors.

## Manual gates still open

- Gate 1: three consecutive target-iPad Safari sessions on school Wi-Fi, including centered and edge touch accuracy, active rotation, tab restoration, reduced motion, replay, cold start, feedback latency, FPS, and progressive-slowdown measurements.
- Gate 2: anonymous 6-8 student pilot using codes A-H, with at least four Standard and two Extended sessions and the approved natural-selection exit prompts.
- Gate 3: one bounded evidence-based tuning pass, followed by rerunning the complete release suite and target-iPad smoke path.
- Bound Apps Script source/deployed legacy UI remains unavailable; the recovered spreadsheet behavior remains the approved legacy reference.

## Release decision

- Moderate-motion branch local automation and browser verification: **PASS**.
- Moderate-motion preview deployment: **NOT CREATED**.
- Existing interaction-polish preview verification: **PASS for the older pre-C build only**.
- Physical target-iPad gate: **OPEN**.
- Anonymous student pilot gate: **OPEN**.
- Production promotion: **BLOCKED pending both open gates and Keyur's separate explicit approval**.

## Safe resume procedure

Run these checks first in a new Codex session:

```powershell
Set-Location -LiteralPath 'C:\Users\Keyur\Desktop\Claude Code YEET\Teacher Coding Projects\Biology Games\Natural Selection LOCAL'
git branch --show-current
git rev-parse HEAD
git status --short
git rev-list --left-right --count origin/codex/interaction-polish...HEAD
```

Expected results:

- Branch: `codex/f2-moderate-motion`
- HEAD: `3d4a81670d704212ffedad4aabdf0c88a4fc14ef`
- No upstream or deployment for this branch yet.
- Unstaged: `AGENTS.md`, `KEYUR_WORKFLOW.md`, and `docs/handoffs/CURRENT_STATUS.md`
- Staged: none

Then:

1. Read `AGENTS.md`, `KEYUR_WORKFLOW.md`, `docs/handoffs/PROJECT_CONTEXT.md`, this file, and `docs/handoffs/INTERACTION_PILOT.md`.
2. Preserve the user-owned `AGENTS.md` and `KEYUR_WORKFLOW.md` edits. If desired, stage and commit only `docs/handoffs/CURRENT_STATUS.md` as a documentation checkpoint, then push `codex/interaction-polish`.
3. Do not change or redeploy the game before Gate 1 unless live verification contradicts this handoff.
4. Run Gate 1 on the target iPad against `https://biology-natural-selection-890vhwk4u-keyur159263-5904s-projects.vercel.app` and record results in `INTERACTION_PILOT.md` or a separate anonymous observation copy.
5. If Gate 1 passes, run the anonymous 6-8 student Gate 2. Do not collect names in the app or QA bridge.
6. Perform at most one bounded tuning pass for evidence-backed blockers. Rerun lint, 47 unit/component tests, build, the 12 required browser journeys, both opt-in soaks, screenshot refresh, and target-iPad smoke verification.
7. Create a new preview only if code changed. Never promote to production without Keyur's separate explicit approval.
