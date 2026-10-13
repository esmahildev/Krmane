// Persistence via localStorage. Everything read back is validated; failures fall back to defaults.
import { GAME_CONFIG, isDifficulty } from './game.js';

export const STORAGE_KEY = 'snake-game:v1';

export function defaultSettings() {
  return { bestScore: 0, difficulty: GAME_CONFIG.DEFAULT_DIFFICULTY, sound: true };
}

export function sanitize(raw) {
  const out = defaultSettings();
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (Number.isSafeInteger(raw.bestScore) && raw.bestScore >= 0) out.bestScore = raw.bestScore;
  if (typeof raw.difficulty === 'string' && isDifficulty(raw.difficulty)) out.difficulty = raw.difficulty;
  if (typeof raw.sound === 'boolean') out.sound = raw.sound;
  return out;
}

function getStore(store) {
  if (store) return store;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // access can throw when site data is blocked
  }
}

export function loadSettings(store) {
  const s = getStore(store);
  if (!s) return defaultSettings();
  try {
    const text = s.getItem(STORAGE_KEY);
    return text === null ? defaultSettings() : sanitize(JSON.parse(text));
  } catch {
    return defaultSettings();
  }
}

/** Returns true if the write succeeded. */
export function saveSettings(settings, store) {
  const s = getStore(store);
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(sanitize(settings)));
    return true;
  } catch {
    return false;
  }
}
