# Natural Selection Current Status

Last updated: 2026-07-15

## Current posture

- Branch: `codex/camouflage-rebuild`
- Recovery baseline: `3737cb7 chore: preserve deer prototype baseline`
- The deer/Three.js prototype is preserved in that commit and removed from the shipped working tree.
- `AGENTS.md` and `KEYUR_WORKFLOW.md` contain pre-existing user changes and must remain unstaged unless separately requested.
- `CODEX_START.md` remains local-only through `.git/info/exclude`.
- Production deployment remains explicitly approval-gated.

## Completed rebuild

- React + Phaser fish-and-moth predator/camouflage experience is implemented.
- Two independent habitats run three bounded, seeded generations each.
- Standard, Extended, and DOM observation modes reach the same evidence, four-check, CER, and results endpoint.
- One lazy-loaded Phaser game instance persists through the interactive session; React alone calculates biology outcomes.
- Anonymous versioned draft recovery and completed-result storage are implemented with an in-memory continuation path when storage fails.
- The shipped UI contains no student identity, network saver, analytics, leaderboard, or Google Sheets write.
- README and `TECH_STACK.md` describe the canonical Phaser architecture and privacy boundary.

## Verified evidence

- `npm run lint`: passed without warnings.
- `npm test`: 39/39 tests passed across seven files.
- `npm run build`: passed. Initial JavaScript is 82.96 KB gzip; lazy Phaser chunk is 360.57 KB gzip.
- Production HTTP smoke check: local preview returned 200 with the expected page title.
- Browser E2E:
  - Standard journey: passed through both habitats, evidence, four checks, CER, and separated results.
  - Extended journey: passed refresh/resume, portrait/landscape rotation, wrong-first-attempt correction, and one-canvas checks.
  - Renderer/storage failure journey: passed observation fallback, science completion, unavailable predator score, and replay with a new seed.
- Twelve release screenshots were captured in portrait and landscape under `test-results/release-screenshots/` for mission, reef gameplay, reef evidence, moth gameplay, CER, and results.
- Final visual review confirmed the complete 40-organism reef and bark previews, readable percentage tables, no horizontal overflow at the tested iPad sizes, and no browser console warnings or errors.

## Immediate next actions

1. Commit only the intended rebuild files; keep `AGENTS.md` and `KEYUR_WORKFLOW.md` unstaged.
2. Push `codex/camouflage-rebuild` and establish its GitHub upstream.
3. Create a Vercel preview, verify HTTP access and the browser flow, and record the preview URL here.
4. Stop before production promotion and request Keyur's approval.

## Manual gates still open

- Physical target-iPad Safari touch accuracy, rotation, tab restoration, and reduced motion.
- Three consecutive full sessions on the physical iPad without progressive slowdown.
- School-network cold start under five seconds and sustained 30 FPS/tap response measurements.
- A small student pilot for median completion time and conceptual explanation quality.
- Bound Apps Script source/deployed legacy UI remains unavailable; the recovered spreadsheet behavior is the approved legacy reference.
