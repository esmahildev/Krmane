// Application controller: screens, game loop, and wiring between input, rules, rendering, audio, storage.
import { GAME_CONFIG, createGame, getTickInterval, queueDirection, step, isDifficulty } from './game.js';
import { createRenderer } from './renderer.js';
import { attachInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSettings, saveSettings } from './storage.js';

const $ = (id) => document.getElementById(id);
const el = {
  score: $('score'),
  best: $('best'),
  speed: $('speed'),
  difficultyLabel: $('difficultyLabel'),
  pauseBtn: $('pauseBtn'),
  soundBtn: $('soundBtn'),
  fullscreenBtn: $('fullscreenBtn'),
  boardArea: $('boardArea'),
  boardStage: $('boardStage'),
  canvas: $('board'),
  menu: $('menuOverlay'),
  pause: $('pauseOverlay'),
  over: $('overOverlay'),
  overTitle: $('overTitle'),
  recordMsg: $('recordMsg'),
  finalScore: $('finalScore'),
  finalBest: $('finalBest'),
  difficultyGroup: $('difficultyGroup'),
  menuSoundBtn: $('menuSoundBtn'),
};

const settings = loadSettings();
const audio = createAudio({ enabled: settings.sound });
const renderer = createRenderer(el.canvas);

/** screen: 'menu' | 'playing' | 'paused' | 'over' */
let screen = 'menu';
let game = createGame();
let accumulator = 0;
let lastFrame = 0;
let rafId = 0;
const MAX_FRAME_DELTA = 250; // ms; stops a long stall (tab switch, debugger) from replaying many moves

// ---------- Settings ----------
function persist() {
  saveSettings(settings);
}

function setDifficulty(key) {
  if (!isDifficulty(key) || key === settings.difficulty) return;
  settings.difficulty = key;
  persist();
  audio.play('click');
  refreshUi();
}

function setSound(on) {
  settings.sound = on;
  audio.setEnabled(on);
  persist();
  if (on) audio.play('click');
  refreshUi();
}

// ---------- UI ----------
function refreshUi() {
  const diff = GAME_CONFIG.DIFFICULTIES[settings.difficulty];
  el.score.textContent = String(game.score);
  el.best.textContent = String(settings.bestScore);
  el.difficultyLabel.textContent = diff.label;
  const interval = getTickInterval(settings.difficulty, game.eaten);
  el.speed.textContent = `${(diff.startInterval / interval).toFixed(1)}×`;

  for (const btn of el.difficultyGroup.querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.difficulty === settings.difficulty));
  }
  const soundLabel = settings.sound ? 'On' : 'Off';
  el.menuSoundBtn.textContent = `Sound: ${soundLabel}`;
  el.menuSoundBtn.setAttribute('aria-pressed', String(settings.sound));
  el.soundBtn.setAttribute('aria-pressed', String(settings.sound));

  el.menu.hidden = screen !== 'menu';
  el.pause.hidden = screen !== 'paused';
  el.over.hidden = screen !== 'over';
  el.pauseBtn.textContent = screen === 'paused' ? '▶' : '❚❚';
  el.pauseBtn.setAttribute('aria-label', screen === 'paused' ? 'Resume' : 'Pause');
  el.pauseBtn.disabled = screen !== 'playing' && screen !== 'paused';
  document.body.dataset.screen = screen;
}

function layout() {
  const w = el.boardArea.clientWidth;
  const h = el.boardArea.clientHeight;
  // Largest whole-cell-aligned square that fits; keeps cells square at any window size.
  const side = Math.max(120, Math.floor(Math.min(w, h)));
  el.boardStage.style.setProperty('--board-size', `${side}px`);
  renderer.resize(side);
}

// ---------- State transitions ----------
function startGame() {
  audio.unlock();
  game = createGame();
  accumulator = 0;
  lastFrame = performance.now();
  screen = 'playing';
  audio.play('click');
  refreshUi();
}

function pauseGame() {
  if (screen !== 'playing') return;
  screen = 'paused';
  refreshUi();
}

function resumeGame() {
  if (screen !== 'paused') return;
  accumulator = 0;
  lastFrame = performance.now();
  screen = 'playing';
  refreshUi();
}

function togglePause() {
  if (screen === 'playing') pauseGame();
  else if (screen === 'paused') resumeGame();
}

function goToMenu() {
  screen = 'menu';
  game = createGame();
  accumulator = 0;
  refreshUi();
}

