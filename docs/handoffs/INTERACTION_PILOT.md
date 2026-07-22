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
- [ ] Fish movement does not show a repeated reversal or stall pattern that makes tapping confusing or makes row/location an unintended cue.
- [ ] Hidden time is not deducted and return requires Resume.
- [ ] No duplicate catch or duplicate round completion occurs.
- [ ] Replay does not create another canvas or reload the renderer.
- [ ] Safari VoiceOver announces the study-route choice, one current action, the Observation round, and Results without duplicate status messages.
- [ ] Observation study can be started and its reef round resolved without mounting a canvas; its Results wording says predator performance was not part of the study.

Gate 1 decision: **PASS / BLOCKED**

## Gate 2: anonymous 6–8 student pilot

Use codes `A–H`. Include at least six Standard sessions, at least two Extended sessions, and at least two students who commonly benefit from additional processing or motor time. Do not record why a student receives support.

Include at least one Observation study in addition to the Standard and Extended sessions. The Observation student should complete independently and explain that the science endpoint is the same even though predator performance is not part of that route.

For the visual-challenge decision, collect six distinct Standard-mode pilot sessions. Six Standard sessions, two Extended sessions, and one Observation replay can fit within the same six-to-eight anonymous students.

The facilitator waits 15 seconds before helping. If help is required, record the exact prompt without interpreting it.

| Code | Mode | First catch seconds | Eligible taps correct / attempted | Help prompt after 15 s | Rotation, scroll, or motion issue | Total minutes | Unclear next action |
| --- | --- | ---: | --- | --- | --- | ---: | --- |
| A | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |
| D | | | | | | | |
| E | | | | | | | |
| F | | | | | | | |
| G | | | | | | | |
| H | | | | | | | |

### Challenge and navigation evidence

For each Standard-mode session, record the predator-round evidence below. The stated strategy is the student's own short description after the round; use only one of `background/pattern`, `color/stripe`, `row/location`, `movement`, or `other observation`.

| Code | Time to 12 catches | Seconds remaining at 12 | Misses | Camouflaged / conspicuous captures | Stated strategy |
| --- | ---: | ---: | ---: | --- | --- |
| A | | | | | |
| B | | | | | |
| C | | | | | |
| D | | | | | |
| E | | | | | |
| F | | | | | |
| G | | | | | |
| H | | | | | |

Record next-action discovery separately. Start each timing at the relevant screen becoming visible; do not prompt before five seconds.

| Code | Mission next action within 5 s | Evidence next action within 5 s | Evidence completed without navigation help | Needed help locating CER response or submit |
| --- | --- | --- | --- | --- |
| A | | | | |
| B | | | | |
| C | | | | |
| D | | | | |
| E | | | | |
| F | | | | |
| G | | | | |
| H | | | | |

For the Observation participant, also record the route-specific endpoint check:

| Code | Completed Observation independently | Says the science endpoint is the same | Notes |
| --- | --- | --- | --- |
| | | | |

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
- [ ] At least 90% identify the next action on Mission and Evidence within five seconds and finish Evidence without navigation help.
- [ ] No more than one student needs help locating the CER response or submit action.
- [ ] At least one student independently completes Observation study and can say it reaches the same science endpoint without a predator score.
- [ ] Challenge decision recorded: if four or more of six Standard-mode students reach 12 catches with at least 10 seconds remaining, or three or more state `color/stripe` or `row/location`, classify the field as needing the next visual correction review. If fewer than 80% make a first catch within five seconds or centered eligible taps are below 90%, stop and restore the approved baseline before tuning challenge.
- [ ] Any repeated fish reversal/stall observation is classified separately from touch accuracy. Change layout/topology only when it is visibly disruptive or contributes to a row/location strategy; do not tune from a renderer diagnostic count alone.
- [ ] At least six of eight explain population change using inherited variation, environmental pressure, survival and reproduction, offspring, and population percentage.
- [ ] No student retains intentional-individual-change language after feedback.
- [ ] No student believes misses or predator performance reduce science completion.

Gate 2 decision: **PASS / BLOCKED**

## Gate 3: bounded tuning and release decision

Classify every observation before changing the build:

- **Release blocker:** touch, timing, pause, accessibility, crash, progressive slowdown, or natural-selection misconception.
- **Later backlog:** cosmetic preference that does not affect comprehension or reliability.

After one bounded tuning pass, rerun lint, unit/component tests, the production build, the three science journeys, Chromium direct-touch tests, WebKit iPad checks, and the 60-second soak. Update `CURRENT_STATUS.md` with exact evidence. Production promotion still requires Keyur's separate explicit approval.
