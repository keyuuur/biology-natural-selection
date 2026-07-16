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
- Use texture, luminance, and pattern rather than hue alone.
- Provide reduced motion and a DOM observation fallback that preserves prediction, evidence, misconception checks, and CER without a predator score.
- Required evidence: Generation 0 and 3 for both habitats plus one within-generation catch/survivor comparison.
- Four misconception checks store first attempts, explain errors, and require correction. CER free text is saved but not automatically graded.
- Do not claim formal NGSS or Missouri standards alignment from the current curriculum sources.

## Rejected or deferred approaches

- Apps Script as the game runtime, React + Three.js + Phaser together, and a deterministic click-through deer loop are rejected for this release.
- Existing student-result migration, teacher dashboards, named data, Sheets adapters, mutation/genetics, offline PWA, custom domain, and production promotion are deferred.

## Reconsideration gates

- Revisit Phaser only if measured physical-iPad performance fails the release criteria.
- Revisit external result collection only after an explicit privacy/data-flow approval.
- Revisit the deer scenario only as a later independent comparison activity.
