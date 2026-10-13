// Keyboard handling. keyToAction is pure (testable); attachInput wires it to the DOM.

const DIRECTION_KEYS = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

const ACTION_KEYS = {
  ' ': 'space',
  spacebar: 'space',
  enter: 'enter',
  escape: 'escape',
  p: 'pause',
  m: 'mute',
  f: 'fullscreen',
  1: 'easy',
  2: 'normal',
  3: 'hard',
};

/**
 * Map a KeyboardEvent-like object to an action:
 *   { type: 'dir', dir } | { type: 'space'|'enter'|'escape'|'pause'|'mute'|'fullscreen'|'easy'|'normal'|'hard' } | null
 * Keys are matched on the printed character (event.key) so WASD follows the key labels on any layout.
 */
export function keyToAction(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) return null;
  const key = String(event.key ?? '').toLowerCase();
  if (key in DIRECTION_KEYS) return { type: 'dir', dir: DIRECTION_KEYS[key] };
  if (key in ACTION_KEYS) return { type: ACTION_KEYS[key] };
  return null;
}

const BLOCKED_DEFAULTS = new Set(['dir', 'space', 'enter']);

/**
 * Listen for game keys on `target`. Returns a function that removes the listeners.
 * Arrow keys / Space / Enter have their default behaviour suppressed (page scroll, button activation)
 * so a focused button cannot be "clicked" a second time by the same key press.
 */
export function attachInput(target, onAction) {
  const onKeyDown = (event) => {
    const action = keyToAction(event);
    if (!action) return;
    if (BLOCKED_DEFAULTS.has(action.type)) event.preventDefault();
    if (event.repeat) return; // holding a key must not retrigger actions
    onAction(action);
  };
  const onKeyUp = (event) => {
    // Space activates a focused button on keyup, so suppress that too.
    const action = keyToAction(event);
    if (action && BLOCKED_DEFAULTS.has(action.type)) event.preventDefault();
  };
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
  };
}
