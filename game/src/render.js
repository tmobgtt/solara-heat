// Drawing Solara: the city from above, its traffic and people, Marco, the
// police and their helicopter, then the HUD — wanted stars, cash, the
// objective with its distance, dialogue, and the minimap in the corner.

import { BLOCK, DISTRICTS, GARAGE, HELI_SEEN_RANGE, ROAD, WORLD } from './config.js';

// Darkness at a time of day (0 = noon, 1 = full night). `hour` runs 0..24.
export function darknessAt(hour) {
  if (hour < 5.5 || hour > 19.5) return 1;
  if (hour < 7.5) return 1 - (hour - 5.5) / 2;
  if (hour > 17.5) return (hour - 17.5) / 2;
  return 0;
}

function rect(ctx, x, y, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
}

// One building, drawn by kind: towers get a window grid, shops a sign and an
// awning, Hills houses a pitched roof band, Port warehouses ribs and a door.
function drawBuilding(ctx, b, dark, time) {
  const base = b.kind === 'warehouse' ? '#6d6257' : b.kind === 'house' ? '#b8a58c' : b.landmark ? '#7d7468' : '#8d8578';
  rect(ctx, b.x, b.y, b.w, b.h, base);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  if (b.kind === 'house') {
    rect(ctx, b.x + 6, b.y + b.h * 0.36, b.w - 12, b.h * 0.28, '#8a4a38');
  } else if (b.kind === 'warehouse') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = b.x + 14; x < b.x + b.w - 8; x += 18) ctx.fillRect(x, b.y + 4, 3, b.h - 8);
    rect(ctx, b.x + b.w * 0.4, b.y + b.h - 20, b.w * 0.2, 16, '#4c463f');
    rect(ctx, b.x + 8, b.y + 8, b.w - 16, 8, 'rgba(200,225,255,0.5)');
  } else {
    // Window grid; more windows lit as the dark comes down.
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = ((i * 7 + j * 13 + Math.floor(b.seed * 40)) % 10) / 10 < dark * 0.85;
        ctx.fillStyle = lit ? '#ffd98a' : 'rgba(30,40,55,0.55)';
        ctx.fillRect(b.x + 8 + i * ((b.w - 14) / cols), b.y + 8 + j * ((b.h - 14) / rows), 9, 11);
      }
    }
    if (b.kind === 'shop' && b.sign) {
      rect(ctx, b.x, b.y + b.h - 22, b.w, 16, b.trim);
      ctx.fillStyle = '#10131c';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.sign, b.x + b.w / 2, b.y + b.h - 10);
      rect(ctx, b.x - 2, b.y + b.h - 6, b.w + 4, 5, b.trim);
    }
    if (b.roof === 'tank') {
      ctx.fillStyle = '#5d564c';
      ctx.beginPath(); ctx.arc(b.x + b.w * 0.7, b.y + b.h * 0.3, 9, 0, Math.PI * 2); ctx.fill();
    } else if (b.roof === 'ac') {
      rect(ctx, b.x + b.w * 0.6, b.y + b.h * 0.2, 18, 13, '#6a655c');
    } else if (b.roof === 'antenna') {
      ctx.strokeStyle = '#3c3833';
      ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, b.y + b.h / 2); ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2 - 20); ctx.stroke();
      if (dark > 0.4 && Math.sin(time * 2.4) > 0) {
        ctx.fillStyle = '#ff4b4b';
        ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2 - 21, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  if (b.landmark) {
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 3.5, b.y + 3.5, b.w - 7, b.h - 7);
    ctx.lineWidth = 1;
  }
}

