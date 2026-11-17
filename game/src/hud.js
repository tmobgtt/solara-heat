// The HUD: health and armour, cash, weapon and ammo, the clock, wanted stars, the mission
// objective and dialogue, centre messages, and the minimap in the corner of the same canvas.
import { FONT, PALETTE, WORLD_H, WORLD_W } from './config.js';

function bar(ctx, x, y, w, frac, color, label) {
  ctx.fillStyle = 'rgba(10,12,16,0.65)'; ctx.fillRect(x - 2, y - 2, w + 4, 16);
  ctx.fillStyle = '#3a3f46'; ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 12);
  ctx.fillStyle = PALETTE.text; ctx.font = `11px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 5);
}
export function drawMinimap(ctx, world, x, y, w, h) {
  const sx = w / WORLD_W, sy = h / WORLD_H;
  ctx.fillStyle = 'rgba(10,14,20,0.78)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#5d7a48'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.sea; ctx.fillRect(x + (WORLD_W - 700) * sx, y, 700 * sx, h);
  ctx.fillStyle = '#8b93a3';
  const city = world.city;
  for (const b of city.buildings) ctx.fillRect(x + b.x * sx, y + b.y * sy, Math.max(1.5, b.w * sx), Math.max(1.5, b.h * sy));
  for (const car of world.cars) {
    if (car.dead) continue;
    ctx.fillStyle = car.police ? '#7ab5ff' : (car === world.player.car ? '#ffffff' : '#d8d8d8');
    ctx.fillRect(x + car.x * sx - 1.5, y + car.y * sy - 1.5, 3, 3);
  }
  for (const ped of world.peds) {
    if (ped.dead) continue;
    ctx.fillStyle = ped.cop ? '#7ab5ff' : ped.enemy ? '#ff5040' : '#cbb98a';
    ctx.fillRect(x + ped.x * sx - 1, y + ped.y * sy - 1, 2, 2);
  }
  const target = world.missions.currentTarget();
  if (target) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(x + target.x * sx, y + target.y * sy, 4 + Math.sin(world.time * 5) * 1.2, 0, Math.PI * 2); ctx.fill();
  }
  const p = world.player;
  ctx.save();
  ctx.translate(x + p.x * sx, y + p.y * sy); ctx.rotate(p.angle);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
export function drawHud(ctx, world, width, height) {
  const p = world.player;
  ctx.textBaseline = 'alphabetic';
  bar(ctx, 18, 30, 170, p.health / 100, '#58b368', 'HEALTH');
  bar(ctx, 18, 62, 170, p.armour / 100, '#7ab5ff', 'ARMOUR');
  ctx.fillStyle = PALETTE.gold; ctx.font = `bold 24px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText('$' + p.cash, 18, 102);
  ctx.fillStyle = PALETTE.text; ctx.font = `15px ${FONT}`;
  const weapon = p.weapon === 'pistol' ? 'Pistol · ' + p.ammo : 'Fists';
  ctx.fillText(weapon + (p.car ? ' · ' + p.car.type.toUpperCase() : ''), 18, 126);
  const mins = Math.floor(world.clockMinutes);
  const clock = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  ctx.textAlign = 'right'; ctx.fillText(clock + ' · ' + world.district, width - 18, 26);
  // wanted stars
  ctx.font = `26px ${FONT}`; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < world.police.stars ? '#ffd23c' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', width - 18 - (4 - i) * 26, 56);
  }
  if (world.police.bustTimer > 0.2) {
    ctx.fillStyle = PALETTE.danger; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('BUSTED IN ' + (1.6 - world.police.bustTimer).toFixed(1), width / 2, 120);
  }
  // mission objective, top centre-left panel
  const obj = world.missions.objectiveText();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,12,16,0.6)'; ctx.fillRect(width / 2 - 260, 12, 520, obj.timer != null ? 62 : 48);
  ctx.fillStyle = PALETTE.gold; ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(obj.title.toUpperCase(), width / 2 - 248, 33);
  ctx.fillStyle = PALETTE.text; ctx.font = `14px ${FONT}`;
  ctx.fillText(obj.text, width / 2 - 248, 54);
  if (obj.timer != null) { ctx.fillStyle = obj.timer < 12 ? PALETTE.danger : PALETTE.text; ctx.fillText('Time left: ' + Math.ceil(obj.timer) + 's', width / 2 - 248, 70); }
  // centre message
  if (world.messageT > 0 && world.message) {
    ctx.fillStyle = 'rgba(10,12,16,0.55)';
    const tw = ctx.measureText(world.message).width + 30;
    ctx.font = `16px ${FONT}`;
    const tw2 = ctx.measureText(world.message).width + 30;
    ctx.fillRect(width / 2 - tw2 / 2, height - 168, tw2, 30);
    ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center';
    ctx.fillText(world.message, width / 2, height - 147);
  }
  // dialogue banner
  if (world.dialogue && world.dialogue.t > 0) {
    ctx.fillStyle = 'rgba(8,10,14,0.82)'; ctx.fillRect(width / 2 - 340, height - 128, 680, 56);
    ctx.fillStyle = PALETTE.gold; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(world.dialogue.who, width / 2 - 324, height - 104);
    ctx.fillStyle = PALETTE.text; ctx.font = `14px ${FONT}`;
    ctx.fillText(world.dialogue.text.slice(0, 92), width / 2 - 324, height - 84);
  }
  drawMinimap(ctx, world, width - 208, height - 168, 190, 140);
}
