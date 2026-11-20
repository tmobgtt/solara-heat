// Solara Heat — the game itself. Marco Vale runs Vera's errands across an
// open city: steal cars, drive jobs, dodge or outrun the law. This module
// owns the state and the loop; the world, the police, the missions and the
// drawing each live in their own module.

import { BUST_SECONDS, CAR_TYPES, DAY_LENGTH, GARAGE, HEAT_DECAY, HEAT_MAX, WORLD } from './config.js';
import { createInput, readIntent } from './input.js';
import { MISSIONS, SIDE_JOBS } from './missions.js';
import { createPolice, starsForHeat, updatePolice } from './police.js';
import { makeRng } from './random.js';
import { render, renderEnd, renderTitle } from './render.js';
import { clearSave, loadSnapshot, saveGame } from './save.js';
import { stageShot } from './shots.js';
import { runSelfTest } from './selftest.js';
import { buildWorld, districtAt, isRoadCoord, makeCar, onRoad, spawnParked, spawnPeds, spawnTraffic, buildingAt } from './world.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 7) || 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function fitCanvas() {
  canvas.width = Math.min(window.innerWidth, 1600);
  canvas.height = Math.min(window.innerHeight, 1000);
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// A fresh game on a seed: the same seed always builds the same Solara.
export function createGame(seedValue) {
  const rng = makeRng(seedValue);
  const world = buildWorld(rng);
  const state = {
    rng, world, time: 0, hour: 10.5,
    mode: 'title', // title | play | busted | wrecked | won
    cash: 0, heat: 0, stars: 0,
    player: { x: GARAGE.x + 60, y: GARAGE.y + 46, angle: 0, car: null },
    cars: [], peds: [], police: createPolice(),
    missionIndex: 0, mission: null, stepIndex: 0, crewLeft: 0, crewTimer: 0,
    side: null, storyDone: false, sideCounts: { taxi: 0, courier: 0, race: 0 },
    objective: null, dialogue: null, district: districtAt(GARAGE.x, GARAGE.y),
    camera: { x: 0, y: 0 }, busted: false, message: '',
  };
  state.cars = [...spawnParked(rng, 46), ...spawnTraffic(rng, 30)];
  state.peds = spawnPeds(rng, 90);
  return state;
}

// Say a line on screen for a few seconds.
export function say(state, text, seconds = 5) {
  state.dialogue = { text, until: state.time + seconds };
}

// Add wanted heat for a crime, capped.
export function commitCrime(state, heat) {
  state.heat = Math.min(HEAT_MAX, state.heat + heat);
}

// The current objective the HUD shows: a place, a line, a distance.
function refreshObjective(state) {
  if (state.mission) {
    const step = state.mission.steps[state.stepIndex];
    if (!step) return;
    if (step.kind === 'lose') {
      state.objective = { x: 0, y: 0, text: step.text + ' (' + state.stars + ' stars)' };
    } else {
      const d = Math.round(Math.hypot(step.x - state.player.x, step.y - state.player.y) / 10);
      state.objective = { x: step.x, y: step.y, text: step.text + ' - ' + d + ' m' };
    }
  } else if (state.side) {
    const d = Math.round(Math.hypot(state.side.x - state.player.x, state.side.y - state.player.y) / 10);
    state.objective = { x: state.side.x, y: state.side.y, text: state.side.text + ' - ' + d + ' m' };
  } else if (!state.storyDone) {
    const next = MISSIONS[state.missionIndex];
    state.objective = { x: GARAGE.x, y: GARAGE.y, text: next ? 'See Vera at the garage: ' + next.title : 'Free roam' };
  } else {
    state.objective = { x: 0, y: 0, text: 'Solara is yours. Free roam - T / C / R for side jobs' };
  }
}

// Start the next story job when Marco reaches the garage with none running.
export function startMission(state, index) {
  const mission = MISSIONS[index];
  if (!mission) return false;
  state.mission = mission;
  state.stepIndex = 0;
  state.crewLeft = 0;
  say(state, mission.intro, 7);
  prepareStep(state);
  return true;
}

