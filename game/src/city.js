// Solara City generation: a road grid of named districts, solid buildings, the beach and sea on
// the east edge, palms, lamps and props, plus the road-network and collision queries everyone uses.
import { BEACH_X, BLOCK, COLS, PALETTE, PITCH, ROAD, ROWS, TILE, WORLD_H, WORLD_W } from './config.js';

export const ROAD_W = ROAD * TILE; // 80 px of asphalt between building plots
export function roadCentreX(i) { return i * PITCH + ROAD_W / 2; }
export function roadCentreY(j) { return j * PITCH + ROAD_W / 2; }
export function districtAt(x, y) {
  if (x > BEACH_X) return 'Palm Beach';
  const names = [['The Hills', 'Midtown', 'Downtown'], ['Harbour View', 'Solara Centro', 'Downtown'], ['Old Port', 'Old Port', 'Marina']];
  const cx = Math.min(2, Math.floor(x / (WORLD_W / 3.4)));
  const cy = Math.min(2, Math.floor(y / (WORLD_H / 3)));
  return names[cy][cx];
}

export function generateCity(random) {
  const buildings = [], palms = [], lamps = [], props = [];
  for (let bx = 0; bx < COLS; bx += 1) {
    for (let by = 0; by < ROWS; by += 1) {
      const x0 = bx * PITCH + ROAD_W, y0 = by * PITCH + ROAD_W, size = BLOCK * TILE;
      const docks = by >= ROWS - 2 && bx < 3; // Old Port: low warehouses instead of towers
      const count = docks ? 2 : random.int(2, 4);
      for (let k = 0; k < count; k += 1) {
        const w = random.range(56, 100), h = random.range(56, 100);
        const x = x0 + 8 + (k % 2) * (size / 2) + random.range(0, 14);
        const y = y0 + 8 + Math.floor(k / 2) * (size / 2) + random.range(0, 14);
        buildings.push({ x, y, w: Math.min(w, size - (x - x0) - 8), h: Math.min(h, size - (y - y0) - 8), color: random.pick(PALETTE.roof), floors: docks ? 1 : random.int(2, 9), seed: random.next() });
      }
      for (let k = 0; k < 3; k += 1) if (random.chance(0.7)) palms.push({ x: x0 + random.range(4, size), y: y0 + random.range(4, size), s: random.range(0.8, 1.3) });
      lamps.push({ x: bx * PITCH + 6, y: by * PITCH + 6 });
    }
  }
  for (let y = 60; y < WORLD_H; y += 130) palms.push({ x: BEACH_X + random.range(10, 90), y, s: random.range(0.9, 1.4) });
  for (let i = 0; i < 26; i += 1) props.push({ x: random.range(90, WORLD_W - 760), y: random.range(90, WORLD_H - 90), kind: random.pick(['crate', 'bench', 'hydrant', 'bin']) });
  const hospital = { x: roadCentreX(4) + 60, y: roadCentreY(4) - 30 };
  const garage = { x: roadCentreX(2) + 70, y: roadCentreY(5) + 40 };
  const marinaOffice = { x: BEACH_X - 150, y: roadCentreY(6) };
  const stash = { x: roadCentreX(1) + 55, y: roadCentreY(ROWS - 1) + 55 };
  return { buildings, palms, lamps, props, hospital, garage, marinaOffice, stash, width: WORLD_W, height: WORLD_H };
}

export function isOnRoad(x, y) {
  const mx = ((x % PITCH) + PITCH) % PITCH, my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD_W || my < ROAD_W;
}
export function nearestRoadPoint(x, y) {
  const i = Math.round((x - ROAD_W / 2) / PITCH), j = Math.round((y - ROAD_W / 2) / PITCH);
  const cx = roadCentreX(Math.max(0, Math.min(COLS, i))), cy = roadCentreY(Math.max(0, Math.min(ROWS, j)));
  return Math.abs(cx - x) < Math.abs(cy - y) ? { x: cx, y } : { x, y: cy };
}
export function randomRoadPoint(random) {
  if (random.chance(0.5)) return { x: roadCentreX(random.int(0, COLS)), y: random.range(40, WORLD_H - 40) };
  return { x: random.range(40, WORLD_W - 720), y: roadCentreY(random.int(0, ROWS)) };
}
export function collideBuildings(city, pos, radius) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(b.x + b.w, pos.x)), ny = Math.max(b.y, Math.min(b.y + b.h, pos.y));
    const dx = pos.x - nx, dy = pos.y - ny, d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { pos.x = b.x - radius; continue; }
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * radius; pos.y = ny + (dy / d) * radius;
      return b;
    }
  }
  return null;
}
export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  return false;
}