function endGame() {
  screen = 'over';
  const won = game.status === 'won';
  const newRecord = game.score > settings.bestScore;
  if (newRecord) {
    settings.bestScore = game.score;
    persist();
  }
  el.overTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
  el.recordMsg.hidden = !newRecord;
  el.finalScore.textContent = String(game.score);
  el.finalBest.textContent = String(settings.bestScore);
  audio.play(won ? 'win' : 'over');
  refreshUi();
}

function tick() {
  const result = step(game);
  if (result === 'eat') {
    audio.play('eat');
    refreshUi();
  } else if (result === 'win' || result === 'wall' || result === 'self') {
    refreshUi();
    endGame();
  }
}

// ---------- Loop ----------
// One requestAnimationFrame loop for the page's whole life. Game time advances through a fixed-step
// accumulator, so speed does not depend on the display's refresh rate, and pausing simply stops
// feeding the accumulator. startLoop() is guarded so it can never create a second loop.
function frame(now) {
  rafId = requestAnimationFrame(frame);
  const delta = Math.min(now - lastFrame, MAX_FRAME_DELTA);
  lastFrame = now;

  if (screen === 'playing') {
    accumulator += delta;
    // Re-read the interval each pass: eating food shortens it.
    while (screen === 'playing' && accumulator >= getTickInterval(settings.difficulty, game.eaten)) {
      accumulator -= getTickInterval(settings.difficulty, game.eaten);
      tick();
    }
  }
  renderer.draw(game, now);
}

function startLoop() {
  if (rafId) return;
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}

// ---------- Fullscreen ----------
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  } catch {
    // Fullscreen may be unavailable (e.g. embedded preview); nothing else to do.
  }
}

// ---------- Input ----------
function onAction(action) {
  audio.unlock();
  switch (action.type) {
    case 'dir':
      if (screen === 'playing') queueDirection(game, action.dir);
      else if (screen === 'menu' && (action.dir === 'left' || action.dir === 'right')) cycleDifficulty(action.dir === 'right' ? 1 : -1);
      break;
    case 'space':
      if (screen === 'menu' || screen === 'over') startGame();
      else togglePause();
      break;
    case 'enter':
      if (screen === 'menu' || screen === 'over') startGame();
      else if (screen === 'paused') resumeGame();
      break;
    case 'pause':
      togglePause();
      break;
    case 'escape':
      // Fullscreen exit is handled by the browser/Electron itself; here we close overlays.
      if (screen === 'paused') resumeGame();
      else if (screen === 'over') goToMenu();
      break;
    case 'mute':
      setSound(!settings.sound);
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
    case 'easy':
    case 'normal':
    case 'hard':
      if (screen === 'menu') setDifficulty(action.type);
      break;
    default:
      break;
  }
}

function cycleDifficulty(offset) {
  const keys = Object.keys(GAME_CONFIG.DIFFICULTIES);
  const next = (keys.indexOf(settings.difficulty) + offset + keys.length) % keys.length;
  setDifficulty(keys[next]);
}

function bindButtons() {
  // Buttons blur after a click so a later Space/Enter press never re-activates them.
  const click = (node, fn) =>
    node.addEventListener('click', () => {
      audio.unlock();
      fn();
      node.blur();
    });

  click($('playBtn'), startGame);
  click($('againBtn'), startGame);
  click($('resumeBtn'), resumeGame);
  click($('pauseRestartBtn'), startGame);
  click($('pauseMenuBtn'), goToMenu);
  click($('overMenuBtn'), goToMenu);
  click(el.pauseBtn, togglePause);
  click(el.soundBtn, () => setSound(!settings.sound));
  click(el.menuSoundBtn, () => setSound(!settings.sound));
  click(el.fullscreenBtn, toggleFullscreen);
  for (const btn of el.difficultyGroup.querySelectorAll('button')) {
    click(btn, () => setDifficulty(btn.dataset.difficulty));
  }
}

function init() {
  bindButtons();
  attachInput(window, onAction);

  new ResizeObserver(layout).observe(el.boardArea);
  window.addEventListener('resize', layout);
  document.addEventListener('fullscreenchange', layout);

  // Never let the snake keep moving while the player cannot see or control it.
  window.addEventListener('blur', pauseGame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });

  layout();
  refreshUi();
  startLoop();

  // Test hook: only exposed when the page is opened with ?debug.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__snake = { getGame: () => game, getScreen: () => screen, getSettings: () => settings };
  }
}

init();
