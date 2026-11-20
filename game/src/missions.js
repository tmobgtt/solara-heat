// The story of Marco Vale, told in eight jobs for Vera, who runs the garage
// in Solara Centro. Each job is a list of steps; a step is a place to reach,
// a crew to clear, a car to bring, or heat to lose. Step kinds:
//   go      reach the marker
//   meet    reach the marker on foot
//   clear   stand at the marker while the crew counter runs down
//   steal   get into the marked car
//   deliver bring the car you are driving to the marker
//   lose    drop to zero stars
// A step may carry `heat`: arriving trips that much wanted heat at once.

export const MISSIONS = [
  {
    id: 'm1', title: 'First Wheels', pay: 300,
    intro: 'Vera: A customer left a sedan at the Centro market. Bring it home, Marco.',
    steps: [
      { kind: 'go', x: 1560, y: 1290, text: 'Reach the marked sedan at the market' },
      { kind: 'deliver', x: 1230, y: 1290, text: 'Deliver the sedan to Vera\u2019s garage' },
    ],
    outro: 'Vera: Clean work. Solara is yours to drive now.',
  },
  {
    id: 'm2', title: 'Hot Package', pay: 450,
    intro: 'Vera: A case is waiting at the Marina docks. Grab it, then lose any tail.',
    steps: [
      { kind: 'meet', x: 1080, y: 3240, text: 'Meet the courier at the Marina docks' },
      { kind: 'go', x: 1740, y: 3360, text: 'Take the case to the drop at Marina east', heat: 40 },
      { kind: 'lose', x: 0, y: 0, text: 'Lose the heat' },
    ],
    outro: 'Vera: The docks pay well when you vanish right.',
  },
  {
    id: 'm3', title: 'Hills Run', pay: 350,
    intro: 'Vera: A Hills client wants his sports car collected from the Centro garage strip.',
    steps: [
      { kind: 'steal', x: 1830, y: 990, text: 'Steal the marked sports car' },
      { kind: 'deliver', x: 3300, y: 1110, text: 'Deliver it to the Hills villa' },
    ],
    outro: 'Vera: The Hills tip in gratitude and silence.',
  },
  {
    id: 'm4', title: 'Port Noise', pay: 600,
    intro: 'Vera: Dario\u2019s crew is leaning on the Old Port warehouse. Clear them out.',
    steps: [
      { kind: 'go', x: 3180, y: 3180, text: 'Reach the Old Port warehouse' },
      { kind: 'clear', x: 3180, y: 3180, crew: 4, text: 'Clear Dario\u2019s crew from the warehouse' },
      { kind: 'deliver', x: 1230, y: 1290, text: 'Report back to Vera\u2019s garage' },
    ],
    outro: 'Vera: The Port breathes again. Dario will remember it.',
  },
  {
    id: 'm5', title: 'Night Ledger', pay: 1000,
    intro: 'Vera: A ledger crosses the city tonight. Meet the carrier, then run it home.',
    steps: [
      { kind: 'meet', x: 2880, y: 1560, text: 'Meet the carrier in The Hills' },
      { kind: 'go', x: 1230, y: 1290, text: 'Run the ledger to Vera\u2019s garage', heat: 70 },
      { kind: 'lose', x: 0, y: 0, text: 'Lose the heat before you park up' },
    ],
    outro: 'Vera: Ledgers burn. Yours arrived cold.',
  },
  {
    id: 'm6', title: 'Marina Heist', pay: 1500,
    intro: 'Vera: One case, one yacht, no names. Take the case from the Marina vault.',
    steps: [
      { kind: 'meet', x: 960, y: 3480, text: 'Slip into the Marina vault' },
      { kind: 'go', x: 1230, y: 1290, text: 'Escape to Vera\u2019s garage with the case', heat: 120 },
      { kind: 'lose', x: 0, y: 0, text: 'Lose the 4-star heat' },
    ],
    outro: 'Vera: That was the big one. Almost the last one.',
  },
  {
    id: 'm7', title: 'Payback at the Port', pay: 1800,
    intro: 'Vera: Dario answered the warehouse. Five of his crew hold the Old Port. End it.',
    steps: [
      { kind: 'go', x: 3300, y: 3300, text: 'Reach Dario\u2019s crew at the Old Port' },
      { kind: 'clear', x: 3300, y: 3300, crew: 5, text: 'Clear five of Dario\u2019s crew' },
      { kind: 'deliver', x: 1230, y: 1290, text: 'Report back to Vera\u2019s garage' },
    ],
    outro: 'Vera: The Port is ours now. One last sunset, Marco.',
  },
  {
    id: 'm8', title: 'One Last Sunset', pay: 2500,
    intro: 'Vera: A buyer at the Marina wants the red sports car from The Hills. Last job.',
    steps: [
      { kind: 'steal', x: 3420, y: 960, text: 'Steal the marked red sports car in The Hills' },
      { kind: 'deliver', x: 1140, y: 3060, text: 'Deliver it to the buyer at the Marina', heat: 150, sting: true },
      { kind: 'lose', x: 0, y: 0, text: 'It was a sting. Lose the 5-star heat' },
    ],
    outro: 'Vera: You beat the sting. Solara is conquered, Marco.',
  },
];

// Side work for free roam: quick money between story jobs.
export const SIDE_JOBS = {
  taxi: { name: 'Taxi fare', pay: 75, key: 'T' },
  courier: { name: 'Courier run', pay: 110, key: 'C' },
  race: { name: 'Street race', pay: 200, key: 'R' },
};
