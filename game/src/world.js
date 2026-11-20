// Solara's city: a grid of blocks. Each block holds one building (or a merged
// landmark), the roads run between the blocks, and the streets are dressed
// with props, parked cars, moving traffic and people on foot.

import { BLOCK, CAR_TYPES, DISTRICTS, ROAD, WORLD } from './config.js';

const SIGNS = ['CAFE', 'BAR', 'GYM', 'DELI', 'CARS', 'INK', 'PIZZA', 'HOTEL', 'PAWN', 'SURF'];
const TRIMS = ['#e8b34b', '#4bc8e8', '#e86a8a', '#7ee84b', '#c9c9d4', '#e87f4b', '#9a7ee8'];
const SKINS = ['#f2c79b', '#d99e63', '#a96f3d', '#7a4a26', '#5b3a1e'];
const SHIRTS = ['#d94f4f', '#4f7ad9', '#4fd98a', '#d9c84f', '#b04fd9', '#e8e8e8', '#4fb8d9'];

// Which district a point falls in (the city is quartered).
export function districtAt(x, y) {
  const east = x >= WORLD / 2;
  const south = y >= WORLD / 2;
  if (!east && !south) return DISTRICTS[0];
  if (east && !south) return DISTRICTS[1];
  if (!east && south) return DISTRICTS[2];
  return DISTRICTS[3];
}

// The road band inside a block pitch: roads sit at the start of each pitch.
export function isRoadCoord(v) {
  const m = ((v % BLOCK) + BLOCK) % BLOCK;
  return m < ROAD;
}
export function onRoad(x, y) {
  return isRoadCoord(x) || isRoadCoord(y);
}

// Snap a coordinate to the centre line of the nearest road band.
export function roadCentre(v) {
  const base = Math.floor(v / BLOCK) * BLOCK;
  return base + ROAD / 2;
}

// Build the whole city from a seed. Pure data; the renderer draws it.
export function buildWorld(rng) {
  const buildings = [];
  const props = [];
  const n = WORLD / BLOCK; // blocks per side
  for (let by = 0; by < n; by++) {
    for (let bx = 0; bx < n; bx++) {
      const x0 = bx * BLOCK + ROAD;
      const y0 = by * BLOCK + ROAD;
      const w = BLOCK - ROAD;
      const district = districtAt(x0 + w / 2, y0 + w / 2);
      const roll = rng.next();
      let kind = 'block';
      if (district.name === 'Old Port') kind = 'warehouse';
      else if (district.name === 'The Hills') kind = rng.chance(0.72) ? 'house' : 'block';
      else if (roll < 0.34) kind = 'shop';
      else if (roll < 0.62) kind = 'tower';
      const floors = kind === 'tower' ? rng.int(7, 14) : kind === 'block' ? rng.int(3, 6) : rng.int(1, 2);
      const landmark = kind !== 'house' && kind !== 'warehouse' && rng.chance(0.16);
      buildings.push({
        x: x0 + 8, y: y0 + 8, w: w - 16, h: w - 16, kind, floors,
        sign: kind === 'shop' ? rng.pick(SIGNS) : null,
        trim: rng.pick(TRIMS), landmark,
        roof: rng.chance(0.5) ? rng.pick(['tank', 'ac', 'antenna']) : null,
        seed: rng.next(),
      });
      // Pavement dressing along the block's west edge.
      const propsHere = rng.int(1, 3);
      for (let i = 0; i < propsHere; i++) {
        props.push({
          x: x0 - 6, y: y0 + rng.range(10, w - 10),
          kind: rng.pick(['palm', 'lamp', 'hydrant', 'bench', 'dumpster', 'planter']),
        });
      }
      if (district.name === 'Marina' && by === n - 1) {
        props.push({ x: x0 + rng.range(20, w - 20), y: y0 + w - 2, kind: 'umbrella' });
      }
    }
  }
  return { buildings, props };
}

// A fresh car object of a type, at a place and heading.
export function makeCar(type, x, y, angle, colour) {
  const spec = CAR_TYPES[type];
  return {
    type, x, y, angle, speed: 0, w: spec.w, h: spec.h,
    colour, health: 100, driver: null, parked: false, marked: false,
  };
}

const CAR_COLOURS = ['#c23b2e', '#2e5fc2', '#3f9e4d', '#d9a441', '#7a4fd0', '#d8d8de', '#30303a', '#c26a2e'];

// Parked cars along the roads, ready to steal.
export function spawnParked(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    const lane = rng.int(0, WORLD / BLOCK - 1) * BLOCK + ROAD / 2;
    const along = rng.range(140, WORLD - 140);
    const type = rng.chance(0.14) ? 'truck' : rng.chance(0.1) ? 'hauler' : rng.chance(0.3) ? 'sports' : 'sedan';
    const car = makeCar(type, vertical ? lane + 24 : along, vertical ? along : lane + 24, vertical ? Math.PI / 2 : 0, rng.pick(CAR_COLOURS));
    car.parked = true;
    cars.push(car);
  }
  return cars;
}

// Moving traffic: cars that follow the road grid in lanes.
export function spawnTraffic(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    const laneIndex = rng.int(0, WORLD / BLOCK - 1);
    const lane = laneIndex * BLOCK + (vertical ? ROAD * 0.72 : ROAD * 0.28);
    const along = rng.range(0, WORLD);
    const type = rng.chance(0.08) ? 'hauler' : rng.chance(0.16) ? 'truck' : rng.chance(0.22) ? 'sports' : 'sedan';
    const car = makeCar(type, vertical ? lane : along, vertical ? along : lane, vertical ? Math.PI / 2 : 0, rng.pick(CAR_COLOURS));
    car.driver = 'traffic';
    car.laneVertical = vertical;
    car.laneDir = rng.chance(0.5) ? 1 : -1;
    cars.push(car);
  }
  return cars;
}

// Pedestrians on the pavements, each with a gait.
export function spawnPeds(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const gait = rng.chance(0.18) ? 'jogger' : rng.chance(0.2) ? 'elder' : 'walker';
    peds.push({
      x: rng.range(60, WORLD - 60), y: rng.range(60, WORLD - 60),
      angle: rng.range(0, Math.PI * 2),
      speed: gait === 'jogger' ? 92 : gait === 'elder' ? 26 : 48,
      skin: rng.pick(SKINS), shirt: rng.pick(SHIRTS), gait,
      turn: rng.range(0, 10),
    });
  }
  return peds;
}

// The building a point is inside, if any (for collision and cover).
export function buildingAt(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
