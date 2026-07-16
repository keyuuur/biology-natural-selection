# Natural Selection: Predator & Camouflage

An iPad-first, 10–15 minute Biology 1 game for ninth-grade students. Students act as predators in reef-fish and bark-moth habitats, then use their own population data to explain natural selection.

## Learning target

Students use evidence to explain this causal chain:

`pre-existing inherited variation → environment-dependent predation → unequal survival and reproduction → inherited offspring traits → change in population percentages`

The activity directly corrects the idea that individuals intentionally change inherited traits because they need to adapt.

## Run locally

Requirements: Node.js 24+ and npm 11+.

```text
npm install
npm run dev
```

No account, API key, database, Google Sheet, or downloaded asset pack is required.

## Verification

```text
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite covers three complete journeys: Standard mode, Extended mode with refresh/resume and correction, and the graphics/storage fallback. Release screenshots are written to `test-results/release-screenshots/`.

## Classroom model

- Each habitat starts with 20 camouflaged and 20 conspicuous organisms.
- Each of three generations resolves exactly 12 predation events and leaves 28 survivors.
- Manual taps are accepted only while at least three parents of each inherited morph remain.
- If the student catches fewer than 12 organisms, seeded weighted selection completes the round without replacement.
- Survivors reproduce in proportion to their counts and refill the population to 40.
- There is no mutation, trait switching, genotype simulation, combat, or claim that nature follows one exact sequence.

Standard mode provides 25 seconds per generation. Extended mode provides 40 seconds, slower movement, and larger hit targets while keeping the same biology and learning requirements.

## Architecture

- React owns student flow, assessment, graphs, biology results, accessibility, and persistence.
- Phaser owns procedural 2D habitat drawing, movement, tap detection, and nonviolent feedback only.
- The biology engine is immutable, seeded, and fully testable without rendering.
- Phaser is lazy-loaded after the mission screen and one game instance is retained through the session.
- A DOM observation fallback preserves the complete science pathway if graphics fail.

All artwork is generated procedurally in the project; there are no external runtime art assets.

## Privacy and deployment

Drafts and the last result are versioned in browser local storage. No names, periods, accounts, analytics, cookies, network submissions, or Google Sheets writes are present.

Vercel preview deployment is supported. Production promotion requires Keyur’s explicit approval.

Durable decisions and current release posture live in `docs/handoffs/PROJECT_CONTEXT.md` and `docs/handoffs/CURRENT_STATUS.md`. `CODEX_START.md` remains a machine-local prompt excluded from Git.
