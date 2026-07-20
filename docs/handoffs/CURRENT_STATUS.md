# Natural Selection Current Status

Last updated: 2026-07-20

## Current posture

- Branch: `codex/f2-moderate-motion`
- Verified interface implementation checkpoint: `b60a722af2efc36364e31ced6fa022a36a2c03a9` (`feat: apply field-station interface theme`).
- Before the handoff-doc update, the local branch was one commit ahead of `origin/codex/f2-moderate-motion`; the implementation commit had not yet been pushed.
- Working source was clean before this handoff update. `CODEX_START.md` remains local-only through `.git/info/exclude`.
- Existing interaction-polish preview: `https://biology-natural-selection-890vhwk4u-keyur159263-5904s-projects.vercel.app`.
- That preview is still the older pre-C, pre-F2 build. No F2 preview or deployment was created in this phase.
- Production was not deployed. Production promotion remains blocked pending the physical-iPad gate, student pilot, and Keyur’s separate explicit approval.

## F2 interface/readability completed

- The global interface now uses the approved dark field-station shell with a connected eight-step cyan trail, gold action accents, stronger focus treatment, and the existing privacy footer.
- Mission, prediction, generation review, habitat summary, evidence, checks, CER, graphs, tables, results, draft recovery, and observation fallback use warm ivory reading surfaces with dark ink text.
- Gameplay remains a dark field-lab frame around the approved C reef and moth renderers. The canvas, organism visuals, motion, hit geometry, HUD meaning, timing, scoring, and biology were not changed.
- Evidence choices now have explicit selected outlines and checkmarks. Disabled controls use a readable gray state instead of opacity alone. Correct and retry feedback remain semantically and visually distinct.
- Portrait and landscape layouts retain the existing one-column/two-column behavior, contained graph/table scrolling, sticky actions, and 56-pixel primary controls.
- Screenshot helpers now remove focus and temporarily hide the fixed skip link during full-page capture so stitched QA images do not show a false navigation artifact.
- The WebKit resolving-state test begins observing before the final tap so it cannot miss the specified 700-millisecond transition while still requiring the actual message.

## Verification evidence

- `npm run lint`: passed after the final source and test changes.
- `npm test`: 59/59 tests passed across nine files.
- `npm run build`: passed. Initial JavaScript is 84.00 KB gzip; the lazy Phaser chunk remains 366.03 KB gzip.
- Final normal Playwright suite: 12 passed and 3 intentional opt-in paths skipped in 5.2 minutes.
- Chromium coverage passed direct touch, deliberate camouflage targeting, Extended hit areas and rotation, pause/resume, reduced motion, moth interaction, one-renderer lifecycle, Standard science completion, Extended refresh/recovery/correction, and graphics/storage fallback.
- WebKit iPad-profile coverage passed both the 12-touch manual-completion path and the Extended touch/rotation path.
- The separately enabled landscape resolving screenshot path passed.
- The three-study lifecycle soak passed with one controller/canvas/loop and no progressive slowdown.
- The first 60-second full-density sample, run directly after a long browser workload, measured 24.09 average FPS and failed the 30 FPS threshold. An isolated rerun immediately afterward passed both the 30 FPS minimum and 50-millisecond p95 frame-time ceiling. Treat physical-iPad performance as still unverified rather than erasing the first result.
- Manual browser review at `820 x 1180` and `1180 x 820` covered unselected and selected evidence, disabled/enabled actions, retry feedback, CER, results, and keyboard skip-link focus.
- At `820 x 1180`, the evidence page had `scrollWidth = 820`, the disabled primary action was 56 CSS pixels high, and all five selections enabled it.
- Current release screenshots are under `test-results/release-screenshots/`. Focused F2 evidence, retry, CER, and results captures are under `test-results/f2-interface-screenshots/`. Both folders are Git-ignored QA artifacts.

## Swarm review synthesis

- Student UX review approved F2 as warm research inserts inside a continuous dark shell, with explicit non-color state cues and portrait-first reading order.
- Frontend engineering review confirmed the safe boundary: global CSS plus the header’s decorative trail only; no reducer, renderer, biology, storage, timing, or schema changes.
- QA review approved reuse of the existing science and touch journeys and required direct inspection of evidence selection, correction feedback, CER, results, overflow, focus, and disabled states. Those checks are recorded above.

## Manual gates still open

- Gate 1: three consecutive sessions on the target iPad in Safari using school Wi-Fi, including centered and edge touch accuracy, active rotation, background-tab restoration, reduced motion, replay, cold start, feedback latency, sustained FPS, and progressive-slowdown measurements.
- Gate 2: anonymous 6–8 student pilot using codes A–H, with at least four Standard and two Extended sessions and the approved exit prompts.
- Gate 3: at most one bounded evidence-based tuning pass, followed by the complete release suite and target-iPad smoke verification.
- The exact procedures remain in `docs/handoffs/INTERACTION_PILOT.md`.

## Release decision

- F2 local implementation and automated/browser verification: **PASS**, with physical-device performance still open.
- F2 preview deployment: **NOT CREATED**.
- Physical target-iPad gate: **OPEN**.
- Anonymous student pilot gate: **OPEN**.
- Production promotion: **BLOCKED** until both gates pass and Keyur separately approves production.

## Safe next actions

1. Review the refreshed F2 screenshots, especially mission, live reef gameplay, evidence selection, correction feedback, CER, and results.
2. Push `codex/f2-moderate-motion` only after confirming the final handoff commit and clean worktree.
3. Do not create or promote a deployment merely to replace the open physical-device and classroom gates.
4. When the target iPad and school Wi-Fi are available, run Gate 1 exactly as written in `INTERACTION_PILOT.md`.
5. If Gate 1 passes, run the anonymous student pilot. Make only evidence-backed blocker fixes before requesting production approval.
