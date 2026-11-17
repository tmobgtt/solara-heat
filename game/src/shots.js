// Deterministic screenshot scenes behind ?shot=title|drive|chase|mission, staged in the real
// simulation, and the ?test=1 self-test that drives the real sim through a scripted sequence.
import { STEP } from './config.js';
import { roadCentreX, roadCentreY } from './city.js';
import { scriptedInput } from './input.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { saveGame, loadSaveData, applySave, snapshotSave } from './save.js';

function runSteps(world, n, input, aim) {
  for (let i = 0; i < n; i += 1) world.step(STEP, input || scriptedInput(), aim || world.player);
}
function putPlayerInCar(world) {
  const car = world.cars.find((c) => c.parked) || world.cars[0];
  car.x = roadCentreX(3); car.y = roadCentreY(3); car.angle = 0; car.speed = 0;
  world.player.x = car.x - 30; world.player.y = car.y;
  runSteps(world, 1, scriptedInput({ interact: true }));
  return world.player.car || car;
}
export function stageShot(name, world) {
  if (name === 'drive') {
    putPlayerInCar(world);
    runSteps(world, 150, scriptedInput({ moveY: -1 }));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    world.missions.beginStoryAt(0);
    putPlayerInCar(world);
    world.setHeat(105); // three stars
    runSteps(world, 170, scriptedInput({ moveY: -1, moveX: 0.2 }));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    world.player.weapon = 'pistol'; world.player.ammo = 60;
    world.missions.beginStoryAt(3); // M4 Dockside Business
    world.player.x = world.city.stash.x + 30; world.player.y = world.city.stash.y + 26;
    runSteps(world, 30, scriptedInput());
    const enemy = world.peds.find((p) => p.enemy && !p.dead);
    const aim = enemy || world.player;
    runSteps(world, 40, scriptedInput({ shoot: true }), aim);
    world.say('Dario Venn', 'Venn sends his regards, Reyes. You should have stayed a driver.');
    return { screen: SCREEN_PLAY };
  }
  // title: a downtown vista behind the title panel
  world.player.x = roadCentreX(4); world.player.y = roadCentreY(3);
  runSteps(world, 90, scriptedInput());
  return { screen: SCREEN_TITLE };
}

export function runSelfTest(world) {
  const lines = [];
  const check = (label, ok) => lines.push((ok ? 'PASS' : 'FAIL') + ' ' + label);
  try {
    check('spawn: city, traffic and pedestrians exist', world.city.buildings.length > 40 && world.cars.length > 10 && world.peds.length > 10);
    const car = putPlayerInCar(world);
    check('enter car: Marco can steal a parked car', !!world.player.car);
    const startX = car.x;
    runSteps(world, 100, scriptedInput({ moveY: -1 }));
    check('drive: the car moves under power', car.x - startX > 90);
    world.commitCrime('hitPed');
    check('wanted: a witnessed crime raises the wanted level', world.police.stars >= 1);
    // mission 1 by walking the real objective logic through real positions
    runSteps(world, 1, scriptedInput({ interact: true })); // step out
    world.player.x = world.city.garage.x; world.player.y = world.city.garage.y;
    runSteps(world, 2, scriptedInput());
    check('mission 1 starts at Vera\'s garage', !!world.missions.state.active && world.missions.state.active.def.id === 'm1');
    const cashBefore = world.player.cash;
    world.player.x = world.city.marinaOffice.x; world.player.y = world.city.marinaOffice.y;
    runSteps(world, 2, scriptedInput());
    const step1 = world.missions.defs[0].steps[1];
    world.player.x = step1.x; world.player.y = step1.y;
    runSteps(world, 2, scriptedInput());
    check('mission 1 completed by driving the objectives', world.missions.state.storyIndex === 1 && world.player.cash > cashBefore);
    // save / load round-trip
    const snap = JSON.stringify(snapshotSave(world));
    saveGame(world);
    world.player.cash += 999;
    const data = loadSaveData();
    applySave(world, data);
    check('save/load round-trip restores cash and progress', JSON.stringify(snapshotSave(world)) === snap);
  } catch (err) {
    lines.push('FAIL exception: ' + (err && err.message));
  }
  if (!lines.some((l) => l.startsWith('FAIL'))) lines.push('PASS all Solara Heat self-tests');
  return lines;
}
