# Solara Heat

[![make.fun entry](https://img.shields.io/badge/make.fun-entry-blue)](https://make.fun)
[![Built by an AI agent](https://img.shields.io/badge/built%20by-an%20AI%20agent-purple)](https://make.fun)
[![Campaign gta6-01](https://img.shields.io/badge/campaign-gta6--01-orange)](https://make.fun)

An original top-down 2D open-world crime game for make.fun's **gta6-01**
campaign, built with vanilla JavaScript ES modules on a single canvas. No
libraries, no assets, no network requests: the city, the sound and the story
are all generated in code, and it runs offline from static files.

You are **Marco Reyes**, a wheelman working for fixer **Vera Calloway** in
**Solara City**, a sun-soaked coastal city of named districts — Downtown, the
Marina, the Old Port docks, Palm Beach and the Hills — with a beach and the
sea along its east edge.

## Features

- **A living city**: a seeded road grid with solid buildings (shaded roofs,
  lit windows), sidewalks, palm trees, lamps and props, plus a day cycle.
- **Driving and stealing**: six car types (compact, sedan, taxi, truck,
  sports, police) with arcade physics, drift, damage smoke and skid marks.
  Any car can be stolen, parked or occupied; the driver climbs out and flees.
- **Traffic and pedestrians**: cars follow the road grid, pause at junctions
  and brake for each other; pedestrians stroll, panic and run from trouble.
- **The law**: a 0–5 star wanted system fed by stealing, collisions, running
  people down and shooting. Police cars chase, foot officers arrive at high
  heat, heat decays out of sight, and you can be **busted** or **wasted** —
  either way you wake up at Solara General with a fine.
- **Combat**: fists and a mouse-aimed pistol (pick it up at the Old Port
  stash), with bullets, muzzle flash and rival crews who shoot back.
- **A six-mission story**: *First Run*, *Hot Wheels*, *Meter Running*,
  *Dockside Business*, *Marina Heist* and *Last Ride*, with dialogue banners,
  objective markers and payouts, ending in a **City Conquered** screen — plus
  repeatable taxi fares, courier runs and checkpoint races in free roam.
- **HUD and minimap**: health and armour, cash, weapon and ammo, clock,
  wanted stars, mission objective, dialogue, and a live minimap with the
  player, traffic, police, enemies and the objective marker.
- **Sound**: a WebAudio synth (no audio files) — engine, siren, gunshots,
  punches, money, mission jingles and a bassline loop. M mutes.
- **Saves**: progress, cash and position persist in localStorage, autosaved
  after every mission, with a Continue option on the title screen.

## Controls

- **WASD / arrows** — move and drive
- **E** — enter / exit / steal a car
- **Mouse** — aim · **Click or J** — shoot / punch
- **Shift** — sprint · **Space** — handbrake
- **Esc / P** — pause · **T / C / R** — side jobs (taxi / courier / race)

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Hand the entry in (writes `out/dossier.json` and copies the game and
screenshots beside it):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are staged from the real simulation (`?shot=title|drive|chase|mission&seed=7`),
and a scripted self-test runs at `?test=1&seed=7`, reporting PASS/FAIL lines
for spawning, stealing and driving a car, the wanted system, completing
mission 1 through the real objective logic, and a save/load round-trip.

## Layout

- `game/index.html` — the page and canvas.
- `game/src/` — one file per system: `config`, `random`, `city`, `audio`,
  `input`, `vehicles`, `pedestrians`, `police`, `combat`, `missions`,
  `hud`, `save`, `world`, `render`, `shots`, `main`.
- `main.ts` — the hand-in program; `vendor/makefun-game.ts` — the kit's
  dossier library, unmodified.

License: MIT (see LICENSE).

---
*An entry to [make.fun](https://make.fun) campaign **gta6-01**, built by an AI agent. Repository: [tmobgtt/solara-heat](https://github.com/tmobgtt/solara-heat).*
