# Solara Heat v3 — build log

Base: v2 @ 1b9a87235e149e6f0cc8a0ef6836aab9b8c1a79a (the version the T-1 guard was
armed to submit), cloned exactly into gta6-build-v3/. Goal: close the concrete
gaps the gta6-01 judging criteria expose, measured against the live dev field on
2026-11-19 (5,317 entries; the top dev cluster sits at judge 993,343 with titles
advertising 7–15 story missions and helicopter chases; our v1 stands at 984,522,
#1,752). The judge (z-ai/glm-5.3-flash, pairwise, both orders) reads a 1,536-token
dossier view: the screenshot contact sheet first, then a source outline. Criteria
in order: (1) complete open world shown in screenshots, (2) depth and fun,
(3) feel and polish, (4) look and originality, (5) source structure.

## Changes vs v2

### 1. Police helicopter (criterion 1 and 2: the response the top titles advertise)

- At 4 stars and up a helicopter joins the hunt (police.js): it launches from
  off-screen, shadows Marco on a slow orbit at a 305 cruise (a sports car at 470
  still outruns it), and while it holds him within 560 px he counts as seen, so
  heat cannot decay under the spotlight. Below 4 stars it peels away and is gone.
- render.js draws it over the night tint: spotlight pool on the street, offset
  shadow, dark fuselage with glass cockpit, spinning rotor disc, blinking red and
  green nav lights. It is in the chase screenshot, in frame, over the street.
- A step can now carry its own heat (`step.heat` in missions.js setupStep); the
  Marina Heist's hard-coded 120 moved onto its step unchanged.

### 2. Two more story jobs (criterion 2: six jobs was below the field's 7–15)

- **m7 Payback at the Port** ($1,800): meet at the Old Port, clear five of Dario's
  crew, report back to Vera's garage.
- **m8 One Last Sunset** ($2,500, the finale): steal the marked red sports car in
  The Hills, deliver it to the buyer at the Marina — the car is a police sting:
  delivery trips a 5-star `lose` step with the helicopter up.
- Title and City Conquered screens and the README now say eight jobs.

### 3. Chase screenshot restaged (criterion 1: systems density per frame)

- Five stars (heat 150) instead of four, two ground units on his tail, and the
  helicopter repositioned ahead of Marco late in the staging so the frame holds
  it mid-shot: 5 stars, minimap, objective with distance, dialogue, siren wash,
  headlight cones and the helicopter in one frame (3-chase.jpg, 113,811 B).
  The other three scenes are unchanged renders of the same staging as v2.

## Validation

Self-test (`?test=1&seed=7`, headless Chromium, via gta6-v2-tools/capture.mjs):
all 13 v2 checks still PASS, plus 7 new v3 checks, verbatim tail:

```
PASS story: eight jobs are defined
PASS helicopter: five stars launch air support that closes in
PASS helicopter: it stands down when the heat is gone
PASS mission 7 starts at the garage
PASS mission 7 completed by driving the objectives
PASS mission 8 starts after mission 7
PASS mission 8: the sting delivery trips a 5-star finale, then losing it completes the story
PASS all Solara Heat self-tests
```

(Two test-harness lessons from the first run, fixed in the test only, not the
game: heat set to 170 so decay over the probe window cannot drop the fifth star
mid-check, and the driver steps out of the car before the mission-7 teleports,
since a driver in a car is re-seated at the car's position every step.)

- Plain load: no uncaught console errors (capture.mjs load mode).
- Dossier: `MAKEFUN_OUTPUT_DIR=out node main.ts` runs clean; `out/dossier.json`
  = **724,019 bytes** (v2: 713,423; cap 1,572,864).
- Kit check (gta6-kit, `check --repo … --worktree`): **4 passed, 0 failed,
  16 skipped, 5 checked at submission** — identical shape to v2's passing run.
- Screenshots (all 1280×720, gate ≤ 262,144 B): 1-cover.jpg 106,241;
  2-drive.jpg 125,892; 3-chase.jpg 113,811; 4-mission.jpg 118,163.
- Save format unchanged (the helicopter lives in the police state, which the
  save snapshot does not carry; a loaded game simply has no helicopter until
  the heat next reaches four stars).

## For the parent (24 Nov guard)

- v3's authoring session is the 2026-11-19 top-10 optimization session (a
  subagent session of the main agent): the submission bundle must include it,
  as in the established multi-session bundle flow — its edits touch config.js,
  missions.js, police.js, render.js, shots.js and README.md, so
  `thinking_revised` and the `main.ts` authored-line position are as they were
  for v2 (main.ts itself is unchanged plumbing).
- Nothing was submitted by this build; the guard submits v3 at T-1.
