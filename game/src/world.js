// The World: builds Solara City, spawns traffic, parked cars and pedestrians, holds every piece of
// state, and steps the whole simulation — driving, walking, stealing, police, combat and missions.
import { PLAYER, WORLD_H, WORLD_W } from './config.js';
import { clamp } from './random.js';
import { generateCity, collideBuildings, roadCentreX, roadCentreY } from './city.js';
import { makeCar, spawnParkedCars, stepCarPhysics, stepTrafficCar, isHeavy } from './vehicles.js';
import { makePed, spawnPedestrians, stepPedestrian, scarePedsNear, ejectDriver } from './pedestrians.js';
import { createPoliceState, commitCrime, stepPolice, clearHeat, starsForHeat } from './police.js';
import { createCombatState, stepCombat, damagePlayerImpl } from './combat.js';
import { createMissions } from './missions.js';
import { saveGame } from './save.js';

export function createWorld(random, audio) {
  const city = generateCity(random);
  const world = {
    random, audio: audio || null, city, time: 0, clockMinutes: 9 * 60,
    player: { x: city.garage.x - 60, y: city.garage.y + 70, angle: 0, vx: 0, vy: 0, health: 100, armour: 0, cash: 120, car: null, weapon: 'fists', ammo: 0 },
    cars: [], peds: [], police: createPoliceState(), combat: createCombatState(),
    stats: { crimes: 0, kills: 0, missionsDone: 0, carsStolen: 0, distance: 0 },
    events: { busted: false, wasted: false, storyComplete: false },
    message: '', messageT: 0, dialogue: null, skids: [], effects: [], hitCd: 0,
  };
  world.commitCrime = (kind) => commitCrime(world, kind);
  world.damagePlayer = (dmg) => damagePlayerImpl(world, dmg);
  world.addCash = (n) => { world.player.cash += n; if (world.audio && n > 0) world.audio.money(); };
  world.setHeat = (heat) => { world.police.heat = heat; world.police.stars = starsForHeat(heat); };
  world.autosave = () => { try { saveGame(world); } catch { /* storage off */ } };
  world.missions = createMissions(world);

  const trafficTypes = ['compact', 'sedan', 'taxi', 'truck', 'compact', 'sedan', 'hauler', 'compact'];
  for (let i = 0; i < 16; i += 1) {
    const vertical = random.chance(0.5);
    const gx = random.int(0, 8), gy = random.int(0, 7);
    const x = vertical ? roadCentreX(gx) + (random.chance(0.5) ? -20 : 20) : random.range(60, WORLD_W - 800);
    const y = vertical ? random.range(60, WORLD_H - 60) : roadCentreY(gy) + (random.chance(0.5) ? -20 : 20);
    const car = makeCar(random.pick(trafficTypes), x, y, vertical ? Math.PI / 2 : 0, random, { traffic: true, driver: { name: 'driver' } });
    car.ai.dirx = Math.cos(car.angle); car.ai.diry = Math.sin(car.angle);
    world.cars.push(car);
  }
  world.cars.push(...spawnParkedCars(city, random, 24));
  world.peds.push(...spawnPedestrians(city, random, 38));

  function nearestCar(x, y, maxD) {
    let best = null, bd = maxD;
    for (const car of world.cars) { if (car.dead) continue; const d = Math.hypot(car.x - x, car.y - y); if (d < bd) { bd = d; best = car; } }
    return best;
  }
  world.nearestCar = nearestCar;

  function tryInteract() {
    const player = world.player;
    if (player.car) {
      const car = player.car;
      player.car = null; car.occupied = false;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
      if (world.audio) world.audio.enterCar();
      return;
    }
    const car = nearestCar(player.x, player.y, 48);
    if (!car) return;
    const hadDriver = !!car.driver;
    if (hadDriver) { ejectDriver(world, car); world.commitCrime('steal'); }
    else if (world.peds.some((p) => !p.dead && Math.hypot(p.x - car.x, p.y - car.y) < 160)) world.commitCrime('steal');
    if (isHeavy(car)) world.commitCrime('steal'); // grand theft hauler: twice the noise, twice the heat
    car.parked = false; car.traffic = false; car.occupied = true;
    player.car = car;
    world.stats.carsStolen += 1;
    if (world.audio) world.audio.enterCar();
    world.message = car.type === 'hauler'
      ? 'Driving the hauler. It is slow, wide and wallows in corners — mind the traffic.'
      : 'Driving the ' + car.type + '. WASD to drive, E to get out.';
  }

  function stepOnFoot(dt, input, aimWorld) {
    const player = world.player;
    const speed = input.sprint ? 235 : PLAYER.walk;
    let mx = input.moveX, my = input.moveY;
    const len = Math.hypot(mx, my) || 1;
    player.vx = (mx / len) * speed * (mx || my ? 1 : 0);
    player.vy = (my / len) * speed * (mx || my ? 1 : 0);
    player.x += player.vx * dt; player.y += player.vy * dt;
    if (mx || my) player.angle = Math.atan2(my, mx);
    else if (aimWorld) player.angle = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
    player.x = clamp(player.x, 14, WORLD_W - 14); player.y = clamp(player.y, 14, WORLD_H - 14);
    collideBuildings(city, player, PLAYER.radius);
    world.stats.distance += Math.hypot(player.vx, player.vy) * dt;
  }
  function stepDriving(dt, input) {
    const player = world.player, car = player.car;
    const throttle = -input.moveY;
    const steer = input.moveX;
    const before = { x: car.x, y: car.y };
    stepCarPhysics(car, dt, throttle, steer, input.handbrake);
    car.x = clamp(car.x, 24, WORLD_W - 24); car.y = clamp(car.y, 24, WORLD_H - 24);
    if (collideBuildings(city, car, car.type === 'hauler' ? 23 : 17)) { car.x = before.x; car.y = before.y; if (Math.abs(car.speed) > 120) { car.health -= 6; world.damagePlayer(2); } car.speed *= -0.2; }
    player.x = car.x; player.y = car.y; player.angle = car.angle;
    world.stats.distance += Math.abs(car.speed) * dt;
    if (car.drifting && world.skids.length < 500) world.skids.push({ x: car.x, y: car.y, a: car.angle, t: 14 });
    // car-car bumps
    for (const other of world.cars) {
      if (other === car || other.dead) continue;
      const d = Math.hypot(other.x - car.x, other.y - car.y);
      if (d < 34 && d > 0) {
        const push = (34 - d) / 2, ux = (other.x - car.x) / d, uy = (other.y - car.y) / d;
        other.x += ux * push; other.y += uy * push;
        if (Math.abs(car.speed) > 90 && world.hitCd <= 0) { world.hitCd = 0.8; other.health -= 8; car.health -= 4; world.commitCrime(other.police ? 'copCar' : 'hitCar'); if (world.audio) world.audio.punch(); }
        car.speed *= 0.82;
      }
    }
    // running people down is very illegal
    if (Math.abs(car.speed) > 55) {
      for (const ped of world.peds) {
        if (ped.dead) continue;
        if (Math.hypot(ped.x - car.x, ped.y - car.y) < 20) {
          ped.health -= Math.abs(car.speed) * 0.45;
          ped.hitFlash = 0.2;
          if (ped.health <= 0) { ped.dead = true; world.stats.kills += 1; world.commitCrime('killPed'); }
          else { world.commitCrime('hitPed'); ped.state = 'flee'; ped.panic = 3; ped.fleeFrom = { x: car.x, y: car.y }; }
          car.speed *= 0.9;
        }
      }
    }
    if (car.health <= 0 && !car.dead) { car.dead = true; player.car = null; car.occupied = false; world.message = 'The car is wrecked!'; world.damagePlayer(8); }
  }

  world.step = function step(dt, input, aimWorld) {
    world.time += dt;
    world.clockMinutes = (world.clockMinutes + dt * 0.5) % (24 * 60);
    if (world.messageT > 0) world.messageT -= dt;
    if (world.dialogue && world.dialogue.t > 0) world.dialogue.t -= dt;
    if (world.hitCd > 0) world.hitCd -= dt;
    if (input.interact) tryInteract();
    if (world.player.car) stepDriving(dt, input); else stepOnFoot(dt, input, aimWorld);
    for (const car of world.cars) if (car.traffic && !car.dead && !car.occupied) stepTrafficCar(car, dt, world);
    for (const ped of world.peds) stepPedestrian(ped, dt, world);
    stepPolice(world, dt);
    stepCombat(world, dt, input, aimWorld || world.player);
    world.missions.update(dt);
    // damage smoke puffs
    for (const car of world.cars) {
      if (!car.dead && car.health < 45 && world.random.chance(0.3)) world.effects.push({ x: car.x, y: car.y - 8, vy: -22, life: 0.9, kind: 'smoke' });
    }
    for (let i = world.effects.length - 1; i >= 0; i -= 1) { const e = world.effects[i]; e.life -= dt; e.y += e.vy * dt; if (e.life <= 0) world.effects.splice(i, 1); }
    for (let i = world.skids.length - 1; i >= 0; i -= 1) { world.skids[i].t -= dt; if (world.skids[i].t <= 0) world.skids.splice(i, 1); }
    if (world.audio) {
      world.audio.setEngine(!!world.player.car, world.player.car ? world.player.car.speed / 400 : 0);
      world.audio.setSiren(world.police.stars > 0);
      world.audio.updateMusic(dt, true);
    }
  };
  world.respawn = function respawn(kind) {
    const player = world.player;
    player.car = null;
    for (const car of world.cars) car.occupied = false;
    player.x = city.hospital.x; player.y = city.hospital.y;
    player.health = 100;
    const fine = kind === 'busted' ? (1 + world.police.stars) * 120 : 150;
    player.cash = Math.max(0, player.cash - fine);
    clearHeat(world);
    world.cars = world.cars.filter((c) => !c.police);
    world.peds = world.peds.filter((p) => !p.cop);
    world.events.busted = false; world.events.wasted = false;
    world.message = (kind === 'busted' ? 'Busted! The police take $' : 'Wasted! Hospital bill $') + fine + '.';
    world.messageT = 5;
  };
  world.say = (who, text) => { world.dialogue = { who, text, t: 6 }; };
  Object.defineProperty(world, 'message', {
    get() { return world._message; },
    set(v) { world._message = v; world.messageT = 5; },
  });
  world._message = 'Welcome to Solara City, Marco. Vera is waiting at her garage — follow the gold marker.';
  world.messageT = 8;
  return world;
}
export { starsForHeat };
