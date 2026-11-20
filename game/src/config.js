// Solara Heat — tuning constants: the city, the cars, the law and the money.
// Everything the other modules need to agree on lives here, in one place.

// The world is a square of city, measured in pixels; districts are quarters of it.
export const WORLD = 4200;
export const BLOCK = 300;          // city block pitch: road, pavement, building, pavement
export const ROAD = 92;            // road width inside each block pitch

export const DISTRICTS = [
  { name: 'Solara Centro', x: 1050, y: 1050 },
  { name: 'The Hills', x: 3150, y: 1050 },
  { name: 'Marina', x: 1050, y: 3150 },
  { name: 'Old Port', x: 3150, y: 3150 },
];

// Vera's garage: where the story starts, and where stolen cars are fenced.
export const GARAGE = { x: 1230, y: 1290 };

// Wanted heat: stars at these heat levels, heat decays when nobody sees a crime.
export const STAR_HEAT = [10, 28, 55, 95, 150];
export const HEAT_DECAY = 2.4;     // heat per second while unseen
export const HEAT_MAX = 220;

// Cars, best first: top speed in pixels per second.
export const CAR_TYPES = {
  sports: { w: 46, h: 21, top: 470, accel: 340, grip: 3.4, name: 'sports car' },
  sedan: { w: 44, h: 20, top: 330, accel: 240, grip: 3.0, name: 'sedan' },
  truck: { w: 56, h: 24, top: 262, accel: 175, grip: 2.4, name: 'truck' },
  hauler: { w: 62, h: 25, top: 215, accel: 140, grip: 2.0, name: 'hauler' },
};

// Police: ground units chase, the helicopter watches from 4 stars up.
export const COP_TOP = 392;        // a ground unit's top speed
export const HELI_STARS = 4;       // stars at which air support launches
export const HELI_CRUISE = 305;    // the helicopter's cruise speed
export const HELI_SEEN_RANGE = 560; // inside this range its spotlight counts you as seen
export const BUST_SECONDS = 2.6;   // standing still beside a cop this long means busted

export const DAY_LENGTH = 240;     // seconds for a full day cycle
export const SAVE_KEY = 'solara-heat-save-v1';
