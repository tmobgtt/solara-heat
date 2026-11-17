// Solara Heat tuning: every constant for the city, the player, the law and the money in one place.
export const STEP = 1 / 60;
export const TILE = 40;
export const BLOCK = 6; // tiles per city block (building plot between roads)
export const ROAD = 2; // tiles of road width between blocks
export const COLS = 9, ROWS = 8; // building blocks across and down
export const PITCH = (BLOCK + ROAD) * TILE; // 320 px between road centrelines
export const SEA_X = COLS * PITCH + 260; // water starts east of the last road
export const WORLD_W = SEA_X + 700;
export const WORLD_H = ROWS * PITCH + 120;
export const BEACH_X = COLS * PITCH + 60;

export const PLAYER = { radius: 11, walk: 150, sprint: 235, health: 100, armour: 0 };
export const WANTED = { thresholds: [0, 10, 30, 60, 100, 160], decayPerSec: 2.2, sightRange: 340 };
export const CRIMES = { steal: 12, hitCar: 6, hitPed: 22, killPed: 45, shoot: 8, copCar: 18 };
export const REWARDS = { m1: 250, m2: 400, m3: 300, m4: 600, m5: 900, m6: 1200, taxi: 60, courier: 90, race: 150 };
export const FINE_PER_STAR = 120;
export const PALETTE = {
  road: '#3a3f46', roadLine: '#d8c25a', sidewalk: '#b8ab90', grass: '#79a85b', sand: '#ecd28a',
  sea: '#2e7fb8', seaDeep: '#256a9c', roof: ['#c96f4a', '#b85c48', '#d18a5a', '#a8a29a', '#7d8ca3', '#c2b280'],
  wall: '#e8dcc4', player: '#f2b234', cop: '#2b4c9b', text: '#f5f2e8', danger: '#e5534b', gold: '#f2c94c',
};
export const DISTRICTS = ['Downtown', 'Marina', 'Old Port', 'Palm Beach', 'The Hills', 'Midtown', 'Harbour View', 'Solara Centro'];
export const SAVE_KEY = 'solara-heat.save.v1';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
