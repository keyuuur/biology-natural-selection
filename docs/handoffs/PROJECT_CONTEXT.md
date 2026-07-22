# Natural Selection Project Context

## Purpose and audience

- Build a 10–15 minute, iPad-first natural-selection game for ninth-grade Biology 1.
- Students act as predators and use their own population evidence to explain: pre-existing inherited variation → environment-dependent predation → unequal survival and reproduction → inherited offspring traits → a change in population percentages.
- The game must directly reject intentional individual adaptation and distinguish population composition from population size.

## Canonical product decision

- The recovered Google Sheet `Natural Selection Game` (`1sj38A8zHKdimXSASC9bqsNA8eS0toB6VC5uG96nsUwE`) is the legacy behavioral reference. Never copy student names or raw submissions into this repository.
- The shipped game is the fish-and-moth predator/camouflage experience, not the deer/food prototype.
- Preserve the deer prototype in Git history at commit `3737cb7`; do not ship or maintain both rendering engines.

## Approved architecture

- Runtime: Vite + React + TypeScript.
- Gameplay renderer: Phaser, lazy-loaded after the mission screen.
- React owns learning state, biology outcomes, graphs, assessment, persistence, and accessibility. Phaser owns drawing, movement, hit testing, and nonviolent capture feedback only.
- Biology remains immutable, seeded, and testable without a canvas.
- Persistence is versioned local storage only. No names, periods, Sheets writes, analytics, accounts, cookies, or leaderboard.
- Deployment target is an anonymous public Vercel preview. Production requires a separate explicit approval.

## Locked gameplay rules

- Two independent habitats: reef fish and bark moths; three generations each.
- Each habitat begins 20 camouflaged / 20 conspicuous organisms.
- Each generation resolves exactly 12 predation events, leaving 28 survivors; offspring refill the population to 40.
- Every capture path, manual or automatic, must preserve at least three living parents of each morph. A protected prey tap becomes an escape, never a capture; offspring are never resurrected without parents.
- Automatic completion uses seeded weighted selection without replacement: conspicuous weight 3, camouflaged weight 1.
- Offspring use stable largest-remainder allocation, camouflaged first on ties, bounded to 4–36 per morph.
- Traits remain fixed and inherited. No mutation, genotype simulation, combat, gore, or student editing of traits.
- Predator performance is separate from science completion: 10 points per accepted manual capture, equal value for both morphs, no miss penalty, no automated-capture points.

## Classroom and accessibility decisions

- Standard mode: 25 seconds per generation. Extended mode: 40 seconds, 25% slower movement, 20% larger hit areas.
- Both modes use the same biology and science-completion path.
- Organisms are deterministically shuffled before grid placement. Reef movement is assigned by shuffled slot, never by morph: each round gives every fish the same seeded horizontal speed and initial direction, while capped curve phase, amplitude, and period remain slot-only visual variation. Patrol bounds, hit areas, feedback, and movement rules do not derive from morph. This prevents speed or direction from becoming a trait cue after selection changes morph counts; the finite curve sample is intentionally not claimed to have an exactly identical per-morph histogram.
- The active renderer uses one immediate-input lock per organism, one top-most eligible target, independent pause reasons, normalized rotation remapping, and one round-completion lock. Hidden time never reduces the biology timer.
- Live play shows catches toward 12, misses, model-protected taps, and the timer; points, accuracy, streaks, and morph-specific catch totals remain outside the live HUD.
- Use texture, luminance, and pattern rather than hue alone.
- Provide reduced motion and a DOM observation fallback that preserves prediction, evidence, misconception checks, and CER without a predator score.
- Required evidence: Generation 0 and 3 for both habitats plus one within-generation catch/survivor comparison.
- Four misconception checks store first attempts, explain errors, and require correction. CER free text is saved but not automatically graded.
- Do not claim formal NGSS or Missouri standards alignment from the current curriculum sources.

## Approved interface direction

