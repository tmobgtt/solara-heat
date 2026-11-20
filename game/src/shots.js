// Screenshot staging: ?shot=<name> poses the game for one of the four
// screenshots. Each scene sets the hour, the player, the traffic, the law
// and the words on screen, so the picture shows real systems of the game —
// the city, a drive, a five-star chase with the helicopter up, and the
// Marina Heist escape — never a mock-up.

import { GARAGE } from './config.js';
import { MISSIONS } from './missions.js';
import { updatePolice } from './police.js';
import { districtAt, makeCar } from './world.js';

function viewSize() {
  return { vw: Math.min(window.innerWidth, 1600), vh: Math.min(window.innerHeight, 1000) };
}

function centreCamera(state) {
  const { vw, vh } = viewSize();
  state.camera.x = Math.max(0, state.player.x - vw / 2);
  state.camera.y = Math.max(0, state.player.y - vh / 2);
}

function extraTraffic(state, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const vertical = i % 2 === 0;
    const along = (i - count / 2) * 130;
    const car = makeCar(i % 5 === 4 ? 'hauler' : i % 3 === 0 ? 'truck' : 'sedan',
      vertical ? cx + 46 : cx + along, vertical ? cy + along : cy + 46,
      vertical ? Math.PI / 2 : 0, ['#c23b2e', '#2e5fc2', '#d9a441', '#3f9e4d'][i % 4]);
    car.driver = 'traffic';
    state.cars.push(car);
  }
}

function extraPeds(state, cx, cy, count) {
  for (let i = 0; i < count; i++) {
    state.peds.push({
      x: cx + state.rng.range(-260, 260), y: cy + state.rng.range(-200, 200),
      angle: state.rng.range(0, Math.PI * 2), speed: 40,
      skin: '#d99e63', shirt: ['#d94f4f', '#4f7ad9', '#4fd98a'][i % 3], gait: 'walker', turn: 5,
    });
  }
}

function putPlayerInCar(state, type, x, y, angle, colour) {
  const car = makeCar(type, x, y, angle, colour);
  car.driver = 'player';
  state.cars.push(car);
  state.player.car = car;
  state.player.x = x;
  state.player.y = y;
  return car;
}

// Pose the named scene on the state. Called once at boot for screenshots.
export function stageShot(state, name) {
  if (name === 'cover') {
    state.hour = 17.8; // dusk over Solara Centro
    state.player.x = GARAGE.x + 46;
    state.player.y = GARAGE.y + 120;
    extraTraffic(state, GARAGE.x, GARAGE.y, 8);
    extraPeds(state, GARAGE.x, GARAGE.y, 16);
    state.showTitle = true;
  } else if (name === 'drive') {
    state.hour = 10.5;
    const car = putPlayerInCar(state, 'sedan', 1590, 1350, 0, '#2e5fc2');
    car.speed = 210;
    extraTraffic(state, 1900, 1350, 3);
    extraPeds(state, 1650, 1420, 6);
  } else if (name === 'chase') {
    state.hour = 21.6; // night, five stars, air support up
    const car = putPlayerInCar(state, 'sports', 2040, 1546, 0, '#c23b2e');
    car.speed = 330;
    state.heat = 150;
    state.stars = 5;
    state.mission = MISSIONS[7];
    state.stepIndex = 2; // the sting finale: "lose the 5-star heat"
    for (let i = 0; i < 12; i++) updatePolice(state, 0.25);
    // Every unit behind the player on the same road, none on top of him.
    state.police.units.forEach((unit, i) => {
      unit.x = car.x - 130 - i * 95;
      unit.y = car.y + (i % 2 === 0 ? -32 : 36);
      unit.angle = 0;
      unit.speed = 300;
    });
    const heli = state.police.heli;
    heli.active = true;
    heli.x = car.x + 170;
    heli.y = car.y - 160;
    state.dialogue = { text: 'Vera: They have a helicopter up - break the spotlight, Marco!', until: 9999 };
  } else if (name === 'mission') {
    state.hour = 21.9; // the Marina Heist escape, at night
    const car = putPlayerInCar(state, 'sports', 1140, 3150, Math.PI, '#7a4fd0');
    car.speed = 260;
    state.heat = 120;
    state.stars = 4;
    state.mission = MISSIONS[5];
    state.stepIndex = 1; // escape to the garage with the case
    for (let i = 0; i < 10; i++) updatePolice(state, 0.25);
    const units = state.police.units;
    if (units[0]) { units[0].x = car.x + 130; units[0].y = car.y - 30; units[0].angle = Math.PI; }
    if (units[1]) { units[1].x = car.x + 205; units[1].y = car.y + 38; units[1].angle = Math.PI; }
    state.police.heli.active = false;
    state.dialogue = { text: 'Vera: Case is in the car. West, fast, do not stop.', until: 9999 };
  }
  state.district = districtAt(state.player.x, state.player.y);
  centreCamera(state);
}
