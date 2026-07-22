# Natural Selection Current Status

Last verified locally and on preview: 2026-07-22

## Current release candidate

- Branch: `codex/s1-completion-recovery`, tracking `origin/codex/s1-completion-recovery`; current `HEAD` is `2353317a82f07c8200de9e79b73154b44b93733c` (`docs: record verified preview candidate`) and matches the remote.
- Preview runtime source: `e0b10fb460e50685e08f03de5e224994c3691640` (`fix: add field lab favicon`), following `84b9ce1` (`feat: complete inclusive study route and challenge remediation`). The current head is documentation-only and does not alter the preview runtime.
- The source-only feature work is published. `.playwright-cli/` and `output/` are ignored generated browser artifacts; do not stage them. `AGENTS.md` and `KEYUR_WORKFLOW.md` remain unchanged.
- The current approved test candidate is the Vercel **preview**: `https://biology-natural-selection-r14paktmg-keyur159263-5904s-projects.vercel.app`.
  - Deployment: `dpl_59WPaDLKhgXh7VGaes7gtbN9ChP7`, Ready, created 2026-07-22 14:28 CDT.
  - It was manually built from `e0b10fb` with `VITE_INTERACTION_QA=1` so facilitators can opt into memory-only diagnostics with `?qa=1`.
  - Production was not deployed or changed. Do not use earlier Vercel previews for device or pilot testing.

## Completed product work

- The canonical product is the ninth-grade fish-and-moth predator/camouflage study, not the older deer prototype.
- Mission offers a student-selected Predator or no-canvas Observation study. Observation reaches the same predictions, graphs, checks, evidence selection, and CER endpoint, but has no predator score.
- Mission, Evidence, and CER use the sticky in-flow action dock; iPad portrait Evidence uses readable three-then-two checkpoint grouping and avoids nested vertical scrolling.
- Student-facing labels stay habitat-specific: reef `reef-matched pattern` / `high-contrast pattern`; bark `mottled bark pattern` / `solid light pattern`.
- Reef fish use deterministic morph-neutral placement and motion, muted reef-adjacent palettes, shared dark eyes, and pattern/texture rather than a bright trait cue. Biology, 62x30 fish size, 72x48 standard hit areas, 25/40-second timing, scoring, and privacy boundaries remain unchanged.
- The final minor validation repair added an original local SVG favicon; it removes the only observed console 404 and adds no external asset or package.

## Verified local evidence

- `npm run check` passed after the final favicon commit: lint completed with the three existing non-failing `HabitatGame.tsx` hook-dependency warnings; Vitest passed **98/98** tests; and the production build passed.
  - Initial JavaScript: **87.95 KB gzip**.
  - Lazy Phaser chunk: **366.23 KB gzip**. The existing large-chunk advisory is deferred unless device evidence shows classroom impact.
- Prior full local browser evidence remains valid for the unchanged game code: Chromium file-by-file **24 passed, 59 intentionally skipped** (three science journeys, S1 remediation, study routes, release screenshots, and direct interaction); WebKit iPad-profile study routes **7/7** plus real lazy-import fallback **1/1**; earlier full WebKit interaction **11/11**; renderer soak **2/2**.
- The local challenge baseline covers 12 isolated placement seeds at four target viewports: 48 fields / 192 time snapshots, correct 20/20 representation, zero eligible hit-region overlap, desktop minimum 45.87 FPS, and maximum p95 frame time 25 ms. These are construction and desktop diagnostics only, not a claim about student challenge or physical-iPad performance.
- Current local release screenshots are under `test-results/release-screenshots/`. Do not use generated browser folders as commit input.

## Verified preview evidence

- The exact candidate preview and `/favicon.svg` returned HTTP 200. The ordinary preview URL had no console errors, no QA bridge or visible test controls, no canvas before a Predator round begins, and only same-origin static requests.
- Browser local storage contained only `natural-selection:v2:session-draft`; no identity or network submission was observed. Reload showed the expected `Resume your field study?` recovery dialog with no console errors.
- Portrait (`768x1024`) and landscape (`1024x768`) mission layouts rendered without horizontal overflow.
- On `?qa=1` only, a normal Standard Predator path reached a live Reef Generation 1 round. One real touch-style actor catch and one blank-canvas miss produced `Caught 1 of 12`, `Misses 1 - no penalty`, one canvas/controller, zero duplicate round ends, and 2.8 ms sampled input-to-feedback latency. The sampled desktop browser renderer measured 57.9 FPS with 20.01 ms p95 frames; this is not a target-iPad claim.
- The same final preview reached the student-selected Observation Reef Generation 1 start with **zero canvases** and explicit same-endpoint/no-predator-score wording.
- Ignored preview screenshots: `output/playwright/preview-final-mission-portrait.png`, `preview-final-reef-catch-miss-portrait.png`, `preview-final-mission-landscape.png`, and `preview-final-observation.png`.

## Locked boundaries

- Preserve population totals, selection weights, inherited traits, hit areas, organism size, 25/40-second timing, scoring separation, result schema, local-only storage, and the absence of names, periods, accounts, analytics, cookies, or network submissions.
- Do not make speculative visual-challenge, speed, topology, biology, or scoring changes before real Gate 1/2 evidence.
- Do not deploy to production without Keyur's separate explicit approval after all relevant gates pass.

## Remaining gates

1. **Gate 1 - target iPad/Safari/school Wi-Fi:** use the sole candidate preview and complete the three sessions, VoiceOver check, and Observation check in `docs/handoffs/INTERACTION_PILOT.md`. Any touch, timer, rotation, pause, crash, slowdown, clipping, or accessibility failure blocks the student pilot.
2. **Gate 2 - anonymous eight-student pilot:** use codes A-H only (six Standard, two Extended, and one Observation replay). Record only the anonymous metrics and outcome codes in `docs/handoffs/INTERACTION_PILOT.md`.
3. **Gate 3 - one bounded correction if evidence requires it:** create `codex/pilot-tuning` from `e0b10fb`; correct only one category (reliability/accessibility, topology, visual treatment, UX, or science scaffolding), then rerun affected local tests, preview, and necessary external checks.
4. **Production gate:** only Keyur can approve promotion after reviewing the preview and the completed gate evidence.

## Safe resume actions

1. Open `https://biology-natural-selection-r14paktmg-keyur159263-5904s-projects.vercel.app` on the target iPad and school Wi-Fi. Use `?qa=1` only for facilitator diagnostics; do not give that URL to students, who must use the plain URL.
2. Run Gate 1 exactly as written, record only anonymous observations, and stop before Gate 2 if a Gate 1 blocker occurs.
3. Run the anonymous eight-student protocol only after Gate 1 passes. Do not change the game between primary pilot sessions.
4. If evidence triggers a correction, branch from `e0b10fb`, make one bounded change, and update this handoff with exact new test/preview/device evidence.
5. Ask Keyur before any production deployment.
