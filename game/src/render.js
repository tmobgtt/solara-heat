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
    for (const pr of city.props) { ctx.fillStyle = pr.kind === 'hydrant' ? '#c9403a' : pr.kind === 'bench' ? '#7a5c3e' : '#6b7c8c'; ctx.fillRect(pr.x - 5, pr.y - 5, 10, 10); }
    for (const l of city.lamps) { ctx.fillStyle = '#3c4148'; ctx.fillRect(l.x - 2, l.y - 2, 4, 4); ctx.fillStyle = 'rgba(255,230,150,0.5)'; ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill(); }
    for (const palm of city.palms) {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(palm.x - 2, palm.y - 2, 4, 4);
      ctx.strokeStyle = '#4d8a3f'; ctx.lineWidth = 2.4;
      for (let k = 0; k < 5; k += 1) { const a = (k / 5) * Math.PI * 2 + palm.s; ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + Math.cos(a) * 13 * palm.s, palm.y + Math.sin(a) * 13 * palm.s); ctx.stroke(); }
    }
    // buildings: walls, shaded roofs, windows lit by floor count and the seed
    for (const b of city.buildings) {
      if (b.x > camX + view.w + 60 || b.x + b.w < camX - 60 || b.y > camY + view.h + 60 || b.y + b.h < camY - 60) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = PALETTE.wall; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 7);
      ctx.fillStyle = 'rgba(30,40,60,0.75)';
      const cols = Math.floor(b.w / 17), rowsN = Math.floor(b.h / 17);
      for (let cx2 = 0; cx2 < cols; cx2 += 1) for (let cy2 = 0; cy2 < rowsN; cy2 += 1) {
        if (((cx2 * 7 + cy2 * 13 + Math.floor(b.seed * 90)) % 5) < 2) { ctx.fillStyle = 'rgba(255,224,130,0.85)'; } else ctx.fillStyle = 'rgba(30,40,60,0.75)';
        ctx.fillRect(b.x + 8 + cx2 * 17, b.y + 9 + cy2 * 17, 8, 9);
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
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
    ctx.fillStyle = car.dead ? '#2c2c2c' : car.color; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);
    ctx.fillStyle = 'rgba(20,28,40,0.9)'; ctx.fillRect(-4, -car.h / 2 + 3, 13, car.h - 6);
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
  function drawPed(ped) {
    ctx.save(); ctx.translate(ped.x, ped.y);
    if (ped.dead) { ctx.fillStyle = ped.shirt; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, ped.angle, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(2, 3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.hitFlash > 0 ? '#ff6a5e' : ped.shirt; ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(3, 0, 4.6, 0, Math.PI * 2); ctx.fill();
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
  function panel(title, lines, prompt) {
    ctx.fillStyle = 'rgba(6,8,12,0.72)'; ctx.fillRect(0, 0, view.w, view.h);
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
    const hour = world.clockMinutes / 60;
    const darkness = hour < 6 || hour > 19 ? 0.34 : hour < 8 || hour > 17 ? 0.14 : 0;
    if (darkness > 0) { ctx.fillStyle = `rgba(16,22,54,${darkness})`; ctx.fillRect(0, 0, view.w, view.h); }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, world, view.w, view.h);
    if (screen === SCREEN_TITLE) {
      panel('SOLARA HEAT', [
        'Marco Reyes, wheelman for fixer Vera Calloway, in sun-soaked Solara City.',
        'Steal cars, run Vera\'s six jobs, dodge or fight the law, get rich.',
        '',
        'WASD / arrows — move and drive      E — enter / exit / steal a car',
        'Mouse — aim · Click or J — shoot / punch      Shift — sprint',
        'Space — handbrake      Esc / P — pause      T / C / R — side jobs',
      ], hasSaveFile ? 'Press Enter to continue · N for a new game' : 'Press Enter to start');
    } else if (screen === SCREEN_PAUSED) panel('PAUSED', ['Solara City waits for no one. Well — just this once.'], 'Press Esc to resume');
    else if (screen === SCREEN_BUSTED) panel('BUSTED', ['The Solara PD got their man. Bail and fines paid from your cash.'], 'Press Enter to respawn at the hospital');
    else if (screen === SCREEN_WASTED) panel('WASTED', ['Marco wakes up at Solara General with a bill and a headache.'], 'Press Enter to respawn at the hospital');
    else if (screen === SCREEN_COMPLETE) panel('CITY CONQUERED', ['All six of Vera\'s jobs are done. Dario is gone, the docks are yours,', 'and Solara City belongs to Marco Reyes. Free roam continues —', 'side jobs at Vera\'s garage keys T / C / R still pay.'], 'Press Enter to keep roaming');
    return { camX, camY };
  }
  return { draw, view };
}
