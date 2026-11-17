# Solara Heat v2 — build log

Base: v1 @ 67a55b1 (submission 01a1ea31-e024-7641-98e7-f84234ad76f2), cloned exactly into
gta6-build-v2/. Goal: polish-and-depth upgrade for a late Force_Last swap before the board
closes 2026-11-24T15:00Z. Nothing here is submitted by this build; the parent runs the
submission pipeline at T-1.

## Baseline (unmodified clone, verified before any change)
- Self-test (?test=1&seed=7, headless Chromium): 7 checks PASS + "PASS all Solara Heat
  self-tests", zero FAIL.
- Screenshot pipeline (serve.ts + headless Chromium + ffmpeg): reproduces all 4 v1 scenes
  at 1280x720 under the 256 KiB gate.
- Judge mechanics that shape the work: dossier-view at 1,536 tokens = one contact sheet of
  the 4 screenshots (cover first) + a source outline. Max 4 screenshots, each <= 262,144 B.
  So v2's new night-chase and marina-heist scenes REPLACE the day chase and dock-shootout
  shots; the cover becomes a denser downtown title vista.

## Changes vs v1

### 1. Screenshot set (all four scenes restaged, all viewed and iterated)

- **1-cover (title)**: dusk (17:48) instead of midday, a ring of eight extra traffic vehicles on
  the two roads through Marco's downtown junction (including a hauler and a truck) plus sixteen
  extra pedestrians, and the title veil lightened (0.72 → 0.38) so the city reads through it:
  shop signs (HOTEL, CAFE), a landmark tower block and moving traffic frame the panel.
- **2-drive**: late-morning light (10:30); the richer city dressing carries this frame (below).
- **3-chase**: now a four-star chase AT NIGHT (21:36) in a sports car, with two police units
  staged on his tail so the frame holds lit windows, lamp glow, headlight cones and red/blue
  siren spill. (First stagings caught the bust timer mid-countdown; the final staging outruns it.)
- **4-mission**: the dock shootout is replaced by the **Marina Heist escape** at night: grab the
  case, trip the heist response, run west in a sports car with two units behind, Vera's escape
  line on screen, "Lose the 4-star heat!" as the objective. Civilian traffic and corridor parked
  cars are cleared in staging so the run is decided by speed, not a random junction crash.

### 2. World richness

- **Buildings**: five kinds from the generator — towers (floors ≥ 7), shops (34%: trim awning +
  painted sign from a ten-sign list: CAFE, BAR, GYM, DELI, CARS, INK, PIZZA, HOTEL, PAWN, SURF),
  Hills houses (pitched-roof gable band), Old Port warehouses (corrugated ribs, skylight strip,
  loading door instead of the window grid), plain blocks; 16% of normal blocks merge into one
  landmark building; rooftop props on towers/blocks (water tank, AC unit, antenna with a red
  night blink); per-building trim colour.
- **Night dressing**: window lit fraction rises with darkness, lamps throw a warm radial glow,
  every moving car gets a headlight cone, police cars wash the street with alternating red/blue
  spill, antenna beacons blink.
- **Props**: beach umbrellas on the sand, dumpsters and planters join palms/lamps/hydrants/benches.
- **Pedestrians**: five skin tones, trousers under the shirt, hats, and three gaits (walkers,
  joggers at nearly double speed, elders ambling).
- **Heavy vehicle class**: the **hauler** (62×25 px, top speed 215 vs a sedan's 330, soft
  suspension) joins traffic and the parked pool, spawns rarely, blocks lanes, wallows in corners
  (per-type turn rates), and stealing one commits the crime twice (double heat). Two-tone cargo
  body in the renderer; trucks gained a cargo stripe.

### 3. Gameplay depth

- **Chop Shop (H)**: steal Vera's marked car (gold outline) and deliver it to the garage;
  $220 base + up to $180 scaled by the car's remaining health — a damage bonus that rewards a
  clean steal.
- **Street Series (G)**: a six-checkpoint street race ending at the garage, 240 s clock, $320.
- **Mission readability**: the objective line now carries race progress ("checkpoint N of M")
  and the distance to the target in metres on every step; free-roam text lists all five side-job
  keys (T/C/R/H/G, also on the title screen).
- **Balance**: payouts rebalanced across the board (story $300/$450/$350/$600/$1,000/$1,500,
  taxi $75, courier $110, race $200, chop $220+bonus, series $320); the wanted curve retuned
  (stars at 10/28/55/95/150 heat, decay 2.4/s); the Marina Heist's response is now honestly four
  stars (its text already promised a heavy response; heat 105 → 120).

### 4. Stability

- Self-test extended with six new checks (heavy class, building variety, chop shop start +
  end-to-end, street series start + end-to-end); all pass (below). No console errors on any
  staged URL.
- Save format unchanged (side counts ride the existing snapshot object); v1 saves still load.

## Validation

Self-test (`?test=1&seed=7`, headless Chromium, verbatim):

```
PASS spawn: city, traffic and pedestrians exist
PASS enter car: Marco can steal a parked car
PASS drive: the car moves under power
PASS wanted: a witnessed crime raises the wanted level
PASS mission 1 starts at Vera's garage
PASS mission 1 completed by driving the objectives
PASS save/load round-trip restores cash and progress
PASS heavy class: the hauler is slower than a sedan
PASS city variety: shops, houses and warehouses are generated
PASS chop shop side job starts
PASS chop shop delivery pays base plus damage bonus
PASS street series starts with seven points
PASS street series completes all checkpoints
PASS all Solara Heat self-tests
```

Console: `NO CONSOLE ERRORS` on the plain game URL and on ?shot=title|drive|chase|mission and
?test=1 (headless Chromium, stderr scan for CONSOLE error / Uncaught).

Dossier: `MAKEFUN_OUTPUT_DIR=out node main.ts` runs clean; `out/dossier.json` = **713,423 bytes**
(cap 1,572,864).

Kit check (`check --worktree`): **4 passed, 0 failed, 16 skipped, 5 checked at submission**
(the skipped/at-submission rows are the site's transcript and repo checks, identical in shape
to v1's passing run).

Final screenshot inventory (all 1280×720, gate ≤ 262,144 bytes):

| file | bytes | scene |
| --- | --- | --- |
| screenshots/1-cover.jpg | 105,972 | title over dusk rush-hour downtown |
| screenshots/2-drive.jpg | 125,892 | daylight drive, Solara Centro |
| screenshots/3-chase.jpg | 112,454 | four-star night chase, two units in frame |
| screenshots/4-mission.jpg | 118,163 | Marina Heist escape at night |

Verdict: READY — v2 keeps every v1 system, passes the same gates with a larger self-test, and
the dossier's contact sheet now leads with a dusk city full of traffic and signage and closes
with two night action frames (lit windows, headlights, sirens) instead of v1's flat midday set.
