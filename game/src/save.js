// Saves in localStorage: cash, story progress, side-job counts, where Marco stands and his stats.
// A round-trip self-check proves a save written is a save that reads back identical.
import { SAVE_KEY } from './config.js';

export function snapshotSave(world) {
  return {
    v: 1, cash: world.player.cash, storyIndex: world.missions.state.storyIndex, complete: world.missions.state.complete,
    side: world.missions.state.sideCounts, x: Math.round(world.player.x), y: Math.round(world.player.y),
    weapon: world.player.weapon, ammo: world.player.ammo, stats: world.stats,
  };
}
export function saveGame(world) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotSave(world))); return true; } catch { return false; }
}
export function loadSaveData() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function applySave(world, data) {
  if (!data) return false;
  world.player.cash = data.cash | 0;
  world.player.x = data.x || world.player.x; world.player.y = data.y || world.player.y;
  world.player.weapon = data.weapon || 'fists'; world.player.ammo = data.ammo | 0;
  world.missions.state.storyIndex = data.storyIndex | 0;
  world.missions.state.complete = !!data.complete;
  Object.assign(world.missions.state.sideCounts, data.side || {});
  Object.assign(world.stats, data.stats || {});
  return true;
}
export function hasSave() { return loadSaveData() !== null; }
export function saveRoundTripCheck(world) {
  const before = JSON.stringify(snapshotSave(world));
  if (!saveGame(world)) return false;
  const data = loadSaveData();
  return data !== null && JSON.stringify(data) === before;
}
