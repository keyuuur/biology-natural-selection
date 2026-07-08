# Natural Selection Tech Stack

## Purpose

This repo should become a browser-based 3D biology simulation game where students observe trait variation, run survival/reproduction rounds, track trait frequency changes, and explain natural selection with evidence.

This document is stack and implementation context for Codex. Do not treat it as a finished game design; use it as the baseline for the next planning phase.

## Stack

- Runtime: `Vite + React + TypeScript`
- 3D rendering: direct `three` usage, not React Three Fiber for the first version
- UI layer: React DOM HUD over a Three.js canvas
- Asset format: `glTF` first for runtime animal models
- Simulation model: deterministic TypeScript functions first, with seeded randomness only if needed later
- Data storage in v1: local TypeScript objects plus browser local storage for draft saves if needed
- Classroom logging: schema-now, fake-saver-first, Apps Script endpoint later
- Deployment target: GitHub repo plus Vercel after the first playable slice works locally

Use direct Three.js because the game needs a visible population of animated animals, while the trait and generation model should stay plain TypeScript and testable without rendering.

## Source Assets

Primary animal pack:

- Source zip: `Ultimate Animated Animals - July 2021-20260708T004836Z-3-001.zip`
- License: CC0 1.0 Universal
- Creator credit: Quaternius
- Runtime format to use first: files under `glTF/`
- Animals available: `Alpaca`, `Bull`, `Cow`, `Deer`, `Donkey`, `Fox`, `Horse`, `Horse_White`, `Husky`, `ShibaInu`, `Stag`, `Wolf`

Common animations:

- `Idle`
- `Idle_2`
- `Walk`
- `Gallop`
- `Gallop_Jump`
- `Eating`
- hit reaction animations
- death animation
- animal-specific attack animations

For this game, start with:

- `Deer` or `Fox` as the focal population
- `Wolf` as a selection pressure only if predator pressure is part of the first scenario

Represent traits by color tint, scale, speed, or UI labels rather than requiring new custom animal models for the first version.

Do not use OBJ assets for gameplay runtime unless there is a specific debugging reason. OBJ is useful for static inspection but does not preserve the animated workflow as cleanly as glTF.

Do not commit the entire original zip into the repo. Copy only the selected runtime assets into the project, and include the license text or a short attribution note in the repo.

## Expected Project Shape

Use this shape unless the next planning phase chooses a more specific layout:

```text
/
  public/
    assets/
      animals/
        deer/
        fox/
        wolf/
      environment/
  src/
    app/
      App.tsx
      game.css
    game/
      createScene.ts
      gameLoop.ts
      input.ts
      camera.ts
    animals/
      animalCatalog.ts
      animalLoader.ts
      animationController.ts
      traitVisuals.ts
      populationVisuals.ts
    simulation/
      populationState.ts
      traitModel.ts
      generationRunner.ts
      graphSeries.ts
    learning/
      prompts.ts
      misconceptionChecks.ts
      cerScaffold.ts
      resultSchema.ts
    ui/
      Hud.tsx
      TraitLegend.tsx
      GenerationControls.tsx
      TraitGraph.tsx
      ResultsPanel.tsx
```

## Runtime Responsibilities

Three.js owns:

- renderer, scene, camera, lighting, and resize handling
- loading glTF animal assets
- animation mixers and per-animal animation state
- visual population placement
- trait visual differences such as tint, scale, or movement speed

React owns:

- generation controls
- trait legend
- selection-pressure explanation
- trait-frequency graph
- student predictions and CER response
- result and export preview

Simulation logic owns:

- individual trait values
- survival rules
- reproduction rules
- generation transitions
- trait-frequency time series

Keep the simulation independent from Three.js. The model should be testable without a canvas.

## Data Conventions

Start with explicit trait and generation data:

```ts
type TraitValue = "fast" | "slow";

type Organism = {
  id: string;
  trait: TraitValue;
  generation: number;
  survived: boolean;
  reproduced: boolean;
};

type GenerationResult = {
  generation: number;
  startingCounts: Record<TraitValue, number>;
  survivorCounts: Record<TraitValue, number>;
  offspringCounts: Record<TraitValue, number>;
  endingCounts: Record<TraitValue, number>;
};
```

Student progress should be recordable as structured data:

```ts
type NaturalSelectionResult = {
  sessionId: string;
  studentName?: string;
  scenarioId: string;
  generations: GenerationResult[];
  prediction: string;
  claimEvidenceReasoning: {
    claim: string;
    evidence: string[];
    reasoning: string;
  };
};
```

Use simple trait options first. Avoid complex genetics vocabulary until the natural-selection loop is clear.

## First Playable Slice

Build only this first:

- One habitat scene
- One focal animal population, preferably deer
- Two visible trait variants, such as fast deer and slow deer
- One selection pressure, such as limited food location or predator pressure
- A `Run Generation` button
- A graph showing trait frequency across generations
- Animals idle, walk, and eat using imported animations
- Student predicts which trait will become more common
- Student writes one CER response after several generations

The first slice is successful when students can see that trait frequency changes because some variants survive and reproduce more often in a specific environment.

## Browser Verification

Every implementation pass should verify:

- App starts locally with Vite
- Page returns HTTP 200
- Three.js canvas renders nonblank
- Focal animal glTF model loads
- `Idle`, `Walk`, and `Eating` animations can play
- Trait variants are visually distinguishable
- `Run Generation` updates population data
- Trait graph updates after each generation
- HUD and graph remain readable on laptop and small tablet widths
- Result object can be inspected without a real Google Sheets endpoint

## Out Of Scope For First Build

- Physical science content
- Lab safety content
- Human-body or homeostasis content
- Full Mendelian genetics simulation
- Mutation-heavy model
- Multiplayer
- Real Google Sheets writes
- Large open-world exploration
- Combat-focused predator gameplay

