// The law in Solara: ground units that hunt the player, and, from four stars,
// a helicopter that orbits overhead. While any officer — or the helicopter's
// spotlight — can see the player, wanted heat cannot decay.

import { COP_TOP, HELI_CRUISE, HELI_SEEN_RANGE, STAR_HEAT } from './config.js';
import { buildingAt, makeCar } from './world.js';

// How many stars a heat level earns.
export function starsForHeat(heat) {
  let stars = 0;
  for (const level of STAR_HEAT) if (heat >= level) stars++;
  return stars;
}

// Line of sight: a building between watcher and player breaks it.
export function canSee(world, ax, ay, bx, by) {
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (buildingAt(world, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// The police force attached to a game state: units, the helicopter, timers.
export function createPolice() {
  return {
    units: [],
    heli: { active: false, x: 0, y: 0, angle: 0, orbit: 0, rotor: 0 },
    bustTimer: 0,
    seen: false,
  };
}

// How many ground units a star level fields.
function wantedUnits(stars) {
  return stars <= 0 ? 0 : Math.min(2 + stars, 7);
}

// Keep the force the size the wanted level demands; new units roll in from
// the nearest road edge, a few hundred pixels out.
export function updatePolice(state, dt) {
  const { police, player } = state;
  const stars = state.stars;
  const want = wantedUnits(stars);
  while (police.units.length < want) {
    const a = state.rng.range(0, Math.PI * 2);
    const d = state.rng.range(520, 640);
    const car = makeCar('sedan', player.x + Math.cos(a) * d, player.y + Math.sin(a) * d, a, '#e8ecf4');
    car.driver = 'police';
    car.police = true;
    police.units.push(car);
  }
  if (police.units.length > want) police.units.length = want;

  // Ground units: chase the player's position, or where it was last seen.
  let seen = false;
  for (const unit of police.units) {
    const dx = player.x - unit.x;
    const dy = player.y - unit.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 620 && canSee(state.world, unit.x, unit.y, player.x, player.y)) {
      unit.lastSeen = { x: player.x, y: player.y };
      if (dist < 460) seen = true;
    }
    const target = unit.lastSeen ?? player;
    const tdx = target.x - unit.x;
    const tdy = target.y - unit.y;
    const tdist = Math.hypot(tdx, tdy) || 1;
    const wantAngle = Math.atan2(tdy, tdx);
    let turn = wantAngle - unit.angle;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    unit.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, turn));
    const top = COP_TOP * (tdist > 260 ? 1 : 0.55);
    unit.speed = Math.min(top, unit.speed + 300 * dt);
    unit.x += Math.cos(unit.angle) * unit.speed * dt;
    unit.y += Math.sin(unit.angle) * unit.speed * dt;
    if (buildingAt(state.world, unit.x, unit.y)) {
      unit.x -= Math.cos(unit.angle) * unit.speed * dt;
      unit.y -= Math.sin(unit.angle) * unit.speed * dt;
      unit.speed *= 0.4;
    }
  }

  // The helicopter: launches at four stars, orbits the player, and its
  // spotlight counts the player as seen inside HELI_SEEN_RANGE.
  const heli = police.heli;
  if (stars >= 4) {
    if (!heli.active) {
      heli.active = true;
      heli.x = player.x - 700;
      heli.y = player.y - 700;
    }
    heli.orbit += dt * 0.55;
    const ox = player.x + Math.cos(heli.orbit) * 190;
    const oy = player.y + Math.sin(heli.orbit) * 190;
    const dx = ox - heli.x;
    const dy = oy - heli.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, HELI_CRUISE * dt);
    heli.x += (dx / dist) * step;
    heli.y += (dy / dist) * step;
    heli.angle = Math.atan2(player.y - heli.y, player.x - heli.x);
    heli.rotor += dt * 40;
    if (Math.hypot(player.x - heli.x, player.y - heli.y) < HELI_SEEN_RANGE) seen = true;
  } else if (heli.active) {
    // Heat is gone: air support peels away and is stood down.
    heli.x -= 340 * dt;
    heli.y -= 340 * dt;
    if (Math.hypot(player.x - heli.x, player.y - heli.y) > 900) heli.active = false;
  }

  police.seen = seen;

  // Bust: a slow or stopped player with a unit alongside is arrested.
  const playerSpeed = player.car ? Math.abs(player.car.speed) : 0;
  const nearUnit = police.units.some((u) => Math.hypot(u.x - player.x, u.y - player.y) < 64);
  if (stars > 0 && nearUnit && playerSpeed < 26) {
    police.bustTimer += dt;
    if (police.bustTimer > 2.6) state.busted = true;
  } else {
    police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
  }
}
