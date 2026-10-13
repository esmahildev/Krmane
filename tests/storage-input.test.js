import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, defaultSettings, loadSettings, sanitize, saveSettings } from '../src/storage.js';
import { keyToAction } from '../src/input.js';

function fakeStore(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

test('missing storage value gives defaults', () => {
  assert.deepEqual(loadSettings(fakeStore()), defaultSettings());
});

test('valid values round-trip', () => {
  const store = fakeStore();
  assert.equal(saveSettings({ bestScore: 120, difficulty: 'hard', sound: false }, store), true);
  assert.deepEqual(loadSettings(store), { bestScore: 120, difficulty: 'hard', sound: false });
});

test('corrupted JSON falls back to defaults', () => {
  assert.deepEqual(loadSettings(fakeStore({ [STORAGE_KEY]: '{not json' })), defaultSettings());
});

test('invalid field values are individually replaced by defaults', () => {
  const bad = sanitize({ bestScore: -5, difficulty: 'insane', sound: 'yes' });
  assert.deepEqual(bad, defaultSettings());
  assert.equal(sanitize({ bestScore: 1.5 }).bestScore, 0);
  assert.equal(sanitize({ bestScore: '99' }).bestScore, 0);
  assert.equal(sanitize({ bestScore: Number.NaN }).bestScore, 0);
  assert.equal(sanitize({ difficulty: '__proto__' }).difficulty, 'normal');
  assert.equal(sanitize({ bestScore: 40, difficulty: 'bogus' }).bestScore, 40); // good fields survive
});

test('non-object payloads are ignored', () => {
  for (const v of [null, 5, 'x', [], true]) assert.deepEqual(sanitize(v), defaultSettings());
});

test('throwing storage does not crash load or save', () => {
  const boom = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.deepEqual(loadSettings(boom), defaultSettings());
  assert.equal(saveSettings(defaultSettings(), boom), false);
});

test('arrow keys and WASD map to directions', () => {
  const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', A: 'left' };
  for (const [key, dir] of Object.entries(dirs)) assert.deepEqual(keyToAction({ key }), { type: 'dir', dir }, key);
});

test('control keys map to actions', () => {
  assert.equal(keyToAction({ key: ' ' }).type, 'space');
  assert.equal(keyToAction({ key: 'Enter' }).type, 'enter');
  assert.equal(keyToAction({ key: 'Escape' }).type, 'escape');
  assert.equal(keyToAction({ key: 'p' }).type, 'pause');
  assert.equal(keyToAction({ key: 'f' }).type, 'fullscreen');
  assert.equal(keyToAction({ key: 'm' }).type, 'mute');
  assert.equal(keyToAction({ key: '2' }).type, 'normal');
});

test('unknown keys and modified keys are ignored', () => {
  assert.equal(keyToAction({ key: 'x' }), null);
  assert.equal(keyToAction({ key: 'w', ctrlKey: true }), null); // Ctrl+W must not steer
  assert.equal(keyToAction({ key: 'f', altKey: true }), null);
  assert.equal(keyToAction({}), null);
});
