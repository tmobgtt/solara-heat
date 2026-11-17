// Cars: seven types with their own stats and colours — including the heavy hauler, a slow wide
// truck that blocks lanes and wallows through corners — arcade physics with drift and damage smoke,
// parked cars to steal, and traffic AI that follows the road grid and mostly obeys it.
import { PITCH } from './config.js';
import { clamp, lerpAngle } from './random.js';
import { ROAD_W, collideBuildings, roadCentreX, roadCentreY } from './city.js';

export const CAR_TYPES = {
  compact: { w: 34, h: 18, accel: 260, top: 300, grip: 3.4, turn: 2.1, colors: ['#c94f42', '#4a7fc9', '#e0e0e0', '#5aa469'] },
  sedan: { w: 38, h: 19, accel: 300, top: 340, grip: 3.2, turn: 2.1, colors: ['#33404f', '#8a8f98', '#20242c', '#7a4a3a'] },
  taxi: { w: 38, h: 19, accel: 300, top: 330, grip: 3.2, turn: 2.1, colors: ['#f2b234'] },
  truck: { w: 48, h: 22, accel: 200, top: 260, grip: 2.6, turn: 1.5, colors: ['#6b7c8c', '#96604a'] },
  hauler: { w: 62, h: 25, accel: 150, top: 215, grip: 2.2, turn: 1.05, colors: ['#8c4a2f', '#4a5a6b', '#6b6f4a'] },
  sports: { w: 38, h: 18, accel: 460, top: 470, grip: 3.8, turn: 2.1, colors: ['#e8b10e', '#c9202e', '#18b5a6'] },
  police: { w: 38, h: 19, accel: 420, top: 430, grip: 3.6, turn: 2.1, colors: ['#eef1f5'] },
};
export const HEAVY_TYPES = ['truck', 'hauler'];
export function isHeavy(car) { return HEAVY_TYPES.includes(car.type); }
let nextCarId = 1;
export function makeCar(type, x, y, angle, random, opts) {
  const t = CAR_TYPES[type];
  return Object.assign({
    id: nextCarId++, type, x, y, angle, speed: 0, steer: 0, w: t.w, h: t.h, color: random.pick(t.colors),
    health: 100, parked: false, driver: null, police: type === 'police', traffic: false, occupied: false,
    ai: { dirx: Math.cos(angle), diry: Math.sin(angle), pause: 0, targetSpeed: 0 }, smoke: 0, dead: false,
  }, opts || {});
}
export function spawnParkedCars(city, random, count) {
  const cars = [];
  const types = ['compact', 'sedan', 'taxi', 'truck', 'sports', 'compact', 'sedan', 'hauler'];
  for (let i = 0; i < count; i += 1) {
    const vertical = random.chance(0.5);
    const gx = random.int(0, 8), gy = random.int(0, 7);
    const x = vertical ? roadCentreX(gx) + (random.chance(0.5) ? -26 : 26) : random.range(gx * PITCH, gx * PITCH + PITCH);
    const y = vertical ? random.range(gy * PITCH, gy * PITCH + PITCH) : roadCentreY(gy) + (random.chance(0.5) ? -26 : 26);
    cars.push(makeCar(random.pick(types), x, y, vertical ? Math.PI / 2 : 0, random, { parked: true }));
  }
  return cars;
}
export function stepCarPhysics(car, dt, throttle, steer, handbrake) {
  const t = CAR_TYPES[car.type];
  car.speed += throttle * t.accel * dt;
  car.speed -= car.speed * (handbrake ? 1.6 : 0.45) * dt;
  car.speed = clamp(car.speed, -t.top * 0.4, t.top);
  if (Math.abs(car.speed) > 4) {
    const turn = steer * t.turn * (car.speed > 0 ? 1 : -1);
    car.angle += turn * dt * clamp(Math.abs(car.speed) / 120, 0.3, 1);
    if (handbrake) car.angle += steer * 1.1 * dt * Math.sign(car.speed);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.drifting = handbrake && Math.abs(car.speed) > 90;
  car.smoke = car.health < 45 ? (car.smoke + dt) : 0;
}
export function stepTrafficCar(car, dt, world) {
  const ai = car.ai;
  if (ai.pause > 0) { ai.pause -= dt; car.speed *= Math.max(0, 1 - 5 * dt); moveCar(car, dt, world); return; }
  const lookX = car.x + ai.dirx * 90, lookY = car.y + ai.diry * 90;
  const atJunction = (Math.abs(((lookX % PITCH) + PITCH) % PITCH - ROAD_W / 2) < 46) && (Math.abs(((lookY % PITCH) + PITCH) % PITCH - ROAD_W / 2) < 46);
  if (atJunction && !ai.turned) {
    ai.turned = true;
    if (world.random.chance(0.3)) {
      const left = world.random.chance(0.5);
      const dx = ai.dirx, dy = ai.diry;
      ai.dirx = left ? dy : -dy; ai.diry = left ? -dx : dx;
      if (world.random.chance(0.25)) ai.pause = world.random.range(0.4, 1.2);
    }
  }
  if (!atJunction) ai.turned = false;
  // simple avoidance: slow down if a car or the player is right ahead
  let blocked = false;
  for (const other of world.cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x, dy = other.y - car.y;
    if (dx * ai.dirx + dy * ai.diry > 0 && Math.hypot(dx, dy) < 52) { blocked = true; break; }
  }
  const target = blocked ? 0 : Math.min(150, CAR_TYPES[car.type].top * 0.55);
  car.speed += clamp(target - car.speed, -260 * dt, 130 * dt);
  const want = Math.atan2(ai.diry, ai.dirx);
  car.angle = lerpAngle(car.angle, want, clamp(dt * 3.2, 0, 1));
  moveCar(car, dt, world);
}
export function moveCar(car, dt, world) {
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 24, world.city.width - 24);
  car.y = clamp(car.y, 24, world.city.height - 24);
  const before = { x: car.x, y: car.y };
  if (collideBuildings(world.city, car, car.type === 'hauler' ? 23 : 17)) { car.x = before.x; car.y = before.y; car.speed *= -0.25; car.health -= 2; }
}
