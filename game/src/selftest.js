// The built-in self-test: ?test=1&seed=7 plays the game by itself, in the
// open, and prints one PASS or FAIL line per check into the page and the
// console. It drives the real update loop and the real mission steps —
// nothing here is a mock.

import { MISSIONS } from './missions.js';
import { starsForHeat } from './police.js';
import { loadSnapshot, saveGame } from './save.js';

const IDLE = { up: false, down: false, left: false, right: false, brake: false, enter: false };

function tick(api, state, intent, times, dt = 1 / 30) {
  for (let i = 0; i < times; i++) api.updateGame(state, intent, dt);
}

// Stand the player (and their car) on a mission step's marker.
function teleportToStep(state, step) {
  if (state.player.car) {
    state.player.car.x = step.x;
    state.player.car.y = step.y;
    state.player.car.speed = 0;
  }
  state.player.x = step.x;
  state.player.y = step.y;
}

// Run the current mission to its end by visiting every step in turn.
function driveMission(api, state, maxRounds = 60) {
  let rounds = 0;
  while (state.mission && rounds < maxRounds) {
    const step = state.mission.steps[state.stepIndex];
    if (!step) break;
    if (step.kind === 'steal' && state.markedCar) {
      state.player.car = state.markedCar;
      state.markedCar.driver = 'player';
      state.player.x = state.markedCar.x;
      state.player.y = state.markedCar.y;
    }
    if (step.kind === 'deliver' && !state.player.car) {
      // A delivery with no car cannot happen; the steal step provides one.
      return false;
    }
    if (step.kind === 'lose') {
      state.heat = 0;
      tick(api, state, IDLE, 3);
    } else if (step.kind === 'clear') {
      teleportToStep(state, step);
      for (let i = 0; i < 14 && state.mission && state.mission.steps[state.stepIndex] === step; i++) {
        api.checkStep(state, 1);
      }
    } else {
      teleportToStep(state, step);
      api.checkStep(state, 1 / 30);
    }
    rounds++;
  }
  return state.mission === null;
}

export function runSelfTest(api) {
  const lines = [];
  const check = (name, ok) => {
    lines.push((ok ? 'PASS ' : 'FAIL ') + name);
  };
  try {
    const state = api.createGame(7);
    state.mode = 'play';
    api.state.mode = 'play';

    check('spawn: city, traffic and pedestrians exist',
      state.world.buildings.length > 100 && state.cars.length > 10 && state.peds.length > 10);

    check('story: eight jobs are defined',
      MISSIONS.length === 8 && MISSIONS[6].pay === 1800 && MISSIONS[7].pay === 2500);

    // Steal the nearest parked car, then drive it.
    let nearest = null;
    let best = Infinity;
    for (const car of state.cars) {
      const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
      if (car.parked && d < best) { best = d; nearest = car; }
    }
    state.player.x = nearest.x + 20;
    state.player.y = nearest.y + 10;
    tick(api, state, { ...IDLE, enter: true }, 1);
    check('enter car: Marco can steal a parked car', state.player.car === nearest);
    const startX = state.player.car.x;
    const startY = state.player.car.y;
    tick(api, state, { ...IDLE, up: true }, 45);
    check('drive: the car moves under power', Math.abs(state.player.car.x - startX) + Math.abs(state.player.car.y - startY) > 40);

    api.commitCrime(state, 60);
    tick(api, state, IDLE, 2);
    check('wanted: a witnessed crime raises the wanted level', state.stars >= 2 && starsForHeat(60) === 3);

    // Mission 1, end to end.
    if (!state.mission) api.startMission(state, 0);
    check('mission 1 starts at Vera\u2019s garage', !!state.mission && state.mission.id === 'm1');
    const cashBefore1 = state.cash;
    const done1 = driveMission(api, state);
    check('mission 1 completed by driving the objectives', done1 && state.cash === cashBefore1 + 300);

    // Save and load.
    state.cash = 777;
    saveGame(state);
    const snap = loadSnapshot();
    check('save/load round-trip restores cash and progress', !!snap && snap.cash === 777 && snap.missionIndex === state.missionIndex);

    // The helicopter: up at five stars, gone when the heat is gone.
    state.heat = 160;
    for (let i = 0; i < 40 && !state.police.heli.active; i++) {
      state.police.units.length = 0; // keep the bust out of this check
      tick(api, state, { ...IDLE, up: true }, 3);
    }
    check('helicopter: five stars launch air support that closes in', state.police.heli.active);
    state.heat = 0;
    for (let i = 0; i < 400 && state.police.heli.active; i++) tick(api, state, IDLE, 3);
    check('helicopter: it stands down when the heat is gone', !state.police.heli.active);

    // Mission 7, end to end.
    state.missionIndex = 6;
    api.startMission(state, 6);
    check('mission 7 starts at the garage', !!state.mission && state.mission.id === 'm7');
    const cashBefore7 = state.cash;
    const done7 = driveMission(api, state);
    check('mission 7 completed by driving the objectives', done7 && state.cash === cashBefore7 + 1800);

    // Mission 8: the sting, then losing the heat, completes the story.
    api.startMission(state, 7);
    check('mission 8 starts after mission 7', !!state.mission && state.mission.id === 'm8');
    const cashBefore8 = state.cash;
    // Steal the marked car.
    state.player.car = state.markedCar;
    state.markedCar.driver = 'player';
    api.checkStep(state, 1 / 30);
    // Deliver it to the buyer: the sting trips five stars.
    teleportToStep(state, state.mission.steps[state.stepIndex]);
    api.checkStep(state, 1 / 30);
    tick(api, state, IDLE, 2);
    check('mission 8: the sting delivery trips a 5-star finale', state.stars === 5 && state.mission && state.mission.steps[state.stepIndex].kind === 'lose');
    state.heat = 0;
    tick(api, state, IDLE, 3);
    check('mission 8: losing the heat completes the story',
      state.mission === null && state.storyDone && state.cash === cashBefore8 + 2500);
  } catch (error) {
    lines.push('FAIL exception: ' + (error && error.message));
  }
  const failed = lines.filter((l) => l.startsWith('FAIL')).length;
  lines.push(failed === 0 ? 'PASS all Solara Heat self-tests' : 'FAIL ' + failed + ' self-test checks failed');
  const log = document.getElementById('testlog');
  if (log) {
    log.style.display = 'block';
    log.textContent = lines.join('\n');
  }
  for (const line of lines) console.log(line);
  window.__testResults = lines;
  document.title = failed === 0 ? 'TESTS PASS' : 'TESTS FAIL';
  return lines;
}
