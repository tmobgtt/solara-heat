// Keyboard and mouse state: held movement keys, one-shot action flags (interact, pause, confirm),
// sprint and handbrake, plus the mouse position in canvas pixels and its buttons for aiming.
export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CONFIRM = 4;

const HELD = new Map();
const CODEMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'handbrake', KeyJ: 'shootKey' };

export function createInput(canvas) {
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false };
  window.addEventListener('keydown', (e) => {
    const k = CODEMAP[e.code];
    if (k) { HELD.set(k, true); e.preventDefault(); }
    if (e.code === 'KeyE' && !e.repeat) actions |= ACTION_INTERACT;
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) actions |= ACTION_PAUSE;
    if (e.code === 'Enter' && !e.repeat) actions |= ACTION_CONFIRM;
  });
  window.addEventListener('keyup', (e) => { const k = CODEMAP[e.code]; if (k) HELD.set(k, false); });
  window.addEventListener('blur', () => HELD.clear());
  canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener('pointerdown', () => { mouse.down = true; actions |= ACTION_CONFIRM; });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  return {
    mouse,
    held: (k) => !!HELD.get(k),
    moveX() { return (HELD.get('right') ? 1 : 0) - (HELD.get('left') ? 1 : 0); },
    moveY() { return (HELD.get('down') ? 1 : 0) - (HELD.get('up') ? 1 : 0); },
    snapshot() {
      return { moveX: this.moveX(), moveY: this.moveY(), sprint: !!HELD.get('sprint'), handbrake: !!HELD.get('handbrake'), shoot: mouse.down || !!HELD.get('shootKey'), interact: !!(actions & ACTION_INTERACT), mouseX: mouse.x, mouseY: mouse.y };
    },
    takeActions() { const a = actions; actions = 0; return a; },
    clearActions() { actions = 0; },
  };
}
export function scriptedInput(overrides) {
  return Object.assign({ moveX: 0, moveY: 0, sprint: false, handbrake: false, shoot: false, interact: false, mouseX: 0, mouseY: 0 }, overrides || {});
}