// Set up the step that just became current: mark its car, arm its crew.
function prepareStep(state) {
  const step = state.mission?.steps[state.stepIndex];
  if (!step) return;
  if (step.kind === 'clear') state.crewLeft = step.crew ?? 3;
  if (step.kind === 'steal') {
    for (const car of state.cars) car.marked = false;
    const car = makeCar(state.mission.id === 'm8' ? 'sports' : 'sports', step.x, step.y, 0, state.mission.id === 'm8' ? '#c23b2e' : '#2e5fc2');
    car.marked = true;
    car.parked = true;
    state.cars.push(car);
    state.markedCar = car;
  }
  if (step.heat && step.kind !== 'deliver') commitCrime(state, 0); // deliver steps sting on arrival
}

// Pay out and close the running job.
function finishMission(state) {
  const mission = state.mission;
  state.cash += mission.pay;
  say(state, mission.outro + '  +$' + mission.pay, 7);
  state.mission = null;
  state.missionIndex++;
  if (state.missionIndex >= MISSIONS.length) {
    state.storyDone = true;
    state.mode = 'won';
  }
  saveGame(state);
}

// Advance the story if the current step is satisfied. Returns true on a step change.
export function checkStep(state, dt) {
  const mission = state.mission;
  if (!mission) return false;
  const step = mission.steps[state.stepIndex];
  if (!step) { finishMission(state); return true; }
  const p = state.player;
  const dist = Math.hypot(step.x - p.x, step.y - p.y);
  let done = false;
  if (step.kind === 'go') done = dist < 70;
  else if (step.kind === 'meet') done = dist < 56 && !p.car;
  else if (step.kind === 'deliver') done = dist < 78 && !!p.car;
  else if (step.kind === 'steal') done = !!p.car && p.car === state.markedCar;
  else if (step.kind === 'lose') done = state.stars === 0 && state.heat < 9;
  else if (step.kind === 'clear') {
    if (dist < 110) {
      state.crewTimer += dt;
      if (state.crewTimer > 0.9) {
        state.crewTimer = 0;
        state.crewLeft--;
        commitCrime(state, 6);
        if (state.crewLeft <= 0) done = true;
      }
    }
  }
  if (!done) return false;
  if (step.heat) commitCrime(state, step.heat);
  if (step.sting) say(state, 'The buyer flashes a badge - it is a sting!', 6);
  state.stepIndex++;
  if (state.stepIndex >= mission.steps.length) finishMission(state);
  else prepareStep(state);
  return true;
}

// Side jobs: a fare, a parcel, a race — one target, one payout.
export function startSideJob(state, kind) {
  if (state.mission || state.side) return false;
  const job = SIDE_JOBS[kind];
  const x = state.rng.range(300, WORLD - 300);
  const y = state.rng.range(300, WORLD - 300);
  state.side = { kind, x, y, text: job.name + ': reach the marker', pay: job.pay };
  say(state, job.name + ' - follow the green marker.', 4);
  return true;
}

function checkSideJob(state) {
  if (!state.side) return;
  const d = Math.hypot(state.side.x - state.player.x, state.side.y - state.player.y);
  if (d < 70) {
    state.cash += state.side.pay;
    state.sideCounts[state.side.kind]++;
    say(state, state.side.text.split(':')[0] + ' done. +$' + state.side.pay, 4);
    state.side = null;
    saveGame(state);
  }
}