- The approved F2 “Field Station Inserts” direction is the canonical interface system.
- The app is one continuous dark navy field-lab shell. The global header, eight-step field trail, gameplay frame, live HUD, and privacy footer use cyan and gold status accents.
- Reading-heavy work happens on warm ivory inserts: mission, prediction, generation review, habitat summaries, evidence, misconception checks, CER, graphs, tables, results, recovery, and observation fallback.
- Selection, focus, disabled, correct, and retry states must remain distinguishable without relying on color or opacity alone. Primary controls remain at least 56 CSS pixels high.
- The warm reading surfaces are an interface/readability layer only. They may not change the approved C reef renderer, organism appearance, motion, tap geometry, timing, biology, assessment, persistence, privacy, or result schema.
- Full-page QA screenshots hide the fixed skip link only while capturing. In the live product it remains keyboard-visible through `:focus-visible`. Live Phaser field screenshots use viewport capture instead of a full-page canvas capture so visual QA does not interrupt the renderer clock.

## Interaction-polish execution decisions

- Students may choose a Predator study or an Observation study on the Mission screen. Observation is an intentional, student-selected science route: it does not mount Phaser, records no predator score, and reaches the same prediction, population-evidence, misconception, evidence-selection, CER, and results endpoint as predator play.
- Drafts use schema `2.1` only to remember the selected study route. Legacy `2.0` drafts migrate as Predator studies. The completed-result schema remains `2.0`; no student identity, network transmission, or new assessment field was added.
- Portrait actions use an in-flow, sticky `StageActionDock` on Mission, Evidence, and CER, with semantic habitat grouping and a focused stage heading on each state transition. At iPad portrait widths, the five Evidence checkpoints use a readable three-then-two layout while retaining their full ordered labels and one document scroll. The app owns the sole polite live region so round feedback is not duplicated by Results.
- A renderer failure occurs within an active round rather than at a session-stage transition. Its native DOM Observation fallback therefore has its own focusable stage heading and moves focus there when it appears; this preserves keyboard and screen-reader orientation without adding another live region.
- Student-visible trait labels must always derive from `HABITAT_STUDENT_COPY[habitatId].morphLabels`. Reef evidence uses `reef-matched pattern` / `high-contrast pattern`; bark evidence uses `mottled bark pattern` / `solid light pattern`. Never use one habitat's shorthand on the other habitat's prediction, review, graph, table, observation, or fallback screen.
- Reef challenge corrections must preserve biological neutrality: fish receive deterministic, morph-neutral staggered placements; both morphs use muted reef-adjacent palettes, a shared dark eye treatment, and texture/pattern rather than a bright color cue. Habitat dapple, ribbons, and grain are noninteractive and do not alter hit geometry.
- Standard reef movement is primarily horizontal at 26-46 CSS pixels per second with a seeded 3-10 pixel visual curve. Each reef round shares one seeded speed and initial direction across all fish; slot-only curve variation and patrol regions reduce traffic-turn churn without changing patrol bounds, hit regions, population rules, scoring, timers, or the reduced-motion contract. Reduced motion remains slow linear fish with no curve.
- Challenge diagnostics must sample each raw placement in a fresh browser page. A shared-page sweep can overrun a nominal checkpoint and inflate renderer traffic counts. The isolated 12-seed × four-viewport baseline is the local source of truth; screenshots and physical/pilot observation, not a solver-turn total alone, decide whether a future layout/topology correction is warranted.
- The current 8-column portrait field has more legitimate patrol corrections than landscape while maintaining separate hit regions. Do not change speed, tap geometry, biology, scoring, or time limits merely to lower that diagnostic count; revisit topology only if visual/device or student evidence shows repeated reversals that affect challenge or comprehension.
- Automated challenge checks can verify construction invariants and renderer stability only. Physical-iPad testing and the student pilot remain the authority for whether visual challenge is appropriate in class.

## Rejected or deferred approaches

- Apps Script as the game runtime, React + Three.js + Phaser together, and a deterministic click-through deer loop are rejected for this release.
- Existing student-result migration, teacher dashboards, named data, Sheets adapters, mutation/genetics, offline PWA, custom domain, and production promotion are deferred.

## Reconsideration gates

- Revisit Phaser only if measured physical-iPad performance fails the release criteria.
- Revisit external result collection only after an explicit privacy/data-flow approval.
- Revisit the deer scenario only as a later independent comparison activity.
