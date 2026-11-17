// The law: a heat score becomes 0-5 stars, police cars and (at high heat) foot officers spawn and
// give chase, heat decays while unseen, and standing still next to a cop at low speed gets Marco busted.
import { CRIMES, WANTED } from './config.js';
import { clamp, lerpAngle } from './random.js';
import { makeCar, moveCar } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { nearestRoadPoint } from './city.js';

export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) if (heat >= WANTED.thresholds[i]) stars = i;
  return stars;
}
export function createPoliceState() {
  return { heat: 0, stars: 0, seenTimer: 0, bustTimer: 0, spawnTimer: 0 };
}
export function commitCrime(world, kind) {
  const add = CRIMES[kind] || 0;
  if (add <= 0) return;
  world.police.heat = Math.min(170, world.police.heat + add);
  world.police.stars = starsForHeat(world.police.heat);
  world.stats.crimes += 1;
}
export function stepPolice(world, dt) {
  const pol = world.police, player = world.player;
  pol.stars = starsForHeat(pol.heat);
  // can any cop or camera-witness see the player?
  let seen = false;
  for (const car of world.cars) if (car.police && !car.dead && Math.hypot(car.x - player.x, car.y - player.y) < WANTED.sightRange) seen = true;
  for (const ped of world.peds) if (ped.cop && !ped.dead && Math.hypot(ped.x - player.x, ped.y - player.y) < WANTED.sightRange) seen = true;
  if (pol.stars > 0 && !seen) { pol.heat = Math.max(0, pol.heat - WANTED.decayPerSec * dt); pol.seenTimer = 0; }
  else if (seen) pol.seenTimer += dt;
  pol.spawnTimer -= dt;
  const wantCars = pol.stars >= 1 ? Math.min(1 + pol.stars, 6) : 0;
  const activeCars = world.cars.filter((c) => c.police && !c.dead).length;
  if (pol.spawnTimer <= 0 && activeCars < wantCars) {
    pol.spawnTimer = 1.6;
    const a = world.random.range(0, Math.PI * 2);
    const p = nearestRoadPoint(player.x + Math.cos(a) * 430, player.y + Math.sin(a) * 430);
    world.cars.push(makeCar('police', p.x, p.y, a + Math.PI, world.random, { traffic: false }));
    if (pol.stars >= 4 && world.peds.filter((p2) => p2.cop && !p2.dead).length < pol.stars - 2) {
      world.peds.push(makePed(player.x + Math.cos(a) * 200, player.y + Math.sin(a) * 200, world.random, { cop: true, shirt: '#2b4c9b' }));
    }
  }
  // chase: police cars steer at the player, foot cops handled by pedestrian AI + combat shooting
  for (const car of world.cars) {
    if (!car.police || car.dead || car.occupied) continue;
    const d = Math.hypot(player.x - car.x, player.y - car.y);
    const want = Math.atan2(player.y - car.y, player.x - car.x);
    car.angle = lerpAngle(car.angle, want, clamp(dt * 2.6, 0, 1));
    const target = d > 46 ? 400 : 60;
    car.speed += clamp(target - car.speed, -500 * dt, 320 * dt);
    moveCar(car, dt, world);
  }
  // busted: a cop on foot or in a stopped car stays adjacent while the player is slow
  const playerSpeed = player.car ? Math.abs(player.car.speed) : Math.hypot(player.vx || 0, player.vy || 0);
  let adjacent = false;
  if (pol.stars > 0 && playerSpeed < 40) {
    for (const ped of world.peds) if (ped.cop && !ped.dead && Math.hypot(ped.x - player.x, ped.y - player.y) < 40) adjacent = true;
    for (const car of world.cars) if (car.police && !car.dead && Math.hypot(car.x - player.x, car.y - player.y) < 52) adjacent = true;
  }
  pol.bustTimer = adjacent ? pol.bustTimer + dt : 0;
  if (pol.bustTimer > 1.6) world.events.busted = true;
}
export function clearHeat(world) { world.police.heat = 0; world.police.stars = 0; world.police.bustTimer = 0; }
