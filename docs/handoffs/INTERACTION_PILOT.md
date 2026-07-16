# Natural Selection Interaction Pilot

Use this checklist only after the interaction-polish preview is browser-verified. Record anonymous session codes only. Do not enter student names, periods, or assessment responses into the application or QA tools.

## Gate 1: target-iPad technical verification

### Setup

- Device and Safari version: ____________________
- School Wi-Fi location: ____________________
- Preview URL and deployment ID: ____________________
- Date: ____________________
- Confirm production was not used: [ ]
- Confirm no student identity is requested: [ ]

### Three consecutive sessions

| Session | Required path | Completed | Notes |
| --- | --- | --- | --- |
| 1 | Standard; at least 24 deliberate prey taps across both habitats | [ ] | |
| 2 | Extended; edge taps, active rotation, background tab, and Resume | [ ] | |
| 3 | Reduced motion; finish, replay, and continue without refreshing | [ ] | |

For each session, record centered eligible taps as `registered / attempted`. Count a tap as correct only when the intended organism is accepted exactly once.

| Measure | Session 1 | Session 2 | Session 3 | Gate target |
| --- | ---: | ---: | ---: | ---: |
| Correct centered taps | | | | at least 95% |
| Touch feedback p95 | | | | at most 100 ms |
| Average gameplay FPS | | | | at least 30 |
| Longest visible freeze | | | | at most 250 ms |
| Controller count after session | | | | exactly 1 |
| Canvas count after session | | | | exactly 1 |
| Cold start | | n/a | n/a | under 5 seconds |

Session 3 performance may degrade by no more than 10% from Session 1. Any touch-accuracy, timer-integrity, rotation-mapping, duplicate-event, crash, or progressive-slowdown failure blocks the student pilot.

Also confirm:

- [ ] Canvas touches do not scroll the page.
- [ ] Scrolling outside the canvas still works.
- [ ] No prey or controls are clipped in portrait or landscape.
- [ ] Hidden time is not deducted and return requires Resume.
- [ ] No duplicate catch or duplicate round completion occurs.
- [ ] Replay does not create another canvas or reload the renderer.

Gate 1 decision: **PASS / BLOCKED**

## Gate 2: anonymous 6–8 student pilot

Use codes `A–H`. Include at least four Standard sessions, at least two Extended sessions, and at least two students who commonly benefit from additional processing or motor time. Do not record why a student receives support.

The facilitator waits 15 seconds before helping. If help is required, record the exact prompt without interpreting it.

| Code | Mode | First catch seconds | Eligible taps correct / attempted | Help prompt after 15 s | Rotation or scroll issue | Total minutes | Unclear next action |
| --- | --- | ---: | --- | --- | --- | ---: | --- |
| A | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |
| D | | | | | | | |
| E | | | | | | | |
| F | | | | | | | |
| G | | | | | | | |
| H | | | | | | | |

Ask each student these four exit prompts verbally:

1. Why did a pattern's percentage change?
2. Did an individual organism change its own pattern?
3. What does fitness mean in this activity?
4. What might happen if the background changed?

Record only a short anonymous outcome code for each prompt: `clear`, `clear after feedback`, or `not yet clear`.

| Code | Population change | Individual change | Fitness | Changed background |
| --- | --- | --- | --- | --- |
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |
| F | | | | |
| G | | | | |
| H | | | | |

### Pilot acceptance

- [ ] At least 80% make a first accepted catch within five seconds.
- [ ] At least 90% of deliberate eligible taps register correctly.
- [ ] No more than one student needs help starting a generation.
- [ ] Median completion is at most 12 minutes.
- [ ] At least 90% finish within 15 minutes.
- [ ] At least six of eight explain population change using inherited variation, environmental pressure, survival and reproduction, offspring, and population percentage.
- [ ] No student retains intentional-individual-change language after feedback.
- [ ] No student believes misses or predator performance reduce science completion.

Gate 2 decision: **PASS / BLOCKED**

## Gate 3: bounded tuning and release decision

Classify every observation before changing the build:

- **Release blocker:** touch, timing, pause, accessibility, crash, progressive slowdown, or natural-selection misconception.
- **Later backlog:** cosmetic preference that does not affect comprehension or reliability.

After one bounded tuning pass, rerun lint, unit/component tests, the production build, the three science journeys, Chromium direct-touch tests, WebKit iPad checks, and the 60-second soak. Update `CURRENT_STATUS.md` with exact evidence. Production promotion still requires Keyur's separate explicit approval.