// Driving and walking.
function updatePlayer(state, intent, dt) {
  const p = state.player;
  if (p.car) {
    const car = p.car;
    const spec = CAR_TYPES[car.type];
    if (intent.up) car.speed += spec.accel * dt;
    else if (intent.down) car.speed -= spec.accel * 0.55 * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 60 * dt);
    if (intent.brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 420 * dt);
    car.speed = Math.max(-spec.top * 0.4, Math.min(spec.top, car.speed));
    const steer = (intent.left ? -1 : 0) + (intent.right ? 1 : 0);
    if (Math.abs(car.speed) > 4) car.angle += steer * spec.grip * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 160);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!buildingAt(state.world, nx, ny)) {
      car.x = nx; car.y = ny;
    } else {
      car.health -= Math.abs(car.speed) * 0.03;
      car.speed *= -0.25;
    }
    car.x = Math.max(20, Math.min(WORLD - 20, car.x));
    car.y = Math.max(20, Math.min(WORLD - 20, car.y));
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (car.health <= 0) {
      p.car = null;
      state.mode = 'wrecked';
    }
  } else {
    const speed = 175;
    let mx = 0, my = 0;
    if (intent.up) my -= 1;
    if (intent.down) my += 1;
    if (intent.left) mx -= 1;
    if (intent.right) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const nx = p.x + (mx / len) * speed * dt * (mx || my ? 1 : 0);
    const ny = p.y + (my / len) * speed * dt * (mx || my ? 1 : 0);
    if (!buildingAt(state.world, nx, ny)) { p.x = nx; p.y = ny; }
    p.x = Math.max(16, Math.min(WORLD - 16, p.x));
    p.y = Math.max(16, Math.min(WORLD - 16, p.y));
    if (mx || my) p.angle = Math.atan2(my, mx);
  }
}

// Getting in and out of cars; stealing a parked car is a small crime.
function tryEnterExit(state) {
  const p = state.player;
  if (p.car) {
    const car = p.car;
    p.car = null;
    car.driver = null;
    car.parked = true;
    car.speed = 0;
    p.x = car.x + 30;
    p.y = car.y + 26;
    return;
  }
  let best = null;
  let bestDist = 52;
  for (const car of state.cars) {
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestDist) { best = car; bestDist = d; }
  }
  if (best) {
    p.car = best;
    best.driver = 'player';
    best.parked = false;
    if (best.type === 'hauler') commitCrime(state, 16);
    else commitCrime(state, 8);
    p.x = best.x; p.y = best.y;
  }
}

// Traffic follows the grid; pedestrians wander the pavements.
function updateAmbient(state, dt) {
  for (const car of state.cars) {
    if (car.driver !== 'traffic') continue;
    const spec = CAR_TYPES[car.type];
    car.speed = Math.min(spec.top * 0.55, car.speed + spec.accel * dt * 0.5);
    if (car.laneVertical) {
      car.y += car.laneDir * car.speed * dt;
      car.angle = car.laneDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (car.y < 30 || car.y > WORLD - 30) { car.laneDir *= -1; car.y = Math.max(30, Math.min(WORLD - 30, car.y)); }
      if (!isRoadCoord(car.x) && state.rng.chance(0.002)) car.laneVertical = false;
    } else {
      car.x += car.laneDir * car.speed * dt;
      car.angle = car.laneDir > 0 ? 0 : Math.PI;
      if (car.x < 30 || car.x > WORLD - 30) { car.laneDir *= -1; car.x = Math.max(30, Math.min(WORLD - 30, car.x)); }
      if (!isRoadCoord(car.y) && state.rng.chance(0.002)) car.laneVertical = true;
    }
  }
  for (const ped of state.peds) {
    ped.turn -= dt;
    if (ped.turn <= 0) { ped.turn = state.rng.range(2, 6); ped.angle = state.rng.range(0, Math.PI * 2); }
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (!buildingAt(state.world, nx, ny) && onRoad(nx, ny) === false) { ped.x = nx; ped.y = ny; }
    else ped.angle += Math.PI / 2;
  }
}

