# solara-heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/tmobgtt/solara-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/tmobgtt/solara-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solara Heat** is an original top-down open-world crime game that runs in a
desktop browser from static files. No libraries, no assets, no network: the
city, its people and its story are generated in code from a seed, and the
same seed always builds the same Solara.

You are **Marco Vale**, a driver working for **Vera**, who runs a garage in
Solara Centro. The city has four districts — Solara Centro, The Hills, the
Marina and the Old Port — joined by a road grid with traffic, parked cars
and pedestrians, and a full day and night cycle: windows light up after
dark, lamps glow, headlights come on and sirens wash the street.

## The eight story jobs

1. **First Wheels** ($300) — bring a customer's sedan home to the garage.
2. **Hot Package** ($450) — take a case off the Marina docks and lose the tail.
3. **Hills Run** ($350) — steal a sports car and deliver it to a Hills villa.
4. **Port Noise** ($600) — clear Dario's crew out of the Old Port warehouse.
5. **Night Ledger** ($1,000) — run a ledger across the city at night.
6. **Marina Heist** ($1,500) — lift the case from the Marina vault and escape.
7. **Payback at the Port** ($1,800) — five of Dario's crew hold the Port. End it.
8. **One Last Sunset** ($2,500) — deliver the red sports car to a Marina buyer.
   The delivery is a police sting: it trips a five-star finale, and losing
   the heat completes the story.

Between jobs, free roam pays too: taxi fares, courier runs and street races
on the T, C and R keys.

## The law

Crimes raise wanted heat; heat earns stars (at 10 / 28 / 55 / 95 / 150).
Police cars hunt you and remember where they last saw you. From **four
stars a police helicopter** joins in: it orbits you at a cruise of 305, and
while you are inside its 560-pixel spotlight range you count as seen, so
your heat cannot decay — a sports car at 470 can outrun it, a sedan cannot
for long. Stand still beside a unit and the bust timer runs. Heat decays
only while nobody sees you.

## Controls

- **WASD / arrows** — walk and drive
- **F or E** — get in / out of a car (walking up to one steals it)
- **Space** — brake
- **T / C / R** — side jobs: taxi fare, courier run, street race
- **Enter** — start, and return to the garage after a bust or a wreck

Progress, cash and your car are saved in the browser and restored on the
next visit.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Hand the entry in (copies the game and screenshots to the output directory
and writes its dossier):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

A scripted self-test lives at `?test=1&seed=7`: it steals and drives a car,
raises the wanted level, completes the first, seventh and eighth story jobs
through the real objective logic, checks the helicopter launches at five
stars and stands down when the heat is gone, and round-trips a save. The
four screenshots are staged from the same simulation with
`?shot=cover|drive|chase|mission&seed=7`.

## Layout

- `game/index.html` — the page and its canvas.
- `game/src/` — one module per system: `config` (tuning), `random` (seeded
  city), `world` (city, cars, people), `missions` (the eight jobs),
  `police` (ground units and the helicopter), `input`, `save`, `render`
  (city, HUD, minimap), `shots` (screenshot staging), `selftest`, `main`.
- `main.ts` — the hand-in program that writes the dossier; `serve.ts` — the
  local server; `shots.json` — the screenshot list.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
