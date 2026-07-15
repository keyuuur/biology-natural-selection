# Trait Tracker: Natural Selection Field Study

An iPad-first, 10–15 minute biology classroom game in which students track an
inherited movement-speed trait through five deer generations. Students make a
prediction, run a deterministic model, select graph and survival evidence, and
finish with a structured CER.

## Learning target

Students use population data to explain this chain:

`existing inherited variation → selection pressure → unequal survival and reproduction → inherited offspring traits → population-frequency change`

The game explicitly corrects the misconception that an individual animal changes
its inherited trait because it needs to adapt.

## Local setup

Requirements: Node.js 24+ and npm 11+.

```text
npm install
npm run dev
```

Open the local URL printed by Vite. No account, API key, database, or Google Sheet
is needed.

## Checks

```text
npm run lint
npm test
npm run build
```

`npm run check` runs all three checks in sequence.

## Model rules

- Generation 0 starts with 10 higher-speed and 10 lower-speed deer.
- Only 12 deer reach enough distant food to survive and reproduce.
- Relative success weights are 1.5 for higher-speed and 1.0 for lower-speed.
- Largest-remainder allocation keeps every result deterministic.
- The 12 survivors are parents; their offspring fully replace the population with
  a new generation of 20.
- The expected higher/lower sequence is
  `10/10 → 12/8 → 13/7 → 15/5 → 17/3 → 18/2`.
- There is no mutation, randomness, trait switching, combat, or predator scenario.

## Privacy and saving

Drafts and the last completed field report are stored only in browser local storage.
The result schema contains no student name, period, email address, or other identity
field. There are no network submissions or Google Sheets writes.

## Assets

The app includes only the selected deer glTF and the source license from the
Quaternius animal pack. See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).

## Project context

- `TECH_STACK.md` records the durable architecture and classroom constraints.
- `CODEX_START.md` is a machine-local planning prompt and is intentionally excluded
  from Git tracking.
