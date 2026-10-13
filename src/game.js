// Pure game rules. No DOM, no timers, no rendering: everything here can be unit-tested in Node.

export const GAME_CONFIG = Object.freeze({
  GRID_COLS: 24,
  GRID_ROWS: 24,
  INITIAL_LENGTH: 3,
  POINTS_PER_FOOD: 10,
  MAX_QUEUED_INPUTS: 2,
  // interval = ms between snake moves. It shrinks by `step` per food eaten, never below `min`.
  DIFFICULTIES: Object.freeze({
    easy: Object.freeze({ label: 'Easy', startInterval: 170, step: 3, minInterval: 90 }),
    normal: Object.freeze({ label: 'Normal', startInterval: 120, step: 3, minInterval: 60 }),
    hard: Object.freeze({ label: 'Hard', startInterval: 85, step: 3, minInterval: 40 }),
  }),
  DEFAULT_DIFFICULTY: 'normal',
});

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

const OPPOSITE = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });

export function isDifficulty(key) {
  return Object.prototype.hasOwnProperty.call(GAME_CONFIG.DIFFICULTIES, key);
}

/** Milliseconds between moves for a difficulty after `eaten` food items. */
export function getTickInterval(difficultyKey, eaten) {
  const d = GAME_CONFIG.DIFFICULTIES[difficultyKey] ?? GAME_CONFIG.DIFFICULTIES[GAME_CONFIG.DEFAULT_DIFFICULTY];
  return Math.max(d.minInterval, d.startInterval - eaten * d.step);
}

/**
 * Create a fresh game. Options exist mainly so tests can build small or pre-arranged boards.
 * `snake` is head-first; `direction` is the way the head is currently travelling.
 */
export function createGame({
  cols = GAME_CONFIG.GRID_COLS,
  rows = GAME_CONFIG.GRID_ROWS,
  initialLength = GAME_CONFIG.INITIAL_LENGTH,
  pointsPerFood = GAME_CONFIG.POINTS_PER_FOOD,
  rng = Math.random,
  snake = null,
  direction = 'right',
} = {}) {
  const startSnake = snake
    ? snake.map((c) => ({ x: c.x, y: c.y }))
    : buildStartingSnake(cols, rows, initialLength);

  const state = {
    cols,
    rows,
    pointsPerFood,
    rng,
    snake: startSnake,
    direction,
    queue: [],
    food: null,
    score: 0,
    eaten: 0,
    status: 'running', // 'running' | 'over' | 'won'
    cause: null, // why the game ended: 'wall' | 'self' | 'full'
  };
  if (!spawnFood(state)) {
    state.status = 'won';
    state.cause = 'full';
  }
  return state;
}

function buildStartingSnake(cols, rows, length) {
  const y = Math.floor(rows / 2);
  const headX = Math.min(cols - 1, Math.max(length - 1, Math.floor(cols / 2)));
  const cells = [];
  for (let i = 0; i < length; i += 1) cells.push({ x: headX - i, y });
  return cells;
}

/**
 * Queue a direction change. Compared against the last *queued* direction (not just the current one)
 * so two quick presses like Up then Left cannot sneak in a 180-degree reversal.
 * Returns true if accepted.
 */
export function queueDirection(state, dirName) {
  if (state.status !== 'running' || !(dirName in DIRECTIONS)) return false;
  if (state.queue.length >= GAME_CONFIG.MAX_QUEUED_INPUTS) return false;
  const reference = state.queue.length ? state.queue[state.queue.length - 1] : state.direction;
  if (dirName === reference || dirName === OPPOSITE[reference]) return false;
  state.queue.push(dirName);
  return true;
}

/** Place food on a random free cell. Returns false (and clears food) when the board is full. */
export function spawnFood(state) {
  const occupied = new Set(state.snake.map((c) => c.y * state.cols + c.x));
  const total = state.cols * state.rows;
  if (occupied.size >= total) {
    state.food = null;
    return false;
  }
  // Pick the n-th free cell directly: no retry loop, so it always terminates.
  const freeCount = total - occupied.size;
  let n = Math.min(freeCount - 1, Math.floor(state.rng() * freeCount));
  for (let i = 0; i < total; i += 1) {
    if (occupied.has(i)) continue;
    if (n === 0) {
      state.food = { x: i % state.cols, y: Math.floor(i / state.cols) };
      return true;
    }
    n -= 1;
  }
  return false; // unreachable
}

/**
 * Advance one move. Returns 'move' | 'eat' | 'wall' | 'self' | 'win' | 'noop'.
 */
export function step(state) {
  if (state.status !== 'running') return 'noop';

  if (state.queue.length) state.direction = state.queue.shift();
  const delta = DIRECTIONS[state.direction];
  const head = state.snake[0];
  const next = { x: head.x + delta.x, y: head.y + delta.y };

  if (next.x < 0 || next.y < 0 || next.x >= state.cols || next.y >= state.rows) {
    state.status = 'over';
    state.cause = 'wall';
    return 'wall';
  }

  const eating = state.food !== null && next.x === state.food.x && next.y === state.food.y;
  // When not eating, the tail cell is vacated this move, so the head may legally move into it.
  const blockers = eating ? state.snake : state.snake.slice(0, -1);
  if (blockers.some((c) => c.x === next.x && c.y === next.y)) {
    state.status = 'over';
    state.cause = 'self';
    return 'self';
  }

  state.snake.unshift(next);
  if (!eating) {
    state.snake.pop();
    return 'move';
  }

  state.score += state.pointsPerFood;
  state.eaten += 1;
  if (!spawnFood(state)) {
    state.status = 'won';
    state.cause = 'full';
    return 'win';
  }
  return 'eat';
}
