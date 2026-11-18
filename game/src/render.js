// Drawing: a camera that follows Marco over Solara City — roads, sidewalks, shaded buildings with
// lit windows, beach and sea, palms and props, cars, people, bullets and effects — plus the HUD,
// a day-cycle tint, and the title, pause, busted, wasted and story-complete screens.
import { BEACH_X, FONT, PALETTE, PITCH, SEA_X, WORLD_H, WORLD_W } from './config.js';
import { ROAD_W, districtAt } from './city.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_COMPLETE = 'complete';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720 };
  let darkF = 0; // 0 at noon, 1 at full night: drives lit windows, lamp glow and headlights
  function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    view.w = canvas.width; view.h = canvas.height;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawWorld(world, camX, camY) {
    const city = world.city;
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(camX - 20, camY - 20, view.w + 40, view.h + 40);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(BEACH_X, 0, SEA_X - BEACH_X + 40, WORLD_H);
    const seaGrad = ctx.createLinearGradient(SEA_X, 0, WORLD_W, 0);
    seaGrad.addColorStop(0, PALETTE.sea); seaGrad.addColorStop(1, PALETTE.seaDeep);
    ctx.fillStyle = seaGrad; ctx.fillRect(SEA_X, 0, WORLD_W - SEA_X + 40, WORLD_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let y = 40; y < WORLD_H; y += 90) { ctx.beginPath(); ctx.moveTo(SEA_X + 14 + Math.sin(world.time + y) * 6, y); ctx.lineTo(SEA_X + 74, y); ctx.stroke(); }
    // block plots (sidewalk) then roads over the gaps
    ctx.fillStyle = PALETTE.sidewalk;
    for (let bx = 0; bx * PITCH < WORLD_W; bx += 1) for (let by = 0; by * PITCH < WORLD_H; by += 1) ctx.fillRect(bx * PITCH + ROAD_W - 8, by * PITCH + ROAD_W - 8, PITCH - ROAD_W + 16, PITCH - ROAD_W + 16);
    ctx.fillStyle = PALETTE.road;
    for (let i = 0; i * PITCH <= WORLD_W; i += 1) ctx.fillRect(i * PITCH, 0, ROAD_W, WORLD_H);
    for (let j = 0; j * PITCH <= WORLD_H; j += 1) ctx.fillRect(0, j * PITCH, WORLD_W, ROAD_W);
    ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 2; ctx.setLineDash([16, 14]);
    for (let i = 0; i * PITCH <= WORLD_W; i += 1) { ctx.beginPath(); ctx.moveTo(i * PITCH + ROAD_W / 2, 0); ctx.lineTo(i * PITCH + ROAD_W / 2, WORLD_H); ctx.stroke(); }
    for (let j = 0; j * PITCH <= WORLD_H; j += 1) { ctx.beginPath(); ctx.moveTo(0, j * PITCH + ROAD_W / 2); ctx.lineTo(WORLD_W, j * PITCH + ROAD_W / 2); ctx.stroke(); }
    ctx.setLineDash([]);
    // skid marks
    ctx.fillStyle = 'rgba(20,20,20,0.4)';
    for (const s of world.skids) ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    // props, lamps, palms
    for (const pr of city.props) {
      if (pr.x < camX - 30 || pr.x > camX + view.w + 30 || pr.y < camY - 30 || pr.y > camY + view.h + 30) continue;
      if (pr.kind === 'umbrella') {
        ctx.fillStyle = pr.color || '#c9403a'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2); ctx.fill();
      } else if (pr.kind === 'dumpster') {
        ctx.fillStyle = '#39543f'; ctx.fillRect(pr.x - 9, pr.y - 6, 18, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(pr.x - 9, pr.y - 6, 18, 3);
      } else if (pr.kind === 'planter') {
        ctx.fillStyle = '#8a6a44'; ctx.fillRect(pr.x - 7, pr.y - 7, 14, 14);
        ctx.fillStyle = '#4d8a3f'; ctx.fillRect(pr.x - 5, pr.y - 5, 10, 10);
      } else { ctx.fillStyle = pr.kind === 'hydrant' ? '#c9403a' : pr.kind === 'bench' ? '#7a5c3e' : '#6b7c8c'; ctx.fillRect(pr.x - 5, pr.y - 5, 10, 10); }
    }
    for (const l of city.lamps) {
      if (l.x < camX - 40 || l.x > camX + view.w + 40 || l.y < camY - 40 || l.y > camY + view.h + 40) continue;
      ctx.fillStyle = '#3c4148'; ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
      if (darkF > 0.15) {
        const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 27);
        g.addColorStop(0, 'rgba(255,230,150,' + (0.4 * darkF).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, 27, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,230,150,0.5)'; ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const palm of city.palms) {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(palm.x - 2, palm.y - 2, 4, 4);
      ctx.strokeStyle = '#4d8a3f'; ctx.lineWidth = 2.4;
      for (let k = 0; k < 5; k += 1) { const a = (k / 5) * Math.PI * 2 + palm.s; ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + Math.cos(a) * 13 * palm.s, palm.y + Math.sin(a) * 13 * palm.s); ctx.stroke(); }
    }
    // buildings: walls, shaded roofs, then each kind's own dressing — shop awnings and signs,
    // warehouse ribs and loading doors, house gables, tower sheen — and rooftop props
    for (const b of city.buildings) {
      if (b.x > camX + view.w + 60 || b.x + b.w < camX - 60 || b.y > camY + view.h + 60 || b.y + b.h < camY - 60) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = PALETTE.wall; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 7);
      if (b.kind === 'house') {
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(b.x + 4, b.y + b.h / 2 - 3, b.w - 8, 6);
        ctx.fillStyle = b.trim; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 4); ctx.fillRect(b.x + 4, b.y + b.h - 8, b.w - 8, 4);
      }
      if (b.kind === 'warehouse') {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
        for (let lx = b.x + 16; lx < b.x + b.w - 8; lx += 14) { ctx.beginPath(); ctx.moveTo(lx, b.y + 5); ctx.lineTo(lx, b.y + b.h - 5); ctx.stroke(); }
        ctx.fillStyle = 'rgba(190,220,240,0.5)'; ctx.fillRect(b.x + 10, b.y + 9, b.w - 20, 6);
        ctx.fillStyle = 'rgba(20,24,30,0.55)'; ctx.fillRect(b.x + b.w / 2 - 13, b.y + b.h - 25, 26, 21);
      } else {
        // windows: the lit share climbs after dark, so the night city glows
        const cols = Math.floor(b.w / 17), rowsN = Math.floor(b.h / 17);
        const litMax = 2 + darkF * 2.2;
        for (let cx2 = 0; cx2 < cols; cx2 += 1) for (let cy2 = 0; cy2 < rowsN; cy2 += 1) {
          ctx.fillStyle = ((cx2 * 7 + cy2 * 13 + Math.floor(b.seed * 90)) % 5) < litMax ? 'rgba(255,224,130,0.9)' : 'rgba(30,40,60,0.75)';
          ctx.fillRect(b.x + 8 + cx2 * 17, b.y + 9 + cy2 * 17, 8, 9);
        }
      }
      if (b.kind === 'shop') {
        ctx.fillStyle = b.trim; ctx.fillRect(b.x + 4, b.y + b.h - 15, b.w - 8, 9);
        if (b.sign) { ctx.fillStyle = '#fff6da'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(b.sign, b.x + 7, b.y + 13); }
      }
      if (b.kind === 'tower') { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(b.x + 4, b.y + 4, 3, b.h - 8); }
      if (b.roofProp === 'tank') {
        ctx.fillStyle = '#7a5c3e'; ctx.fillRect(b.x + b.w - 25, b.y + 8, 13, 11);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b.x + b.w - 25, b.y + 17, 13, 2);
      } else if (b.roofProp === 'ac') {
        ctx.fillStyle = 'rgba(210,214,220,0.8)'; ctx.fillRect(b.x + 10, b.y + b.h - 20, 12, 9);
      } else if (b.roofProp === 'antenna') {
        ctx.strokeStyle = 'rgba(30,30,36,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x + 12, b.y + 16); ctx.lineTo(b.x + 12, b.y + 2); ctx.stroke();
        if (darkF > 0.3) { ctx.fillStyle = '#ff5040'; ctx.fillRect(b.x + 11, b.y + 1, 2, 2); }
      }
    }
    // landmarks
    landmark(city.hospital.x, city.hospital.y, '#eef1f5', '+', '#c9403a');
    landmark(city.garage.x, city.garage.y, '#3c4148', 'V', PALETTE.gold);
    landmark(city.stash.x, city.stash.y, '#6b543a', '$', '#ffe9a8');
    landmark(city.marinaOffice.x, city.marinaOffice.y, '#2e6b8a', 'M', '#ffffff');
    // mission marker beam
    const target = world.missions.currentTarget();
    if (target) {
      const bob = Math.sin(world.time * 4) * 6;
      ctx.fillStyle = 'rgba(242,201,76,0.25)'; ctx.fillRect(target.x - 13, target.y - 190, 26, 190);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.moveTo(target.x, target.y - 26 + bob); ctx.lineTo(target.x - 11, target.y - 46 + bob); ctx.lineTo(target.x + 11, target.y - 46 + bob); ctx.closePath(); ctx.fill();
    }
  }
  function landmark(x, y, bg, ch, fg) {
    ctx.fillStyle = bg; ctx.fillRect(x - 15, y - 15, 30, 30);
    ctx.fillStyle = fg; ctx.font = `bold 19px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(ch, x, y + 7);
  }
  function drawCar(car) {
    if (darkF > 0.2 && !car.dead) {
      // headlight cone spilling ahead of the car after dark, plus a siren wash for the law
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
      const grad = ctx.createLinearGradient(car.w / 2, 0, car.w / 2 + 95, 0);
      grad.addColorStop(0, 'rgba(255,240,180,' + (0.3 * darkF).toFixed(3) + ')'); grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(car.w / 2, -car.h / 2 + 2); ctx.lineTo(car.w / 2 + 95, -car.h / 2 - 13); ctx.lineTo(car.w / 2 + 95, car.h / 2 + 13); ctx.lineTo(car.w / 2, car.h / 2 - 2); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (car.police) {
        ctx.fillStyle = Math.floor(performance.now() / 300) % 2 ? 'rgba(255,64,64,' + (0.16 * darkF).toFixed(3) + ')' : 'rgba(64,122,255,' + (0.16 * darkF).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(car.x, car.y, 34, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
    ctx.fillStyle = car.dead ? '#2c2c2c' : car.color; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);
    if (car.type === 'hauler') {
      // pale cargo box behind, cab glass at the nose: the heavy class reads at a glance
      ctx.fillStyle = 'rgba(235,238,240,0.92)'; ctx.fillRect(-car.w / 2 + 2, -car.h / 2 + 2, car.w * 0.56, car.h - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-car.w / 2 + 2, -car.h / 2 + 2, car.w * 0.56, 3);
      ctx.fillStyle = 'rgba(20,28,40,0.9)'; ctx.fillRect(car.w / 2 - 13, -car.h / 2 + 3, 8, car.h - 6);
    } else {
      ctx.fillStyle = 'rgba(20,28,40,0.9)'; ctx.fillRect(-4, -car.h / 2 + 3, 13, car.h - 6);
      if (car.type === 'truck') { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 3, car.w * 0.45, car.h - 6); }
    }
    ctx.fillStyle = '#ffd76a'; ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 2, 3, 4); ctx.fillRect(car.w / 2 - 3, car.h / 2 - 6, 3, 4);
    if (car.type === 'taxi') { ctx.fillStyle = '#20242c'; ctx.fillRect(-8, -4, 12, 8); }
    if (car.police) {
      ctx.fillStyle = '#20242c'; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 5, car.w, 5);
      ctx.fillStyle = Math.floor(performance.now() / 300) % 2 ? '#ff4040' : '#407aff';
      ctx.fillRect(-3, -3, 6, 6);
    }
    if (car === world_markedCar(worldRef)) { ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2; ctx.strokeRect(-car.w / 2 - 3, -car.h / 2 - 3, car.w + 6, car.h + 6); }
    ctx.restore();
  }
  let worldRef = null;
  function world_markedCar(w) { return w && w.missions ? w.missions.state.markedCar : null; }
  function drawHeli(world, camX, camY) {
    const h = world.police.heli;
    if (!h) return;
    const x = h.x - camX, y = h.y - camY;
    if (x < -220 || x > view.w + 220 || y < -220 || y > view.h + 220) return;
    // the spotlight pool it holds on the street, then its shadow, then the aircraft itself,
    // lit and blinking, drawn over the night tint so the hunt reads at a glance
    const pool = ctx.createRadialGradient(x, y, 8, x, y, 128);
    pool.addColorStop(0, 'rgba(255,244,190,' + (0.1 + 0.16 * darkF).toFixed(3) + ')'); pool.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(x, y, 128, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x + 30, y + 38, 27, 10, h.angle, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(h.angle);
    ctx.fillStyle = 'rgba(190,200,214,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 0, 62, 7, h.rotor % Math.PI, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#232a33'; ctx.fillRect(-38, -3.4, 34, 6.8);
    ctx.fillRect(-46, -7, 5, 14);
    ctx.fillStyle = '#2e3947';
    ctx.beginPath(); ctx.ellipse(2, 0, 25, 10.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(170,215,245,0.9)'; ctx.beginPath(); ctx.ellipse(15, 0, 8.5, 6.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c94c'; ctx.fillRect(-8, -10.5, 15, 3.4);
    ctx.strokeStyle = 'rgba(20,24,30,0.85)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(12, 12); ctx.moveTo(-12, -12); ctx.lineTo(12, -12); ctx.stroke();
    const blink = Math.floor(performance.now() / 420) % 2 === 0;
    ctx.fillStyle = blink ? '#ff4040' : 'rgba(255,64,64,0.25)'; ctx.beginPath(); ctx.arc(-44, 0, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? 'rgba(64,255,140,0.25)' : '#40ff8c'; ctx.beginPath(); ctx.arc(2, -11.5, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawPed(ped) {
    ctx.save(); ctx.translate(ped.x, ped.y);
    if (ped.dead) { ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, ped.angle, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(2, 3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.pants || '#33404f'; ctx.beginPath(); ctx.arc(-3.5, 0, 7.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.hitFlash > 0 ? '#ff6a5e' : ped.shirt; ctx.beginPath(); ctx.arc(0.5, 0, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin || '#e8b88a'; ctx.beginPath(); ctx.arc(3.5, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    if (ped.hat) { ctx.fillStyle = ped.pants || '#33404f'; ctx.fillRect(0.5, -4.6, 7, 3.2); }
    if (ped.cop) { ctx.fillStyle = '#ffd23c'; ctx.fillRect(-6, -7, 4, 4); }
    if (ped.enemy) { ctx.fillStyle = '#ff5040'; ctx.fillRect(4, -8, 4, 4); }
    ctx.restore();
  }
  function drawPlayer(world) {
    const p = world.player;
    if (p.car) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(2, 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.player; ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20303f'; ctx.fillRect(2, -3, 9, 6);
    ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(3.5, 0, 5.2, 0, Math.PI * 2); ctx.fill();
    if (p.weapon === 'pistol') { ctx.fillStyle = '#22262c'; ctx.fillRect(9, -2, 10, 4); }
    ctx.restore();
    if (world.combat.flash > 0) { ctx.fillStyle = 'rgba(255,210,80,0.9)'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, 7, 0, Math.PI * 2); ctx.fill(); }
  }
  function panel(title, lines, prompt, veil) {
    ctx.fillStyle = 'rgba(6,8,12,' + (veil === undefined ? 0.72 : veil) + ')'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = 'rgba(14,17,24,0.95)'; const w = 660, h = 150 + lines.length * 30 + 70;
    ctx.fillRect((view.w - w) / 2, (view.h - h) / 2, w, h);
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2; ctx.strokeRect((view.w - w) / 2, (view.h - h) / 2, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.gold; ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(title, view.w / 2, (view.h - h) / 2 + 66);
    ctx.fillStyle = PALETTE.text; ctx.font = `17px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, view.w / 2, (view.h - h) / 2 + 116 + i * 30));
    ctx.fillStyle = '#ffe9a8'; ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(prompt, view.w / 2, (view.h + h) / 2 - 30);
  }
  function draw(world, screen, hasSaveFile) {
    worldRef = world;
    const hour = world.clockMinutes / 60;
    const darkness = hour < 6 || hour > 19 ? 0.34 : hour < 8 || hour > 17 ? 0.14 : 0;
    darkF = darkness / 0.34;
    world.district = districtAt(world.player.x, world.player.y);
    const camX = Math.max(0, Math.min(WORLD_W - view.w, world.player.x - view.w / 2));
    const camY = Math.max(0, Math.min(WORLD_H - view.h, world.player.y - view.h / 2));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#79a85b'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.save(); ctx.translate(-camX, -camY);
    drawWorld(world, camX, camY);
    for (const ped of world.peds) if (Math.abs(ped.x - world.player.x) < view.w && Math.abs(ped.y - world.player.y) < view.h) drawPed(ped);
    for (const car of world.cars) if (Math.abs(car.x - world.player.x) < view.w && Math.abs(car.y - world.player.y) < view.h) drawCar(car);
    drawPlayer(world);
    ctx.fillStyle = '#ffe27a';
    for (const b of world.combat.bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    for (const e of world.effects) { ctx.fillStyle = 'rgba(90,90,90,0.4)'; ctx.beginPath(); ctx.arc(e.x, e.y, 7 + (0.9 - e.life) * 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // day-cycle tint
    if (darkness > 0) { ctx.fillStyle = `rgba(16,22,54,${darkness})`; ctx.fillRect(0, 0, view.w, view.h); }
    drawHeli(world, camX, camY); // over the tint: the helicopter's lights and spotlight stay lit
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, world, view.w, view.h);
    if (screen === SCREEN_TITLE) {
      panel('SOLARA HEAT', [
        'Marco Reyes, wheelman for fixer Vera Calloway, in sun-soaked Solara City.',
        'Steal cars, run Vera\'s eight jobs, dodge or fight the law, get rich.',
        '',
        'WASD / arrows — move and drive      E — enter / exit / steal a car',
        'Mouse — aim · Click or J — shoot / punch      Shift — sprint',
        'Space — handbrake      Esc / P — pause      T / C / R / H / G — side jobs',
      ], hasSaveFile ? 'Press Enter to continue · N for a new game' : 'Press Enter to start', 0.38);
    } else if (screen === SCREEN_PAUSED) panel('PAUSED', ['Solara City waits for no one. Well — just this once.'], 'Press Esc to resume');
    else if (screen === SCREEN_BUSTED) panel('BUSTED', ['The Solara PD got their man. Bail and fines paid from your cash.'], 'Press Enter to respawn at the hospital');
    else if (screen === SCREEN_WASTED) panel('WASTED', ['Marco wakes up at Solara General with a bill and a headache.'], 'Press Enter to respawn at the hospital');
    else if (screen === SCREEN_COMPLETE) panel('CITY CONQUERED', ['All eight of Vera\'s jobs are done. Dario is gone, the docks are yours,', 'and Solara City belongs to Marco Reyes. Free roam continues —', 'side jobs at Vera\'s garage keys T / C / R / H / G still pay.'], 'Press Enter to keep roaming');
    return { camX, camY };
  }
  return { draw, view };
}
