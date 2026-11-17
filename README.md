# Solara Heat

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/tmobgtt/solara-heat/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/tmobgtt/solara-heat/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original top-down 2D open-world crime game for make.fun's **gta6-01**
campaign, built with vanilla JavaScript ES modules on a single canvas. No
libraries, no assets, no network requests: the city, the sound and the story
are all generated in code, and it runs offline from static files.

You are **Marco Reyes**, a wheelman working for fixer **Vera Calloway** in
**Solara City**, a sun-soaked coastal city of named districts — Downtown, the
Marina, the Old Port docks, Palm Beach and the Hills — with a beach and the
sea along its east edge.

## Features

- **A living city**: a seeded road grid with solid buildings of five kinds —
  towers with rooftop tanks and antennas, shops with awnings and signs,
  Hills houses with pitched roofs, Old Port warehouses with loading doors,
  plain blocks — plus sidewalks, palm trees, lamps, beach umbrellas and
  props, and a full day-night cycle: windows light up after dark, lamps
  glow, cars switch on headlights and police sirens wash the street.
- **Driving and stealing**: seven car types (compact, sedan, taxi, truck,
  the heavy **hauler**, sports, police) with arcade physics, drift, damage
  smoke and skid marks. The hauler is a second driving class: slow, wide,
  wallowing in corners, blocking lanes in traffic — and stealing one draws
  double heat. Any car can be stolen, parked or occupied; the driver climbs
  out and flees.
- **Traffic and pedestrians**: cars follow the road grid, pause at junctions
  and brake for each other; pedestrians — walkers, joggers and elders, all
  dressed differently — stroll, panic and run from trouble.
- **The law**: a 0–5 star wanted system fed by stealing, collisions, running
  people down and shooting. Police cars chase, foot officers arrive at high
  heat, heat decays out of sight, and you can be **busted** or **wasted** —
  either way you wake up at Solara General with a fine.
- **Combat**: fists and a mouse-aimed pistol (pick it up at the Old Port
  stash), with bullets, muzzle flash and rival crews who shoot back.
- **A six-mission story**: *First Run*, *Hot Wheels*, *Meter Running*,
  *Dockside Business*, *Marina Heist* and *Last Ride*, with dialogue banners,
  objective markers and payouts, ending in a **City Conquered** screen — plus
  five repeatable side jobs in free roam: taxi fares, courier runs,
  checkpoint races, **chop-shop deliveries** (bring the marked car back
  clean for a damage bonus) and the six-checkpoint **street series**.
- **HUD and minimap**: health and armour, cash, weapon and ammo, clock,
  wanted stars, the mission objective with its distance and race progress,
  dialogue, and a live minimap with the player, traffic, police, enemies
  and the objective marker.
- **Sound**: a WebAudio synth (no audio files) — engine, siren, gunshots,
  punches, money, mission jingles and a bassline loop. M mutes.
- **Saves**: progress, cash and position persist in localStorage, autosaved
  after every mission, with a Continue option on the title screen.

## Controls

- **WASD / arrows** — move and drive
- **E** — enter / exit / steal a car
- **Mouse** — aim · **Click or J** — shoot / punch
- **Shift** — sprint · **Space** — handbrake
- **Esc / P** — pause · **T / C / R / H / G** — side jobs (taxi / courier / race / chop shop / street series)

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

Screenshots are staged from the real simulation (`?shot=title|drive|chase|mission&seed=7`):
a dusk rush-hour title over downtown, a daylight drive, a four-star chase
after dark, and the Marina Heist escape at night. A scripted self-test runs
at `?test=1&seed=7`, reporting PASS/FAIL lines for spawning, stealing and
driving a car, the wanted system, completing mission 1 through the real
objective logic, a save/load round-trip, the heavy hauler class, the
generated building variety, and completing the chop-shop and street-series
side jobs end to end.

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
