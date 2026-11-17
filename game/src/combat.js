// Combat: fists up close, a mouse-aimed pistol with bullets and muzzle flash, damage and death
// for pedestrians, rival crew and police, and the pistol pickup waiting at the Old Port stash.
import { clamp } from './random.js';
import { scarePedsNear } from './pedestrians.js';

export function createCombatState() {
  return { bullets: [], fireCd: 0, punchCd: 0, flash: 0, stashTaken: false };
}
export function tryPickupStash(world) {
  const c = world.combat, stash = world.city.stash;
  if (!c.stashTaken && Math.hypot(world.player.x - stash.x, world.player.y - stash.y) < 30) {
    c.stashTaken = true;
    world.player.weapon = 'pistol';
    world.player.ammo += 60;
    world.message = 'Picked up Vera\'s pistol and 60 rounds at the dock stash.';
    if (world.audio) world.audio.money();
    return true;
  }
  return false;
}
export function stepCombat(world, dt, input, aimWorld) {
  const c = world.combat, player = world.player;
  c.fireCd -= dt; c.punchCd -= dt; if (c.flash > 0) c.flash -= dt;
  if (player.car) return;
  tryPickupStash(world);
  const wantShoot = input.shoot;
  if (wantShoot && player.weapon === 'pistol' && player.ammo > 0 && c.fireCd <= 0) {
    c.fireCd = 0.24; player.ammo -= 1; c.flash = 0.05;
    const a = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
    player.angle = a;
    c.bullets.push({ x: player.x + Math.cos(a) * 16, y: player.y + Math.sin(a) * 16, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, life: 0.55, from: 'player' });
    if (world.audio) world.audio.shoot();
    world.commitCrime('shoot');
    scarePedsNear(world.peds, player.x, player.y, 210);
  } else if (wantShoot && c.punchCd <= 0 && c.fireCd <= 0) {
    // fists: swing at whatever is in front
    c.punchCd = 0.34; c.fireCd = 0.2;
    const a = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
    player.angle = a;
    if (world.audio) world.audio.punch();
    for (const ped of world.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - player.x, ped.y - player.y) < 34) hurtPed(world, ped, 34, a);
    }
  }
  // enemy and police gunfire
  for (const ped of world.peds) {
    if (ped.dead || (!ped.enemy && !ped.cop)) continue;
    ped.shootCd -= dt;
    const d = Math.hypot(player.x - ped.x, player.y - ped.y);
    const range = ped.enemy ? 240 : 210;
    if (d < range && ped.shootCd <= 0) {
      ped.shootCd = ped.enemy ? 0.9 : 1.15;
      const a = Math.atan2(player.y - ped.y, player.x - ped.x) + world.random.range(-0.09, 0.09);
      c.bullets.push({ x: ped.x, y: ped.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.5, from: 'enemy' });
      if (world.audio) world.audio.shoot();
    }
  }
  // bullets fly and hit
  for (let i = c.bullets.length - 1; i >= 0; i -= 1) {
    const b = c.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let gone = b.life <= 0;
    if (!gone && b.from === 'player') {
      for (const ped of world.peds) {
        if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 12) { hurtPed(world, ped, 42, Math.atan2(b.vy, b.vx)); gone = true; break; }
      }
      if (!gone) for (const car of world.cars) if (!car.dead && Math.hypot(car.x - b.x, car.y - b.y) < 20) { car.health -= 9; gone = true; break; }
    } else if (!gone && b.from === 'enemy') {
      const target = player.car || player;
      if (Math.hypot(target.x - b.x, target.y - b.y) < (player.car ? 22 : 12)) { world.damagePlayer(player.car ? 4 : 9); gone = true; }
    }
    if (gone) c.bullets.splice(i, 1);
  }
}
export function hurtPed(world, ped, dmg, angle) {
  ped.health -= dmg;
  ped.hitFlash = 0.15;
  ped.x += Math.cos(angle) * 6; ped.y += Math.sin(angle) * 6;
  if (ped.health <= 0 && !ped.dead) {
    ped.dead = true; ped.speed = 0;
    world.stats.kills += 1;
    if (!ped.enemy) world.commitCrime('killPed');
    if (world.missions) world.missions.onPedKilled(ped);
  } else if (!ped.enemy && !ped.cop) {
    ped.state = 'flee'; ped.panic = 3; ped.fleeFrom = { x: world.player.x, y: world.player.y };
  }
}
export function damagePlayerImpl(world, dmg) {
  const player = world.player;
  if (player.armour > 0) { const absorbed = Math.min(player.armour, dmg * 0.7); player.armour -= absorbed; dmg -= absorbed; }
  player.health = clamp(player.health - dmg, 0, 100);
  if (world.audio) world.audio.hurt();
  if (player.health <= 0) world.events.wasted = true;
}
