// Deterministic screenshot scenes behind ?shot=title|drive|chase|mission, staged in the real
// simulation, and the ?test=1 self-test that drives the real sim through a scripted sequence.
// v2 staging: a dusk rush-hour downtown behind the title, a daylight drive, a four-star chase
// after dark (lit windows, lamp glow, headlights, siren wash), and the Marina Heist escape.
import { STEP } from './config.js';
import { roadCentreX, roadCentreY } from './city.js';
import { scriptedInput } from './input.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { saveGame, loadSaveData, applySave, snapshotSave } from './save.js';
import { CAR_TYPES, makeCar, stepCarPhysics } from './vehicles.js';
import { makePed } from './pedestrians.js';

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
function putPlayerInSportsCar(world, x, y, angle) {
  // the getaway scenes need the sports car: its 470 top speed outruns the police target speed,
  // so Marco stays fast and the shot catches a chase, not a bust
  let car = world.cars.find((c) => c.parked && c.type === 'sports');
  if (!car) { car = makeCar('sports', x, y, angle, world.random, { parked: true }); world.cars.push(car); }
  car.x = x; car.y = y; car.angle = angle; car.speed = 0;
  world.player.x = x; world.player.y = y + 30;
  runSteps(world, 1, scriptedInput({ interact: true }));
  return world.player.car || car;
}
export function stageShot(name, world) {
  if (name === 'drive') {
    world.clockMinutes = 10.5 * 60; // late morning, full colour
    putPlayerInCar(world);
    runSteps(world, 150, scriptedInput({ moveY: -1 }));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    world.clockMinutes = 21.6 * 60; // night: the city lights do the talking
    world.missions.beginStoryAt(0);
    putPlayerInSportsCar(world, roadCentreX(1), roadCentreY(3), 0);
    world.setHeat(140); // four stars
    // two units already on his tail, close enough to stay in frame while he outruns them
    world.cars.push(makeCar('police', world.player.x - 260, roadCentreY(3) - 26, 0, world.random, { traffic: false }));
    world.cars.push(makeCar('police', world.player.x - 370, roadCentreY(3) + 30, 0, world.random, { traffic: false }));
    runSteps(world, 150, scriptedInput({ moveY: -1 }));
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // the Marina Heist escape: grab the case, trip the 4-star response, run west into the night
    world.clockMinutes = 20.8 * 60;
    world.missions.beginStoryAt(4); // M5 Marina Heist
    world.player.x = world.city.marinaOffice.x; world.player.y = world.city.marinaOffice.y;
    runSteps(world, 2, scriptedInput());
    // the marina streets are empty at this hour: no civilian traffic, and no parked cars in the
    // escape corridor (they park half in the driving lane), so the run is decided by Marco's
    // right foot and the two units behind him, not by a random crash
    world.cars = world.cars.filter((car) => !car.traffic);
    world.cars = world.cars.filter((car) => !(Math.abs(car.y - roadCentreY(6)) < 80 && car.x > roadCentreX(3) && car.x < roadCentreX(9)));
    putPlayerInSportsCar(world, roadCentreX(8), roadCentreY(6), Math.PI);
    world.cars.push(makeCar('police', world.player.x + 330, roadCentreY(6) - 26, Math.PI, world.random, { traffic: false }));
    world.cars.push(makeCar('police', world.player.x + 440, roadCentreY(6) + 30, Math.PI, world.random, { traffic: false }));
    runSteps(world, 140, scriptedInput({ moveY: -1 }));
    world.say('Vera Calloway', 'Every cop in Solara is awake. Break their line of sight and stay gone.');
    return { screen: SCREEN_PLAY };
  }
  // title: rush hour downtown at dusk behind the title panel — a ring of traffic on the two
  // roads through Marco's junction (one of them a hauler), so the frame around the panel is busy
  world.clockMinutes = 17.8 * 60;
  world.player.x = roadCentreX(4); world.player.y = roadCentreY(3);
  const ring = [
    { type: 'sedan', x: roadCentreX(4) - 20, y: world.player.y - 470, angle: Math.PI / 2 },
    { type: 'taxi', x: roadCentreX(4) + 20, y: world.player.y - 290, angle: -Math.PI / 2 },
    { type: 'compact', x: roadCentreX(4) - 20, y: world.player.y + 250, angle: Math.PI / 2 },
    { type: 'truck', x: roadCentreX(4) + 20, y: world.player.y + 430, angle: -Math.PI / 2 },
    { type: 'sports', x: world.player.x - 560, y: roadCentreY(3) - 20, angle: 0 },
    { type: 'sedan', x: world.player.x - 380, y: roadCentreY(3) + 20, angle: Math.PI },
    { type: 'compact', x: world.player.x + 390, y: roadCentreY(3) - 20, angle: 0 },
    { type: 'hauler', x: world.player.x + 570, y: roadCentreY(3) + 20, angle: Math.PI },
  ];
  for (const spot of ring) {
    const car = makeCar(spot.type, spot.x, spot.y, spot.angle, world.random, { traffic: true, driver: { name: 'driver' } });
    car.ai.dirx = Math.cos(spot.angle); car.ai.diry = Math.sin(spot.angle);
    world.cars.push(car);
  }
  for (let i = 0; i < 16; i += 1) {
    world.peds.push(makePed(world.player.x + world.random.range(-560, 560), world.player.y + world.random.range(-320, 320), world.random));
  }
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
    // v2 heavy class: a hauler under full throttle tops out below a sedan, every time
    const hauler = makeCar('hauler', 500, 500, 0, world.random, {});
    const sedan = makeCar('sedan', 500, 700, 0, world.random, {});
    for (let i = 0; i < 300; i += 1) { stepCarPhysics(hauler, STEP, 1, 0, false); stepCarPhysics(sedan, STEP, 1, 0, false); }
    check('heavy class: the hauler is slower than a sedan', CAR_TYPES.hauler.top < CAR_TYPES.sedan.top && hauler.speed < sedan.speed && hauler.speed > 120);
    // v2 world dressing: the generated city carries the new building kinds and beach umbrellas
    const kinds = new Set(world.city.buildings.map((b) => b.kind));
    check('city variety: shops, houses and warehouses are generated', kinds.has('shop') && kinds.has('house') && kinds.has('warehouse') && world.city.props.some((p) => p.kind === 'umbrella'));
    // v2 chop shop: steal the marked car, deliver it to the garage, get base plus damage bonus
    world.missions.startSide('chop');
    check('chop shop side job starts', !!world.missions.state.active && world.missions.state.active.def.id === 'side-chop');
    const chopCar = world.missions.state.markedCar;
    const chopCash = world.player.cash;
    world.player.x = chopCar.x - 30; world.player.y = chopCar.y;
    runSteps(world, 1, scriptedInput({ interact: true }));
    const inChopCar = world.player.car === chopCar;
    chopCar.x = world.city.garage.x; chopCar.y = world.city.garage.y;
    world.player.x = chopCar.x; world.player.y = chopCar.y;
    runSteps(world, 1, scriptedInput()); // exactly one step: the delivery lands, and no idle step at the garage auto-starts the next story job before the series test below
    check('chop shop delivery pays base plus damage bonus', inChopCar && world.missions.state.sideCounts.chop === 1 && world.player.cash >= chopCash + 220);
    // v2 street series: six checkpoints plus the garage finish, all hittable in order
    world.missions.startSide('series');
    check('street series starts with seven points', !!world.missions.state.active && world.missions.state.active.def.id === 'side-series' && world.missions.state.race.pts.length === 7);
    runSteps(world, 1, scriptedInput({ interact: true })); // step out of the chop car (series already active, so no story auto-start)
    let guard = 0;
    while (world.missions.state.active && guard < 40) {
      const race = world.missions.state.race;
      if (!race || !race.pts[race.idx]) break;
      world.player.x = race.pts[race.idx].x; world.player.y = race.pts[race.idx].y;
      runSteps(world, 2, scriptedInput());
      guard += 1;
    }
    check('street series completes all checkpoints', world.missions.state.sideCounts.series === 1);
  } catch (err) {
    lines.push('FAIL exception: ' + (err && err.message));
  }
  if (!lines.some((l) => l.startsWith('FAIL'))) lines.push('PASS all Solara Heat self-tests');
  return lines;
}
