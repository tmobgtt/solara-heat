// Pedestrians: they stroll the sidewalks, panic and flee from gunfire and reckless cars, get back
// up or stay down when hit, and a driver whose car is stolen climbs out and runs for it.
import { PITCH } from './config.js';
import { clamp, lerpAngle } from './random.js';
import { ROAD_W, collideBuildings } from './city.js';

const SHIRTS = ['#d96b4a', '#4a90d9', '#e8e3d5', '#69a85b', '#b04a7a', '#e0b13c', '#5a6b7d'];
let nextPedId = 1;
export function makePed(x, y, random, opts) {
  return Object.assign({
    id: nextPedId++, x, y, angle: random.range(0, Math.PI * 2), speed: 0, health: 100, dead: false,
    state: 'walk', panic: 0, cop: false, enemy: false, driverOf: null, shirt: random.pick(SHIRTS),
    waypoint: null, shootCd: 0, hitFlash: 0,
  }, opts || {});
}
export function spawnPedestrians(city, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const gx = random.int(0, 8), gy = random.int(0, 7);
    const x = gx * PITCH + ROAD_W + random.range(6, 220), y = gy * PITCH + random.range(6, 300);
    peds.push(makePed(x, y, random));
  }
  return peds;
}
export function scarePedsNear(peds, x, y, radius) {
  for (const p of peds) {
    if (p.dead || p.cop || p.enemy) continue;
    if (Math.hypot(p.x - x, p.y - y) < radius) { p.state = 'flee'; p.panic = 2.5; p.fleeFrom = { x, y }; }
  }
}
export function stepPedestrian(ped, dt, world) {
  if (ped.dead) return;
  if (ped.hitFlash > 0) ped.hitFlash -= dt;
  let targetSpeed = 0;
  if (ped.state === 'flee') {
    ped.panic -= dt;
    const from = ped.fleeFrom || world.player;
    ped.angle = lerpAngle(ped.angle, Math.atan2(ped.y - from.y, ped.x - from.x), clamp(dt * 6, 0, 1));
    targetSpeed = 185;
    if (ped.panic <= 0) ped.state = 'walk';
  } else if (ped.cop || ped.enemy) {
    const d = Math.hypot(world.player.x - ped.x, world.player.y - ped.y);
    const want = ped.enemy ? 150 : 120;
    if (d > want + 30) { ped.angle = lerpAngle(ped.angle, Math.atan2(world.player.y - ped.y, world.player.x - ped.x), clamp(dt * 5, 0, 1)); targetSpeed = 130; }
    else if (d < want - 40) { ped.angle = lerpAngle(ped.angle, Math.atan2(ped.y - world.player.y, ped.x - world.player.x), clamp(dt * 5, 0, 1)); targetSpeed = 90; }
    else ped.angle = Math.atan2(world.player.y - ped.y, world.player.x - ped.x);
  } else {
    if (!ped.waypoint || Math.hypot(ped.waypoint.x - ped.x, ped.waypoint.y - ped.y) < 14) {
      ped.waypoint = { x: ped.x + world.random.range(-190, 190), y: ped.y + world.random.range(-190, 190) };
    }
    ped.angle = lerpAngle(ped.angle, Math.atan2(ped.waypoint.y - ped.y, ped.waypoint.x - ped.x), clamp(dt * 3, 0, 1));
    targetSpeed = 62;
  }
  ped.speed += clamp(targetSpeed - ped.speed, -300 * dt, 300 * dt);
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  ped.x = clamp(ped.x, 14, world.city.width - 14);
  ped.y = clamp(ped.y, 14, world.city.height - 14);
  collideBuildings(world.city, ped, 10);
}
export function ejectDriver(world, car) {
  if (!car.driver) return;
  const ped = makePed(car.x + 22, car.y + 10, world.random, { state: 'flee', panic: 3, fleeFrom: { x: world.player.x, y: world.player.y } });
  world.peds.push(ped);
  car.driver = null;
}
