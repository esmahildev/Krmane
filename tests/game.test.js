import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG, createGame, getTickInterval, queueDirection, spawnFood, step } from '../src/game.js';

// Deterministic helper: build a game on a small board with food at a chosen cell.
function arranged({ cols = 8, rows = 8, snake, direction = 'right', food }) {
  const g = createGame({ cols, rows, snake, direction, rng: () => 0 });
  if (food) g.food = { ...food };
  return g;
}

test('starts with configured length, moving right, food off the snake', () => {
  const g = createGame();
  assert.equal(g.snake.length, GAME_CONFIG.INITIAL_LENGTH);
  assert.equal(g.direction, 'right');
  assert.equal(g.status, 'running');
  assert.equal(g.score, 0);
  assert.ok(!g.snake.some((c) => c.x === g.food.x && c.y === g.food.y));
});

test('moves one cell in each of the four directions', () => {
  // Each case starts heading perpendicular to the new direction so the turn is legal.
  const cases = [
    { dir: 'up', from: 'right', dx: 0, dy: -1 },
    { dir: 'down', from: 'right', dx: 0, dy: 1 },
    { dir: 'left', from: 'up', dx: -1, dy: 0 },
    { dir: 'right', from: 'up', dx: 1, dy: 0 },
  ];
  for (const { dir, from, dx, dy } of cases) {
    const tail = from === 'right' ? { x: 3, y: 4 } : { x: 4, y: 5 };
    const g = arranged({ snake: [{ x: 4, y: 4 }, tail], direction: from, food: { x: 0, y: 0 } });
    assert.ok(queueDirection(g, dir), dir + ' accepted');
    assert.equal(step(g), 'move');
    assert.deepEqual(g.snake[0], { x: 4 + dx, y: 4 + dy });
  }
});

test('reverse direction is rejected', () => {
  const g = createGame();
  assert.equal(queueDirection(g, 'left'), false);
  assert.equal(queueDirection(g, 'right'), false); // same direction: nothing to queue
  assert.deepEqual(g.queue, []);
});

test('rapid key presses cannot reverse the snake into itself', () => {
  // Heading right; player taps Down, Up, Left within one tick.
  const g = arranged({ snake: [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }], food: { x: 0, y: 0 } });
  assert.equal(queueDirection(g, 'down'), true);
  assert.equal(queueDirection(g, 'up'), false); // reverses the queued 'down'
  assert.equal(queueDirection(g, 'left'), true); // perpendicular to 'down'
  assert.equal(step(g), 'move');
  assert.equal(g.direction, 'down');
  assert.equal(step(g), 'move');
  assert.equal(g.direction, 'left');
  assert.equal(g.status, 'running');
});

test('input queue is capped', () => {
  const g = arranged({ snake: [{ x: 4, y: 4 }, { x: 3, y: 4 }], food: { x: 0, y: 0 } });
  assert.ok(queueDirection(g, 'up'));
  assert.ok(queueDirection(g, 'left'));
  assert.equal(queueDirection(g, 'down'), false);
  assert.equal(g.queue.length, GAME_CONFIG.MAX_QUEUED_INPUTS);
});

test('eating food scores, grows by one, and respawns food off the snake', () => {
  const g = arranged({ snake: [{ x: 2, y: 2 }, { x: 1, y: 2 }], food: { x: 3, y: 2 } });
  assert.equal(step(g), 'eat');
  assert.equal(g.score, GAME_CONFIG.POINTS_PER_FOOD);
  assert.equal(g.eaten, 1);
  assert.equal(g.snake.length, 3);
  assert.ok(!g.snake.some((c) => c.x === g.food.x && c.y === g.food.y));
});

test('score and length stay consistent over many foods', () => {
  const g = arranged({ cols: 20, rows: 3, snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], food: { x: 2, y: 1 } });
  let eaten = 0;
  for (let i = 0; i < 10; i += 1) {
    g.food = { x: g.snake[0].x + 1, y: 1 };
    assert.equal(step(g), 'eat');
    eaten += 1;
    assert.equal(g.score, eaten * GAME_CONFIG.POINTS_PER_FOOD);
    assert.equal(g.snake.length, 2 + eaten);
  }
});

