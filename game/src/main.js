// Solara Heat boot: the screen state machine (title, playing, paused, busted, wasted, complete),
// a fixed-step loop, and the ?shot / ?test modes the screenshots and self-test run through.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_COMPLETE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { stageShot, runSelfTest } from './shots.js';
import { hasSave, loadSaveData, applySave } from './save.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const testMode = params.get('test') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261117;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio(!shot && !testMode);
const world = createWorld(createRandom(seed), audio);
const renderer = createRenderer(canvas);

if (shot) {
  const scene = stageShot(shot, world);
  let painted = 0;
  const paint = () => {
    renderer.draw(world, scene.screen, hasSave());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint); else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else if (testMode) {
  const lines = runSelfTest(world);
  window.__SOLARA_TEST__ = lines;
  status.textContent = lines.join('\n');
  const pre = document.createElement('pre');
  pre.id = 'testlog'; pre.textContent = lines.join('\n');
  document.body.appendChild(pre);
  renderer.draw(world, SCREEN_PLAY, false);
} else {
  runGame();
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let freshStart = false;
  let accumulator = 0, last = performance.now();
  let cam = { camX: 0, camY: 0 };
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (screen === SCREEN_TITLE && e.code === 'KeyN') freshStart = true;
    if (screen === SCREEN_PLAY) {
      if (e.code === 'KeyT') world.missions.startSide('taxi');
      if (e.code === 'KeyC') world.missions.startSide('courier');
      if (e.code === 'KeyR') world.missions.startSide('race');
      if (e.code === 'KeyM') audio.toggleMute();
    }
  });
  function startPlaying() {
    if (screen === SCREEN_TITLE && !freshStart && hasSave()) applySave(world, loadSaveData());
    screen = SCREEN_PLAY;
    status.textContent = 'Playing Solara Heat.';
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startPlaying();
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) screen = SCREEN_PAUSED;
    else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) screen = SCREEN_PLAY;
    else if ((screen === SCREEN_BUSTED || screen === SCREEN_WASTED) && (actions & ACTION_CONFIRM)) {
      world.respawn(screen === SCREEN_BUSTED ? 'busted' : 'wasted');
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_COMPLETE && (actions & ACTION_CONFIRM)) screen = SCREEN_PLAY;
    if (screen === SCREEN_PLAY) {
      const snap = input.snapshot();
      snap.interact = false; // interact is consumed below from the raw action flags once per press
      while (accumulator >= STEP) {
        const stepInput = Object.assign({}, snap, { interact: false });
        world.step(STEP, stepInput, { x: cam.camX + snap.mouseX, y: cam.camY + snap.mouseY });
        accumulator -= STEP;
      }
      if (actions & 1) { // ACTION_INTERACT: exactly one enter/exit per key press
        const stepInput = Object.assign({}, snap, { interact: true, moveX: 0, moveY: 0, shoot: false });
        world.step(0, stepInput, world.player);
      }
      if (world.events.busted) screen = SCREEN_BUSTED;
      else if (world.events.wasted) screen = SCREEN_WASTED;
      else if (world.events.storyComplete) { world.events.storyComplete = false; screen = SCREEN_COMPLETE; }
    } else {
      accumulator = 0;
      if (screen === SCREEN_TITLE) world.step(STEP, { moveX: 0, moveY: 0, sprint: false, handbrake: false, shoot: false, interact: false }, world.player);
    }
    cam = renderer.draw(world, screen, hasSave()) || cam;
  }
  status.textContent = 'Solara Heat. Press Enter to start.';
  requestAnimationFrame(frame);
}
