// Keyboard input: a held-keys set plus a pressed-this-frame set, so the game
// can ask "is it down" for driving and "was it just pressed" for doors, jobs
// and menus. Nothing here touches the game state.

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const norm = (event) => (event.key.length === 1 ? event.key.toLowerCase() : event.key);
  window.addEventListener('keydown', (event) => {
    const key = norm(event);
    if (!held.has(key)) pressed.add(key);
    held.add(key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(norm(event)));
  window.addEventListener('blur', () => held.clear());
  return {
    down: (key) => held.has(key),
    hit: (key) => pressed.has(key),
    // Call once per frame, after the update has read the presses.
    endFrame: () => pressed.clear(),
  };
}

// The driving/foot keys, read as one intent object.
export function readIntent(input) {
  return {
    up: input.down('w') || input.down('ArrowUp'),
    down: input.down('s') || input.down('ArrowDown'),
    left: input.down('a') || input.down('ArrowLeft'),
    right: input.down('d') || input.down('ArrowRight'),
    brake: input.down(' '),
    enter: input.hit('f') || input.hit('e') || input.hit('Enter'),
  };
}