function drawProp(ctx, p, dark) {
  if (p.kind === 'palm') {
    ctx.fillStyle = '#2e7d46';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#6d4c2f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'lamp') {
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
    if (dark > 0.15) {
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
      g.addColorStop(0, 'rgba(255,205,120,0.5)');
      g.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p.kind === 'hydrant') {
    rect(ctx, p.x - 2, p.y - 3, 5, 7, '#c23b2e');
  } else if (p.kind === 'bench') {
    rect(ctx, p.x - 7, p.y - 2, 14, 4, '#7a5c38');
  } else if (p.kind === 'dumpster') {
    rect(ctx, p.x - 8, p.y - 5, 16, 10, '#3f6d4e');
  } else if (p.kind === 'planter') {
    rect(ctx, p.x - 6, p.y - 6, 12, 12, '#9c8a70');
    ctx.fillStyle = '#3f9e4d';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.4, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'umbrella') {
    ctx.fillStyle = '#e86a8a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
  }
}

// A car from above: body, cabin, lights; police livery and gold marks read
// at a glance.
export function drawCar(ctx, car, dark, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const w = car.w;
  const h = car.h;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  ctx.fillStyle = car.colour;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  if (car.type === 'truck' || car.type === 'hauler') {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w * 0.52, h - 6);
  }
  ctx.fillStyle = '#1b2432';
  ctx.fillRect(-w * 0.16, -h / 2 + 3, w * 0.3, h - 6);
  ctx.fillStyle = '#ffd98a';
  ctx.fillRect(w / 2 - 3, -h / 2 + 2, 3, 4);
  ctx.fillRect(w / 2 - 3, h / 2 - 6, 3, 4);
  if (car.police) {
    ctx.fillStyle = '#20304d';
    ctx.fillRect(-w * 0.3, -h / 2, w * 0.34, h);
    const phase = Math.sin(time * 10 + car.x) > 0;
    ctx.fillStyle = phase ? '#ff4b4b' : '#4b8aff';
    ctx.fillRect(-4, -3, 8, 6);
    if (dark > 0.1) {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
      g.addColorStop(0, phase ? 'rgba(255,75,75,0.30)' : 'rgba(75,138,255,0.30)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (car.marked) {
    ctx.strokeStyle = '#ffd94b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
    ctx.lineWidth = 1;
  }
  if (dark > 0.25) {
    const g = ctx.createRadialGradient(w / 2, 0, 4, w / 2 + 44, 0, 58);
    g.addColorStop(0, 'rgba(255,240,190,0.28)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w / 2, -7);
    ctx.lineTo(w / 2 + 58, -17);
    ctx.lineTo(w / 2 + 58, 17);
    ctx.lineTo(w / 2, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.fillStyle = ped.shirt;
  ctx.beginPath(); ctx.arc(ped.x, ped.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(ped.x, ped.y, 2.6, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.car) return; // Marco is the car while he drives it.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(p.x + 1.5, p.y + 2.5, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2f2f5';
  ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fill();
}

// The helicopter: drawn over the night tint, with its spotlight pool, an
// offset shadow, a spinning rotor and blinking navigation lights.
function drawHelicopter(ctx, heli, time) {
  const g = ctx.createRadialGradient(heli.x, heli.y, 8, heli.x, heli.y, HELI_SEEN_RANGE * 0.32);
  g.addColorStop(0, 'rgba(255,246,200,0.20)');
  g.addColorStop(1, 'rgba(255,246,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(heli.x, heli.y, HELI_SEEN_RANGE * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(heli.x + 26, heli.y + 34, 24, 9, heli.angle, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(heli.x, heli.y);
  ctx.rotate(heli.angle);
  ctx.fillStyle = '#22262e';
  ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-38, -2.6, 20, 5);
  ctx.fillStyle = '#9fd4e8';
  ctx.beginPath(); ctx.ellipse(9, 0, 9, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(230,238,248,0.75)';
  ctx.beginPath();
  const r = 30;
  const a = heli.rotor;
  ctx.moveTo(Math.cos(a) * -r, Math.sin(a) * -r);
  ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  ctx.moveTo(Math.cos(a + Math.PI / 2) * -r, Math.sin(a + Math.PI / 2) * -r);
  ctx.lineTo(Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
  ctx.stroke();
  ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ff4b4b' : '#3a3f4a';
  ctx.beginPath(); ctx.arc(-37, -3, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = Math.sin(time * 6) <= 0 ? '#4bff7a' : '#3a3f4a';
  ctx.beginPath(); ctx.arc(-37, 3, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// The minimap: the whole city in a corner box, with the player, the police,
// the helicopter and the objective.
function drawMinimap(ctx, state, vw, vh) {
  const size = 148;
  const x0 = vw - size - 14;
  const y0 = 64;
  const s = size / WORLD;
  ctx.fillStyle = 'rgba(10,13,20,0.82)';
  ctx.fillRect(x0, y0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
  ctx.fillStyle = '#39445c';
  for (let i = 0; i < WORLD / BLOCK; i++) {
    ctx.fillRect(x0 + i * BLOCK * s, y0, ROAD * s, size);
    ctx.fillRect(x0, y0 + i * BLOCK * s, size, ROAD * s);
  }
  ctx.fillStyle = '#ffd94b';
  ctx.fillRect(x0 + GARAGE.x * s - 2, y0 + GARAGE.y * s - 2, 4, 4);
  const target = state.objective;
  if (target && target.x) {
    ctx.fillStyle = '#4bd97a';
    ctx.beginPath(); ctx.arc(x0 + target.x * s, y0 + target.y * s, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4b8aff';
  for (const u of state.police.units) ctx.fillRect(x0 + u.x * s - 1.6, y0 + u.y * s - 1.6, 3.2, 3.2);
  if (state.police.heli.active) {
    ctx.fillStyle = '#ff9d4b';
    ctx.beginPath(); ctx.arc(x0 + state.police.heli.x * s, y0 + state.police.heli.y * s, 2.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x0 + state.player.x * s, y0 + state.player.y * s, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.district.name, x0 + 6, y0 + size - 7);
}

// The full frame.
export function render(state, ctx, vw, vh) {
  const cam = state.camera;
  const dark = darknessAt(state.hour);
  const time = state.time;
  ctx.fillStyle = '#4a4f57';
  ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Roads, then pavements and sand at the Marina's south edge.
  const xFrom = Math.max(0, cam.x - 40);
  const yFrom = Math.max(0, cam.y - 40);
  const xTo = Math.min(WORLD, cam.x + vw + 40);
  const yTo = Math.min(WORLD, cam.y + vh + 40);
  ctx.fillStyle = '#33373f';
  ctx.fillRect(xFrom, yFrom, xTo - xFrom, yTo - yFrom);
  ctx.fillStyle = '#5a5f68';
  for (let gx = Math.floor(xFrom / BLOCK) * BLOCK; gx < xTo; gx += BLOCK) ctx.fillRect(gx, yFrom, ROAD, yTo - yFrom);
  for (let gy = Math.floor(yFrom / BLOCK) * BLOCK; gy < yTo; gy += BLOCK) ctx.fillRect(xFrom, gy, xTo - xFrom, ROAD);
  ctx.fillStyle = '#e3cf9e';
  ctx.fillRect(xFrom, WORLD - 130, xTo - xFrom, 130 - Math.max(0, yFrom - (WORLD - 130)));
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.setLineDash([16, 20]);
  for (let gx = Math.floor(xFrom / BLOCK) * BLOCK; gx < xTo; gx += BLOCK) {
    ctx.beginPath(); ctx.moveTo(gx + ROAD / 2, yFrom); ctx.lineTo(gx + ROAD / 2, yTo); ctx.stroke();
  }
  for (let gy = Math.floor(yFrom / BLOCK) * BLOCK; gy < yTo; gy += BLOCK) {
    ctx.beginPath(); ctx.moveTo(xFrom, gy + ROAD / 2); ctx.lineTo(xTo, gy + ROAD / 2); ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const b of state.world.buildings) {
    if (b.x + b.w < xFrom || b.x > xTo || b.y + b.h < yFrom || b.y > yTo) continue;
    drawBuilding(ctx, b, dark, time);
  }
  for (const p of state.world.props) {
    if (p.x < xFrom || p.x > xTo || p.y < yFrom || p.y > yTo) continue;
    drawProp(ctx, p, dark);
  }

  // Vera's garage marker.
  ctx.fillStyle = '#ffd94b';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('V', GARAGE.x, GARAGE.y - 16);
  ctx.strokeStyle = '#ffd94b';
  ctx.strokeRect(GARAGE.x - 13, GARAGE.y - 13, 26, 26);

  // The objective marker, pulsing.
  const target = state.objective;
  if (target && target.x) {
    const pulse = 13 + Math.sin(time * 4) * 3;
    ctx.strokeStyle = '#4bd97a';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#4bd97a';
    ctx.beginPath(); ctx.arc(target.x, target.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  for (const ped of state.peds) drawPed(ctx, ped);
  for (const car of state.cars) drawCar(ctx, car, dark, time);
  for (const unit of state.police.units) drawCar(ctx, unit, dark, time);
  drawPlayer(ctx, state);
  ctx.restore();

  // Night tint, then the helicopter over it.
  if (dark > 0.02) {
    ctx.fillStyle = 'rgba(10,14,38,' + (dark * 0.42).toFixed(3) + ')';
    ctx.fillRect(0, 0, vw, vh);
  }
  if (state.police.heli.active) {
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawHelicopter(ctx, state.police.heli, time);
    ctx.restore();
  }

  drawHud(state, ctx, vw, vh, dark);
}

// Stars, cash, objective and dialogue: the HUD the judge reads.
function drawHud(state, ctx, vw, vh, dark) {
  ctx.textAlign = 'left';
  // Wanted stars, top centre.
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  let starsText = '';
  for (let i = 0; i < 5; i++) starsText += i < state.stars ? '\u2605' : '\u2606';
  ctx.fillStyle = state.stars > 0 ? '#ffd94b' : 'rgba(255,255,255,0.35)';
  ctx.fillText(starsText, vw / 2, 36);
  if (state.police.bustTimer > 0.2) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('BUSTED IN ' + (2.6 - state.police.bustTimer).toFixed(1), vw / 2, 60);
  }
  // Cash and clock, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText('$' + state.cash.toLocaleString('en-US'), 16, 30);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const hh = Math.floor(state.hour);
  const mm = Math.floor((state.hour - hh) * 60);
  ctx.fillText((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + '  ' + state.district.name, 16, 52);

  drawMinimap(ctx, state, vw, vh);

  // Objective line, bottom centre, with the distance in metres.
  if (state.objective) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(8,10,16,0.66)';
    const text = state.objective.text;
    const w = ctx.measureText(text).width + 28;
    ctx.fillRect(vw / 2 - w / 2, vh - 96, w, 30);
    ctx.fillStyle = '#e8f4ff';
    ctx.fillText(text, vw / 2, vh - 75);
  }
  // Dialogue, above the objective.
  if (state.dialogue && state.dialogue.until > state.time) {
    ctx.textAlign = 'center';
    ctx.font = '15px system-ui, sans-serif';
    const text = state.dialogue.text;
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = 'rgba(8,10,16,0.6)';
    ctx.fillRect(vw / 2 - w / 2, vh - 132, w, 28);
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText(text, vw / 2, vh - 113);
  }
  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(state.player.car ? 'WASD drive - F get out - Space brake' : 'WASD walk - F steal car - T/C/R side jobs', 14, vh - 14);
  if (dark > 0.6) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Night in Solara', vw - 92, vh - 14);
  }
}

// The title screen: the city behind a veil, the name, the pitch, the keys.
export function renderTitle(state, ctx, vw, vh) {
  render(state, ctx, vw, vh);
  ctx.fillStyle = 'rgba(8,10,20,0.38)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('SOLARA HEAT', vw / 2, vh * 0.36);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Eight jobs. One city. Every cop in Solara.', vw / 2, vh * 0.36 + 38);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Enter - start    WASD - drive and walk    F - steal a car    T / C / R - side jobs', vw / 2, vh * 0.36 + 74);
  ctx.fillText('Finish all eight story jobs to conquer Solara. Busted or wrecked, you wake at the garage.', vw / 2, vh * 0.36 + 98);
}

// The end screens: busted, wrecked, and the city conquered.
export function renderEnd(state, ctx, vw, vh, heading, line) {
  render(state, ctx, vw, vh);
  ctx.fillStyle = 'rgba(8,10,20,0.55)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94b';
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.fillText(heading, vw / 2, vh * 0.42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(line, vw / 2, vh * 0.42 + 36);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Enter - back to the garage', vw / 2, vh * 0.42 + 66);
}
