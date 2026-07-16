# Natural Selection Tech Stack

## Product boundary

This repository ships the fish-and-moth predator/camouflage study. The earlier deer/Three.js prototype is preserved at Git commit `3737cb7` but is not part of the runtime.

## Runtime

- Vite + React + TypeScript
- Phaser for the procedural 2D habitat renderer
- Plain TypeScript for biology, seeded selection, graph adapters, and result validation
- Versioned browser local storage for anonymous drafts and the last completed result
- Vitest + Testing Library for unit/component coverage
- Playwright for touch-oriented browser journeys and screenshot capture
- Vercel static preview as the release target

Phaser is lazy-loaded after the mission screen. React retains one renderer controller across both habitats and all six rounds. Rendering emits taps and timing events but never calculates population outcomes.

## Responsibility boundary

React owns:

- mission, timing, predictions, progression, graphs, evidence, questions, CER, and results;
- all session and learning state;
- local persistence, draft recovery, error messages, and the observation fallback;
- accessibility and responsive layout.

Phaser owns:

- procedural reef, bark, fish, and moth presentation;
- deterministic placement and movement visuals;
- touch hit testing and nonviolent capture/escape feedback;
- canvas lifecycle, resize, pause, and cleanup.

The biology engine owns:

- the fixed population and predation constraints;
- manual-capture validation and automatic weighted selection;
- survivor and inherited-offspring calculations;
- immutable generation results and schema validation.

## Performance and safety choices

- Initial application JavaScript stays below 400 KB gzip; the larger Phaser chunk loads only when play begins.
- Procedural artwork avoids external licenses and asset-loading failure.
- Camouflage uses background relationship, luminance, texture, and pattern—not hue alone.
- Extended mode enlarges hit targets without enlarging organisms.
- Reduced motion removes sinusoidal movement and capture/miss effects.
- Graphics or storage failure never blocks the science pathway.
- No student identity or network-capable saver exists in this release.

## Deferred

Google Sheets, teacher dashboards, named student data, analytics, mutation/genetics, accounts, leaderboards, combat, offline PWA behavior, a custom domain, and production promotion are outside this release.
