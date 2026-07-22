# Natural Selection Interaction Pilot

Use this protocol only after a browser-verified, QA-enabled preview is frozen.
It records anonymous observation codes and aggregate device facts only. Do not
enter names, periods, support reasons, student answers, screenshots of student
work, or a code-to-name map into the application, QA panel, or pilot record.

## Gate 0: freeze the candidate

Before any device or student session:

- Record the exact branch, commit SHA, preview URL, and Vercel deployment ID.
- Use that single preview for every Gate 1 and Gate 2 session. Do not change
  the game between primary pilot sessions.
- Confirm the preview is not a production deployment and no student identity,
  analytics, or network submission is requested.
- Students use the plain preview URL. Only the facilitator adds `?qa=1` to the
  QA-enabled preview URL for technical checks.
- The facilitator panel is device-only and in-memory. It reports aggregate
  outcomes and renderer facts; it never saves or sends student information.

## Gate 1: target iPad, Safari, and school Wi-Fi

### Setup record

- Device model and iPadOS/Safari version: ____________________
- School Wi-Fi location: ____________________
- Preview URL: ____________________
- Deployment ID and commit SHA: ____________________
- Date and facilitator: ____________________
- Production was not used: [ ]
- No student identity is requested: [ ]

Open the facilitator URL with `?qa=1`. Open **Facilitator diagnostics**, press
**Reset facilitator session data**, and close the panel before each session. It
is in-flow below the field and must never cover prey or intercept a tap. The
reset begins a fresh in-memory device-measurement window; it never changes the
live population, timer, HUD, or student science path.

The panel's input-latency values measure Phaser input handling through feedback
creation, not physical touch-to-photon paint time. Use them as a repeatable
technical signal, then also watch the visible feedback and freeze behavior on
the physical device.

### Exact three-session path

| Session | Required exercise | Evidence to record |
| --- | --- | --- |
| 1 | Cold start on school Wi-Fi; Standard Predator study; at least 24 centered deliberate prey taps across both habitats. | Cold-start time, accepted/attempted taps, input samples, FPS, visible freezes, controller/canvas counts. |
| 2 | Extended Predator study; centered edge targets; portrait-to-landscape rotation during a live round; background Safari; return and press Resume. | Timer before/after hidden state, remapped tap after rotation, no duplicate catch/end, counts after session. |
| 3 | Turn on system reduced motion; finish a Predator study; replay without refreshing. | Reduced-motion behavior, renderer reuse, Session-3 performance compared with Session 1. |

Then perform two short route checks, separate from the three primary sessions:

- **VoiceOver (exact smoke path):** on the plain preview URL, turn on
  VoiceOver and choose **Observation** from Mission. Confirm that the selected
  study route and one current action are announced once, complete one reef
  Observation generation, then reach Results. The student must be able to
  identify the current action and understand that predator performance was not
  part of this study. Record only pass/block and whether a duplicate status
  announcement, lost focus, or unclear control prevented the path.
- **Observation:** select Observation deliberately, resolve a reef round with
  no canvas, and verify Results says predator performance was not part of the
  study while the science pathway still reaches predictions, graphs, checks,
  evidence, and CER.

### Measurement rules

- **Cold start:** start the clock when the preview navigation begins; stop when
  the Mission screen is usable and the route controls are visible.
- **Centered eligible tap:** a deliberate tap near the center of an eligible
  organism. It is correct only if that organism is accepted exactly once.
- **Input latency p95:** after a session, read the panel's latency p95 and
  sample count. Use at least the 24 Session-1 centered taps for the primary
  sample. Do not label it physical display latency.
- **Average gameplay FPS:** after at least 20 seconds of a full-density live
  round, record the panel's current renderer sample and frame-sample count.
  Record its frame p95 and frames over 50 ms beside it.
- **Visible freeze:** time or estimate any plainly visible frozen interaction;
  record the longest observed freeze. A pause overlay is not a freeze.
- **Timer preservation:** record remaining time immediately before backgrounding
  and immediately after the Resume overlay appears. Hidden time must not be
  deducted.
- **Session-3 degradation:** compare equivalent 20-second live-round FPS
  readings. Session 3 must be at least 90% of Session 1.

| Measure | Session 1 | Session 2 | Session 3 | Gate target |
| --- | ---: | ---: | ---: | ---: |
| Correct centered taps / attempted | | | | at least 95% |
| Input latency p95 / sample count | | | | at most 100 ms |
| Average FPS / frame p95 | | | | at least 30 FPS |
| Longest visible freeze | | | | at most 250 ms |
| Controller count after session | | | | exactly 1 |
| Canvas count after session | | | | exactly 1 |
| Duplicate round ends | | | | 0 |
| Cold start | | n/a | n/a | under 5 seconds |