test('hitting each wall ends the game', () => {
  const cases = [
    { snake: [{ x: 0, y: 3 }, { x: 1, y: 3 }], direction: 'left' },
    { snake: [{ x: 7, y: 3 }, { x: 6, y: 3 }], direction: 'right' },
    { snake: [{ x: 3, y: 0 }, { x: 3, y: 1 }], direction: 'up' },
    { snake: [{ x: 3, y: 7 }, { x: 3, y: 6 }], direction: 'down' },
  ];
  for (const c of cases) {
    const g = arranged({ ...c, food: { x: 5, y: 5 } });
    assert.equal(step(g), 'wall');
    assert.equal(g.status, 'over');
    assert.equal(g.cause, 'wall');
    assert.equal(step(g), 'noop'); // frozen after the end
  }
});

test('colliding with own body ends the game', () => {
  // Head at (3,3) heading right into body cell (4,3).
  const snake = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }];
  const g = arranged({ snake, direction: 'right', food: { x: 0, y: 0 } });
  assert.equal(step(g), 'self');
  assert.equal(g.cause, 'self');
});

test('moving into the cell the tail is vacating is legal', () => {
  // Snake chases its own tail around a 2x2 loop.
  const snake = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }];
  const g = arranged({ snake, direction: 'up', food: { x: 5, y: 5 } });
  queueDirection(g, 'right'); // head (1,1) -> (2,1), where the tail is right now
  assert.equal(step(g), 'move');
  assert.equal(g.status, 'running');
});

test('eating while the head targets the tail cell is a collision (tail does not move)', () => {
  const snake = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }];
  const g = arranged({ snake, direction: 'up', food: { x: 2, y: 1 } }); // food under the tail (artificial)
  queueDirection(g, 'right');
  assert.equal(step(g), 'self');
});

test('food never spawns on the snake (many random seeds)', () => {
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const g = createGame({ cols: 5, rows: 5, rng });
  g.snake = [];
  for (let x = 0; x < 5; x += 1) for (let y = 0; y < 4; y += 1) g.snake.push({ x, y });
  for (let i = 0; i < 500; i += 1) {
    assert.ok(spawnFood(g));
    assert.equal(g.food.y, 4); // only the bottom row is free
  }
});

test('rng returning exactly 1 (or beyond) still picks a valid free cell', () => {
  const g = createGame({ cols: 3, rows: 1, snake: [{ x: 0, y: 0 }], rng: () => 1 });
  assert.deepEqual(g.food, { x: 2, y: 0 });
});

test('full board: spawnFood terminates and eating the last food wins', () => {
  // 3x1 board, snake fills 2 cells, one food left. Eating it fills the board.
  const g = createGame({ cols: 3, rows: 1, snake: [{ x: 1, y: 0 }, { x: 0, y: 0 }], direction: 'right', rng: () => 0 });
  assert.deepEqual(g.food, { x: 2, y: 0 });
  assert.equal(step(g), 'win');
  assert.equal(g.status, 'won');
  assert.equal(g.cause, 'full');
  assert.equal(g.food, null);
  assert.equal(g.snake.length, 3);
  assert.equal(step(g), 'noop');
});

test('a game created on an already-full board is immediately won', () => {
  const g = createGame({ cols: 2, rows: 1, snake: [{ x: 1, y: 0 }, { x: 0, y: 0 }] });
  assert.equal(g.status, 'won');
});

test('speed ramps up with food, never below the cap, per difficulty', () => {
  for (const [key, d] of Object.entries(GAME_CONFIG.DIFFICULTIES)) {
    assert.equal(getTickInterval(key, 0), d.startInterval);
    assert.ok(getTickInterval(key, 5) < d.startInterval);
    assert.equal(getTickInterval(key, 10_000), d.minInterval);
  }
  assert.ok(getTickInterval('easy', 0) > getTickInterval('normal', 0));
  assert.ok(getTickInterval('normal', 0) > getTickInterval('hard', 0));
  assert.equal(getTickInterval('bogus', 0), GAME_CONFIG.DIFFICULTIES.normal.startInterval);
});

test('a full 24x24 game can be simulated without errors', () => {
  const g = createGame();
  // Greedy-ish random walk: just make sure nothing throws and invariants hold until it ends.
  const dirs = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < 5000 && g.status === 'running'; i += 1) {
    queueDirection(g, dirs[Math.floor(Math.random() * 4)]);
    step(g);
    assert.equal(g.snake.length, GAME_CONFIG.INITIAL_LENGTH + g.eaten);
    assert.equal(g.score, g.eaten * GAME_CONFIG.POINTS_PER_FOOD);
    const keys = new Set(g.snake.map((c) => `${c.x},${c.y}`));
    assert.equal(keys.size, g.snake.length, 'no overlapping segments');
  }
});