// One frame of the whole game.
export function updateGame(state, intent, dt) {
  state.time += dt;
  state.hour = (state.hour + (dt / DAY_LENGTH) * 24) % 24;
  if (state.mode !== 'play') return;
  updatePlayer(state, intent, dt);
  if (intent.enter) tryEnterExit(state);
  updateAmbient(state, dt);
  state.stars = starsForHeat(state.heat);
  updatePolice(state, dt);
  if (!state.police.seen && state.heat > 0) state.heat = Math.max(0, state.heat - HEAT_DECAY * dt);
  state.stars = starsForHeat(state.heat);
  if (state.busted) { state.mode = 'busted'; return; }
  if (!state.mission && !state.storyDone) {
    const d = Math.hypot(GARAGE.x - state.player.x, GARAGE.y - state.player.y);
    if (d < 60 && !state.player.car) startMission(state, state.missionIndex);
  }
  checkStep(state, dt);
  checkSideJob(state);
  if (intent.taxi) startSideJob(state, 'taxi');
  if (intent.courier) startSideJob(state, 'courier');
  if (intent.race) startSideJob(state, 'race');
  state.district = districtAt(state.player.x, state.player.y);
  refreshObjective(state);
  state.camera.x = Math.max(0, Math.min(WORLD - canvas.width, state.player.x - canvas.width / 2));
  state.camera.y = Math.max(0, Math.min(WORLD - canvas.height, state.player.y - canvas.height / 2));
}

// Restore a saved snapshot into a fresh state.
export function applySnapshot(state, snap) {
  state.cash = snap.cash;
  state.missionIndex = snap.missionIndex ?? 0;
  state.storyDone = !!snap.storyDone;
  state.sideCounts = snap.sideCounts ?? { taxi: 0, courier: 0, race: 0 };
  if (snap.player) { state.player.x = snap.player.x; state.player.y = snap.player.y; }
  if (snap.car) {
    const car = makeCar(snap.car.type, snap.car.x, snap.car.y, snap.car.angle, snap.car.colour);
    state.cars.push(car);
    state.player.car = car;
    car.driver = 'player';
  }
}

// Boot: a staged shot, the self-test, or the game itself.
const state = createGame(seed);
const input = createInput();
window.SolaraHeat = { state, createGame, startMission, checkStep, updateGame, commitCrime, applySnapshot };

if (params.has('shot')) {
  stageShot(state, params.get('shot'));
  state.mode = 'play';
  refreshObjective(state);
  const drawShot = () => {
    if (params.get('shot') === 'cover') renderTitle(state, ctx, canvas.width, canvas.height);
    else render(state, ctx, canvas.width, canvas.height);
  };
  drawShot();
  requestAnimationFrame(drawShot);
} else if (params.has('test')) {
  state.mode = 'play';
  runSelfTest(window.SolaraHeat);
} else {
  const snap = loadSnapshot();
  if (snap && params.get('fresh') !== '1') applySnapshot(state, snap);
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const intent = readIntent(input);
    intent.taxi = input.hit('t');
    intent.courier = input.hit('c');
    intent.race = input.hit('r');
    if (state.mode === 'title' && (input.hit('Enter') || intent.enter)) state.mode = 'play';
    else if ((state.mode === 'busted' || state.mode === 'wrecked' || state.mode === 'won') && input.hit('Enter')) {
      state.heat = 0; state.stars = 0; state.busted = false;
      state.police = createPolice();
      state.player.car = null;
      state.player.x = GARAGE.x + 60; state.player.y = GARAGE.y + 46;
      if (state.mode === 'busted') state.cash = Math.max(0, state.cash - 150);
      state.mode = 'play';
      clearSave();
      saveGame(state);
    }
    updateGame(state, intent, dt);
    if (state.mode === 'title') renderTitle(state, ctx, canvas.width, canvas.height);
    else if (state.mode === 'busted') renderEnd(state, ctx, canvas.width, canvas.height, 'BUSTED', 'The law takes $150 and your morning. Your jobs wait at the garage.');
    else if (state.mode === 'wrecked') renderEnd(state, ctx, canvas.width, canvas.height, 'WRECKED', 'The car died. Marco walks back to the garage.');
    else if (state.mode === 'won') renderEnd(state, ctx, canvas.width, canvas.height, 'CITY CONQUERED', 'All eight jobs done. Solara Heat complete - $' + state.cash.toLocaleString('en-US') + ' earned.');
    else render(state, ctx, canvas.width, canvas.height);
    status.textContent = state.objective ? state.objective.text : state.district.name;
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export { BUST_SECONDS };