Also confirm:

- [ ] Canvas touches do not scroll the page; scrolling outside the canvas works.
- [ ] No prey or controls are clipped in portrait or landscape.
- [ ] Fish movement does not create a repeated reversal/stall pattern that is
      visibly confusing or makes row/location an unintended cue.
- [ ] Rotation remaps actors inside the canvas and a post-rotation target can be tapped.
- [ ] Hidden time is not deducted and return requires Resume.
- [ ] Replay does not create another controller, canvas, or renderer reload.
- [ ] VoiceOver Observation path reaches Results, announces the current action
      once, and has no duplicate status message, lost focus, or unclear control.
- [ ] Observation path completes without a canvas or predator score.

### Gate 1 decision

Gate 1 passes only if all technical targets above pass. A touch-accuracy,
timer-integrity, rotation-mapping, duplicate-event, crash, progressive-slowdown,
or accessibility failure blocks Gate 2.

- **Technical/accessibility blocker:** reproduce it on this frozen SHA, fix
  only that category, rerun affected automated coverage, and repeat all three
  iPad sessions before inviting students.
- **Motion/topology concern:** record viewport, habitat, and trigger. It may
  proceed to Gate 2 only if it is not impairing reliable play; repeated,
  student-visible confusion or row/location strategy requires correction first.
- **Non-blocking note:** record isolated visual preference without tuning.

Gate 1 decision: **PASS / BLOCKED**

## Gate 2: anonymous eight-student pilot

### Assignment and privacy

Use exactly eight sequential anonymous codes, `A` through `H`:

- `A` through `F`: six distinct Standard Predator studies.
- `G` through `H`: two Extended Predator studies.
- One of `A` through `H` completes a separate Observation replay after their
  primary study. Its time is recorded separately; it is not a ninth primary
  session and does not replace a Standard or Extended session.
- Include at least two students who commonly benefit from extra processing or
  motor time, but do not record names, reasons, diagnoses, or support status.

Before each primary study, clear the prior device's local draft/result after
the facilitator has recorded only the permitted anonymous aggregate fields. Do
not retain one student's local reasoning for another student.

Give every student this exact neutral script:

> Please work through the study. Tell me if you cannot tell what to do. I will
> wait fifteen seconds before offering help.

Do not intervene before 15 seconds. If help is required, give this one neutral
prompt and record that exact wording plus the navigation category:

> Please reread the on-screen instruction. What action does it ask you to take?

Use `starting generation`, `Mission action`, `Evidence action`, `CER location`,
or `other navigation` as the category. Never infer or record why help was
needed.

### Measurement definitions

- **First accepted catch:** Start Generation tap to the first accepted catch.
- **Completion time:** Mission screen usable to Results visible; do not include
  the separate Observation replay.
- **Time to 12:** record elapsed time and seconds remaining only if 12 manual
  catches occur; otherwise write `not reached`.
- **Eligible-tap accuracy:** aggregate all deliberate intended eligible taps as
  `accepted exactly once / attempted`. Do not count blank taps or protected
  parents as intended eligible captures.
- **Next-action discovery:** relevant screen visible and settled to the first
  correct action. Do not cue before the five-second observation.
- **Strategy:** after a Standard predator round, code one short category only:
  `background/pattern`, `color/stripe`, `row/location`, `movement`, or `other`.
  Do not save quotations.

| Code | Mode | First catch sec | Eligible taps correct / attempted | Help category after 15 sec | Rotation, scroll, or motion issue | Primary completion min | Unclear next action |
| --- | --- | ---: | --- | --- | --- | ---: | --- |
| A | Standard | | | | | | |
| B | Standard | | | | | | |
| C | Standard | | | | | | |
| D | Standard | | | | | | |
| E | Standard | | | | | | |
| F | Standard | | | | | | |
| G | Extended | | | | | | |
| H | Extended | | | | | | |

### Challenge and navigation evidence

| Code | Time to 12 catches or not reached | Seconds remaining at 12 | Misses | Camouflaged / conspicuous captures | Stated strategy |
| --- | --- | ---: | ---: | --- | --- |
| A | | | | | |
| B | | | | | |
| C | | | | | |
| D | | | | | |
| E | | | | | |
| F | | | | | |

| Code | Mission action within 5 sec | Evidence action within 5 sec | Evidence completed without navigation help | Needed help locating CER response or submit |
| --- | --- | --- | --- | --- |
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |
| F | | | | |
| G | | | | |
| H | | | | |

