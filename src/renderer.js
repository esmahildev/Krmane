// Canvas rendering only. Reads game state, never changes it.

const COLORS = {
  bgA: '#0a1226',
  bgB: '#0d1a33',
  grid: 'rgba(120, 190, 255, 0.10)',
  gridStrong: 'rgba(120, 190, 255, 0.22)',
  snake: '#39ff88',
  snakeBody: '#22d96b',
  snakeDead: '#ff8a5c',
  eye: '#04210f',
  food: '#ff3b4e',
  foodGlow: 'rgba(255, 59, 78, 0.85)',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let cssSize = 0;

  /** Size the canvas backing store for crisp output at the device pixel ratio. */
  function resize(sizeCss) {
    cssSize = Math.max(1, Math.floor(sizeCss));
    const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
    const px = Math.round(cssSize * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground(cols, rows, cell) {
    const size = canvas.width;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, COLORS.bgA);
    grad.addColorStop(1, COLORS.bgB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.lineWidth = Math.max(1, Math.round(cell * 0.04));
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    for (let c = 1; c < cols; c += 1) {
      const x = Math.round(c * cell) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
    }
    for (let r = 1; r < rows; r += 1) {
      const y = Math.round(r * cell) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.gridStrong;
    ctx.lineWidth = Math.max(2, Math.round(cell * 0.08));
    ctx.strokeRect(0, 0, size, size);
  }

  function drawFood(food, cell, time) {
    if (!food) return;
    const cx = (food.x + 0.5) * cell;
    const cy = (food.y + 0.5) * cell;
    const pulse = 1 + 0.08 * Math.sin(time / 180);
    const radius = cell * 0.3 * pulse;
    ctx.save();
    ctx.shadowColor = COLORS.foodGlow;
    ctx.shadowBlur = cell * 0.7;
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnake(state, cell) {
    const dead = state.status === 'over';
    const pad = cell * 0.07;
    const body = dead ? COLORS.snakeDead : COLORS.snakeBody;
    const head = dead ? COLORS.snakeDead : COLORS.snake;

    ctx.save();
    ctx.shadowColor = dead ? 'rgba(255, 138, 92, 0.5)' : 'rgba(57, 255, 136, 0.65)';
    ctx.shadowBlur = cell * 0.5;
    for (let i = state.snake.length - 1; i >= 0; i -= 1) {
      const seg = state.snake[i];
      ctx.fillStyle = i === 0 ? head : body;
      roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
      ctx.fill();
    }
    ctx.restore();

    // Eyes, placed on the side the head is facing.
    const h = state.snake[0];
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[state.direction];
    const cx = (h.x + 0.5) * cell + dx * cell * 0.18;
    const cy = (h.y + 0.5) * cell + dy * cell * 0.18;
    const px = -dy; // perpendicular offset
    const py = dx;
    ctx.fillStyle = COLORS.eye;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + px * side * cell * 0.17, cy + py * side * cell * 0.17, cell * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draw one frame. `time` is a millisecond timestamp (used only for the food pulse). */
  function draw(state, time = 0) {
    if (!cssSize) return;
    const cell = canvas.width / state.cols;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(state.cols, state.rows, cell);
    drawFood(state.food, cell, time);
    drawSnake(state, cell);
  }

  return { resize, draw };
}
