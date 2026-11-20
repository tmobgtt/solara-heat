// Saving: a small snapshot in localStorage — cash, story progress, side-job
// tallies, the player's place and the car they were driving. Enough to close
// the tab and come back to the same Solara.

import { SAVE_KEY } from './config.js';

export function snapshotOf(state) {
  return {
    cash: state.cash,
    missionIndex: state.missionIndex,
    storyDone: state.storyDone,
    sideCounts: state.sideCounts,
    player: { x: state.player.x, y: state.player.y },
    car: state.player.car
      ? { type: state.player.car.type, x: state.player.car.x, y: state.player.car.y, angle: state.player.car.angle, colour: state.player.car.colour }
      : null,
  };
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotOf(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || typeof data.cash !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // A browser that refuses storage simply starts fresh.
  }
}
