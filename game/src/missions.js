// The story: six jobs for fixer Vera Calloway that take Marco Reyes across Solara City, plus
// repeatable taxi, courier and checkpoint-race side work between story beats — and, new in v2,
// chop-shop deliveries that pay a bonus for an undamaged car and a six-checkpoint street series.
import { REWARDS } from './config.js';
import { roadCentreX, roadCentreY } from './city.js';
import { makePed } from './pedestrians.js';
import { makeCar } from './vehicles.js';

export const CHARACTERS = { vera: 'Vera Calloway', marco: 'Marco Reyes', rival: 'Dario Venn', fare: 'Nervous Fare' };
export function missionDefs(world) {
  const city = world.city, beach = { x: city.marinaOffice.x, y: city.marinaOffice.y };
  const downtown = { x: roadCentreX(4), y: roadCentreY(2) };
  const hills = { x: roadCentreX(1), y: roadCentreY(0) + 30 };
  return [
    { id: 'm1', title: 'First Run', reward: REWARDS.m1, steps: [
      { kind: 'goto', x: beach.x, y: beach.y, r: 46, text: 'Pick up the package at the Marina office.', who: CHARACTERS.vera, line: 'Marco. A package waits at the Marina office. Bring it downtown, no questions.' },
      { kind: 'goto', x: downtown.x, y: downtown.y, r: 46, text: 'Deliver the package downtown.', who: CHARACTERS.vera, line: 'Good wheels. Drop it at the downtown corner and we are in business.' } ] },
    { id: 'm2', title: 'Hot Wheels', reward: REWARDS.m2, steps: [
      { kind: 'steal', x: beach.x - 260, y: roadCentreY(4), r: 60, carType: 'sports', color: '#e8b10e', text: 'Steal the marked yellow sports car at Palm Beach.', who: CHARACTERS.vera, line: 'A collector owes me. His yellow sports car sits at Palm Beach. Take it.' },
      { kind: 'goto', x: city.garage.x, y: city.garage.y, r: 52, car: 'marked', text: 'Deliver the sports car to Vera\'s garage.', who: CHARACTERS.vera, line: 'Bring it to my garage. Scratch it and it comes out of your cut.' } ] },
    { id: 'm3', title: 'Meter Running', reward: REWARDS.m3, steps: [
      { kind: 'goto', x: downtown.x + 60, y: downtown.y + 40, r: 48, needCar: true, text: 'Pick up the fare downtown (you need a car).', who: CHARACTERS.fare, line: 'Taxi! The marina, and step on it, I am late for a boat that does not wait.' },
      { kind: 'goto', x: beach.x - 60, y: beach.y, r: 50, needCar: true, timer: 75, text: 'Get the fare to the Marina before the boat leaves!', who: CHARACTERS.fare, line: 'Faster! I can see the boat from here!' } ] },
    { id: 'm4', title: 'Dockside Business', reward: REWARDS.m4, steps: [
      { kind: 'goto', x: city.stash.x, y: city.stash.y, r: 52, text: 'Meet Vera\'s contact at the Old Port docks.', who: CHARACTERS.vera, line: 'Dario\'s crew jumped my dock contact. Clear the Old Port. The stash there has a pistol.' },
      { kind: 'kill', count: 4, x: city.stash.x, y: city.stash.y, text: 'Clear out Dario\'s crew at the docks.', who: CHARACTERS.rival, line: 'Venn sends his regards, Reyes. You should have stayed a driver.' } ] },
    { id: 'm5', title: 'Marina Heist', reward: REWARDS.m5, steps: [
      { kind: 'goto', x: beach.x, y: beach.y, r: 44, text: 'Grab the cash case at the marina office.', who: CHARACTERS.vera, line: 'The marina office holds tonight\'s take. Grab the case, then lose the heat.' },
      { kind: 'lose', text: 'Lose the 4-star heat!', who: CHARACTERS.vera, line: 'Every cop in Solara is awake. Break their line of sight and stay gone.' } ] },
    { id: 'm6', title: 'Last Ride', reward: REWARDS.m6, steps: [
      { kind: 'race', text: 'Beat Dario through every checkpoint across the city.', who: CHARACTERS.rival, line: 'One race, Reyes. My line against your nerve. Loser leaves Solara.' } ] },
  ];
}
export function createMissions(world) {
  const defs = missionDefs(world);
  const state = { storyIndex: 0, active: null, side: null, sideCounts: { taxi: 0, courier: 0, race: 0, chop: 0, series: 0 }, complete: false, killsLeft: 0, markedCar: null, race: null };
  function say(who, line) { world.dialogue = { who, text: line, t: 6 }; }
  function begin(def, isSide) {
    state.active = { def, step: 0, isSide: !!isSide, timer: null, done: false };
    const first = def.steps[0];
    if (first) { say(first.who, first.line); setupStep(state.active); }
    world.message = def.title + ' — ' + (first ? first.text : '');
  }
  function setupStep(active) {
    const step = active.def.steps[active.step];
    if (!step) return;
    active.timer = step.timer || null;
    if (step.kind === 'steal' && !state.markedCar) {
      const opts = { parked: true };
      if (step.color) opts.color = step.color;
      state.markedCar = makeCar(step.carType || 'sports', step.x, step.y, 0, world.random, opts);
      world.cars.push(state.markedCar);
    }
    if (step.kind === 'kill') {
      state.killsLeft = step.count;
      for (let i = 0; i < step.count; i += 1) {
        world.peds.push(makePed(step.x + world.random.range(-90, 90), step.y + world.random.range(-70, 70), world.random, { enemy: true, shirt: '#3a3f46' }));
      }
    }
    if (step.kind === 'race') {
      const pts = [];
      const count = step.raceCount || 5;
      for (let i = 0; i < count; i += 1) pts.push({ x: roadCentreX(world.random.int(0, 8)), y: roadCentreY(world.random.int(0, 7)) });
      pts.push({ x: world.city.garage.x, y: world.city.garage.y });
      const total = step.raceTime || 150;
      state.race = { pts, idx: 0, rivalT: total, rivalTotal: total, rivalProgress: 0 };
    }
    if (active.def.id === 'm5' && active.step === 1) world.setHeat(120); // the heist trips a full 4-star response
  }
  function finish(active) {
    const reward = typeof active.def.rewardFor === 'function' ? active.def.rewardFor(world, state) : active.def.reward;
    world.addCash(reward);
    world.message = 'Mission complete: ' + active.def.title + '  +$' + reward;
    if (world.audio) world.audio.complete();
    if (active.isSide) {
      if (active.def.id === 'side-taxi') state.sideCounts.taxi += 1;
      if (active.def.id === 'side-courier') state.sideCounts.courier += 1;
      if (active.def.id === 'side-race') state.sideCounts.race += 1;
      if (active.def.id === 'side-chop') state.sideCounts.chop += 1;
      if (active.def.id === 'side-series') state.sideCounts.series += 1;
    } else {
      state.storyIndex += 1;
      if (state.storyIndex >= defs.length) { state.complete = true; world.events.storyComplete = true; }
      world.stats.missionsDone += 1;
    }
    state.active = null; state.markedCar = null; state.race = null;
    world.autosave();
  }
  function fail(reason) {
    world.message = 'Mission failed: ' + reason + ' — head back to Vera\'s garage to retry.';
    if (world.audio) world.audio.fail();
    state.active = null; state.race = null;
  }
  function currentTarget() {
    const a = state.active;
    if (a) {
      const step = a.def.steps[a.step];
      if (!step) return null;
      if (step.kind === 'race' && state.race) { const p = state.race.pts[state.race.idx]; return p ? { x: p.x, y: p.y } : null; }
      if (step.kind === 'kill') return { x: step.x, y: step.y };
      if (step.kind === 'lose') return null;
      return { x: step.x, y: step.y };
    }
    if (state.storyIndex < defs.length) return { x: world.city.garage.x, y: world.city.garage.y, offer: true };
    return null;
  }
  function update(dt) {
    const player = world.player;
    if (!state.active) {
      // Vera's garage marker offers the next story job, then side work once the story is done
      if (state.storyIndex < defs.length) {
        const g = world.city.garage;
        if (Math.hypot(player.x - g.x, player.y - g.y) < 52) begin(defs[state.storyIndex], false);
      }
      return;
    }
    const a = state.active, step = a.def.steps[a.step];
    if (!step) { finish(a); return; }
    if (a.timer !== null && a.timer !== undefined) { a.timer -= dt; if (a.timer <= 0) { fail('out of time'); return; } }
    let advance = false;
    if (step.kind === 'goto' || step.kind === 'steal') {
      const inMarked = step.car === 'marked' ? player.car === state.markedCar : true;
      const near = Math.hypot(player.x - step.x, player.y - step.y) < step.r;
      if (step.kind === 'steal') advance = near && (player.car === state.markedCar || !!state.markedCar);
      else advance = near && inMarked && (!step.needCar || !!player.car);
      if (step.kind === 'steal' && player.car === state.markedCar) advance = true;
    } else if (step.kind === 'kill') advance = state.killsLeft <= 0;
    else if (step.kind === 'lose') advance = world.police.stars === 0;
    else if (step.kind === 'race' && state.race) {
      const r = state.race;
      r.rivalT -= dt; r.rivalProgress += dt / r.rivalTotal;
      const p = r.pts[r.idx];
      if (p && Math.hypot(player.x - p.x, player.y - p.y) < 62) { r.idx += 1; if (world.audio) world.audio.money(); }
      if (r.idx >= r.pts.length) advance = true;
      else if (r.rivalT <= 0) { fail('Dario reached the finish first'); return; }
    }
    if (advance) {
      a.step += 1;
      if (a.step >= a.def.steps.length) finish(a);
      else { const next = a.def.steps[a.step]; say(next.who, next.line); world.message = next.text; setupStep(a); }
    }
  }
  function startSide(kind) {
    if (state.active) return;
    const city = world.city;
    if (kind === 'taxi') begin({ id: 'side-taxi', title: 'Taxi Fare', reward: REWARDS.taxi, steps: [
      { kind: 'goto', x: roadCentreX(world.random.int(0, 8)), y: roadCentreY(world.random.int(0, 7)), r: 48, needCar: true, text: 'Pick up the fare.', who: 'Fare', line: 'Thanks for stopping!' },
      { kind: 'goto', x: roadCentreX(world.random.int(0, 8)), y: roadCentreY(world.random.int(0, 7)), r: 50, needCar: true, text: 'Drop the fare off.', who: 'Fare', line: 'Keep the change, driver.' } ] }, true);
    else if (kind === 'courier') begin({ id: 'side-courier', title: 'Courier Run', reward: REWARDS.courier, steps: [
      { kind: 'goto', x: city.stash.x, y: city.stash.y, r: 46, text: 'Collect the package at the Old Port.', who: CHARACTERS.vera, line: 'One more package, same as ever.' },
      { kind: 'goto', x: roadCentreX(world.random.int(0, 8)), y: roadCentreY(world.random.int(0, 7)), r: 48, text: 'Deliver the package.', who: CHARACTERS.vera, line: 'Signed, sealed, paid.' } ] }, true);
    else if (kind === 'chop') begin({ id: 'side-chop', title: 'Chop Shop', reward: REWARDS.chop,
      rewardFor: (w, s) => REWARDS.chop + Math.round(REWARDS.chopBonusMax * Math.max(0, (s.markedCar ? s.markedCar.health : 0)) / 100), steps: [
      { kind: 'steal', x: roadCentreX(world.random.int(2, 7)), y: roadCentreY(world.random.int(1, 6)), r: 60, carType: world.random.pick(['sports', 'sedan', 'compact']), text: 'Steal the marked car for the chop shop.', who: CHARACTERS.vera, line: 'A buyer wants parts, Marco. The marked car — and bring it back clean for a bonus.' },
      { kind: 'goto', x: city.garage.x, y: city.garage.y, r: 52, car: 'marked', text: 'Deliver it to Vera\'s garage. Less damage, more bonus.', who: CHARACTERS.vera, line: 'Roll it into the garage. Every dent comes off the bonus.' } ] }, true);
    else if (kind === 'series') begin({ id: 'side-series', title: 'Street Series', reward: REWARDS.series, steps: [
      { kind: 'race', raceCount: 6, raceTime: 240, text: 'Six checkpoints, then Vera\'s garage.', who: CHARACTERS.rival, line: 'The whole series this time, Reyes. Try to keep up.' } ] }, true);
    else begin({ id: 'side-race', title: 'Checkpoint Race', reward: REWARDS.race, steps: [
      { kind: 'race', text: 'Hit every checkpoint before the clock runs out.', who: CHARACTERS.rival, line: 'Clock is ticking, Reyes.' } ] }, true);
  }
  return {
    state, defs, update, startSide, currentTarget, say,
    objectiveText() {
      const a = state.active;
      if (a) {
        const s = a.def.steps[a.step];
        let text = s ? s.text : '';
        if (s && s.kind === 'race' && state.race) text += ' — checkpoint ' + Math.min(state.race.idx + 1, state.race.pts.length) + ' of ' + state.race.pts.length;
        const t = currentTarget();
        if (t && !t.offer) text += ' · ' + Math.max(10, Math.round(Math.hypot(world.player.x - t.x, world.player.y - t.y) / 10)) + 'm';
        return { title: a.def.title, text, timer: a.timer };
      }
      if (state.storyIndex < defs.length) return { title: 'Story', text: 'See Vera at her garage for the next job: ' + defs[state.storyIndex].title, timer: null };
      return { title: 'Free Roam', text: 'Solara is yours. Side jobs: T taxi, C courier, R race, H chop shop, G street series.', timer: null };
    },
    onPedKilled(ped) { if (ped.enemy && state.active && state.active.def.steps[state.active.step] && state.active.def.steps[state.active.step].kind === 'kill') state.killsLeft -= 1; },
    beginStoryAt(index) { state.storyIndex = index; state.active = null; if (index < defs.length) begin(defs[index], false); },
  };
}