Observation replay record:

| Code | Completed independently | Identifies same science endpoint | Notes limited to route behavior |
| --- | --- | --- | --- |
| | | | |

### Exit prompts and coding key

Ask these prompts verbally. Record only `clear`, `clear after feedback`, or
`not yet clear`; never retain the student's wording.

1. **Population change:** “Using your graph and survival/offspring evidence,
   why did the percentage of one inherited pattern change even though the total
   stayed 40?”
2. **Individual change:** “Did any individual change or develop a needed
   pattern, or did existing inherited patterns become more or less common?
   Explain.”
3. **Fitness:** “What does fitness mean in this activity?”
4. **Changed background:** “If the background changed, would any individual
   moth need to change? What could change in the next generations, and why?”

5. **Science completion:** Do misses or predator points affect whether the
   science study is complete? Why or why not?

If a student uses intentional-individual-change language, give this one
correction, then re-ask the relevant prompt:

> In this model, patterns are inherited; individual organisms did not change
> their own pattern. Look at the survivors and offspring.

Code a combined causal-model explanation as **clear** only when the responses
communicate all of: pre-existing inherited variation, environmental
pressure/predation, unequal survival **and** reproduction/offspring, inherited
offspring, and population percentage/composition changing while total population
size stays fixed. `Clear after feedback` requires the same model after the
documented neutral correction; otherwise use `not yet clear`.

For **Science completion**, code **clear** only when the student recognizes
that misses and predator points describe predator play, while the science study
is completed through its prediction, evidence, checks, and CER path. If needed,
give this neutral correction and re-ask the prompt:

> Misses and predator points describe the predator activity. They do not lower
> or decide whether the science study is complete.

| Code | Population change | Individual change | Fitness | Changed background | Science completion | Combined causal model |
| --- | --- | --- | --- | --- | --- | --- |
| A | | | | | | |
| B | | | | | | |
| C | | | | | | |
| D | | | | | | |
| E | | | | | | |
| F | | | | | | |
| G | | | | | | |
| H | | | | | | |

### Gate 2 decision rules

- **Experience/access pass:** at least `7 of 8` make a first accepted catch
  within five seconds; literal 90% thresholds require `8 of 8`; aggregate
  intended eligible-tap accuracy is at least 90%; no more than one student
  needs help starting a generation or locating CER; median completion is at
  most 12 minutes; all eight finish within 15 minutes; and at least `7 of 8`
  find Mission and Evidence actions within five seconds and complete Evidence
  independently.
- **Science pass:** at least `6 of 8` reach the causal model; no student
  retains intentional-individual-change language after correction; no student
  believes misses or predator performance lower science completion; and the
  Observation replay independently identifies the same endpoint.
- **Challenge review only:** four or more of six Standard students reach 12
  catches with at least 10 seconds remaining, or three or more report
  `color/stripe` or `row/location`. Fast catches alone never force a visual
  correction.
- **Reliability/access first:** if first-catch or tap-accuracy thresholds miss,
  diagnose touch, detection, movement, or layout before making the field more
  difficult. Do not tune challenge from unreliable play.
- **Topology review:** change layout only if repeated reversal/stall is visibly
  disruptive or connected to a row/location strategy. Desktop solver-turn
  counts alone are never enough.

Gate 2 decision: **PASS / BLOCKED / ONE BOUNDED TUNING PASS**

## Gate 3: evidence-based tuning and release decision

For any proposed correction, write one short anonymous issue summary with the
failure category, denominator/frequency, reproducible route/mode/orientation,
technical diagnostics if applicable, and why the selected correction is the
smallest fit.

Make at most one bounded correction category:

- **Reliability/accessibility:** touch, timing, focus, pause, layout, or
  renderer behavior.
- **Challenge:** visual or topology organization only. Preserve biology, hit
  areas, organism size, motion-speed range, score values, and time limits.
- **Science scaffolding:** only the specific prompt, feedback, graph cue, or
  CER support implicated by exit evidence.
- **Cosmetic preference:** document as later backlog; do not delay release.

After the bounded correction, rerun lint, unit/component tests, the production
build, three science journeys, Chromium direct-touch, WebKit iPad coverage, and
the 60-second soak. Repeat Gate 1 for any renderer, touch, timing, rotation, or
accessibility change; repeat the focused student measure that triggered a
student-pilot correction.

Update `CURRENT_STATUS.md` with exact preview, iPad, pilot, and test evidence.
Production promotion remains unavailable until these gates pass and Keyur gives
separate explicit approval.
