# Krmane

Krmane is a modern-retro take on Nokia Snake for Windows. Plain HTML/CSS/JavaScript with a Canvas board, playable in a browser or as a standalone Electron desktop app. No backend, no accounts.

## Controls (keyboard)

| Key | Action |
| --- | --- |
| Arrow keys / **W A S D** | Steer the snake |
| **Space** (or **P**) | Pause / resume |
| **Enter** | Start, restart, or resume |
| **Esc** | Close the pause screen (resume) or leave the game-over screen (to menu) |
| **F** (**F11** in the desktop app) | Toggle fullscreen |
| **M** | Sound on/off |
| **← →** or **1 2 3** (menu only) | Change difficulty |

Every button on screen also works with the mouse. The game pauses automatically when the window loses focus.

## Rules

- Eat the red food: **+10 points** and the snake grows by one.
- Every food item speeds the game up slightly, up to a cap per difficulty.
- Hitting a wall or your own body ends the game. Filling the whole board wins.
- Reversing directly into yourself is blocked.
- The best score, difficulty and sound setting are saved locally.

| Difficulty | Start speed | Fastest |
| --- | --- | --- |
| Easy | 170 ms/move | 90 ms |
| Normal | 120 ms/move | 60 ms |
| Hard | 85 ms/move | 40 ms |

All of these numbers (grid size, points per food, speeds) are constants in [src/game.js](src/game.js) (`GAME_CONFIG`).

## Requirements

- Windows 10/11
- [Node.js](https://nodejs.org/) 20 or newer (developed on Node 26)

```powershell
npm install
```

## Run

**In a browser** (no Electron needed):

```powershell
npm start
```

Then open <http://localhost:5173>. (A local server is needed because the game uses ES modules; opening `index.html` directly from disk will not work in most browsers.)

**As a desktop app:**

```powershell
npm run desktop
```

## Test

```powershell
npm test
```

Runs the unit tests (game rules, storage validation, key mapping) with Node's built-in test runner. No extra test dependencies.

## Build the Windows app

```powershell
npm run dist     # single-file portable exe
npm run pack     # unpacked folder only (faster, for quick checks)
```

Output (in `dist/`, git-ignored):

- `dist\Snake 1.0.0.exe` — portable, double-click to play, no installation
- `dist\win-unpacked\Snake.exe` — the same app as a plain folder

Notes:

- The first build downloads Electron (~100 MB) and needs internet access.
- If the build fails with `EPERM ... rename ... win-unpacked.tmp`, delete the `dist` folder and run it again (usually a file being scanned or locked).
- The icon is generated from the snake itself by `node scripts/make-icon.mjs` (writes `assets/icon.png` and `assets/icon.ico`); re-run it after changing the shapes in that script.
- The executable is unsigned, so Windows SmartScreen may warn on first launch.

## Project layout

```text
index.html            page structure and screens (menu, pause, game over)
src/
  game.js             pure game rules + config (no DOM; unit-tested)
  renderer.js         canvas drawing
  input.js            keyboard mapping and listeners
  audio.js            synthesised sound effects (Web Audio, no asset files)
  storage.js          validated localStorage persistence
  main.js             controller: screens, game loop, wiring
  styles.css
electron/main.cjs     desktop shell (contextIsolation on, nodeIntegration off, sandboxed, no preload)
scripts/serve.js      tiny static server for `npm start`
scripts/desktop.js    launcher for `npm run desktop`
tests/                unit tests
```

## Design notes

- **Timing:** one `requestAnimationFrame` loop runs for the life of the page. Game moves are driven by a fixed-step accumulator, so speed is the same on 60 Hz and 144 Hz displays, and pausing simply stops feeding it. Restarting replaces the game state and never starts another loop.
- **Input:** direction presses go into a small queue (max 2) and are validated against the last *queued* direction, so quick presses like Down-then-Up cannot reverse the snake.
- **Food:** placed by picking among the free cells directly, so it never lands on the snake and can never loop forever on a nearly full board.
- **Storage:** everything read from `localStorage` is validated field by field; corrupt or missing data falls back to defaults.
- **Test hook:** opening the page with `?debug` exposes read-only access to the game state as `window.__snake` (used by automated checks). It is off by default.

## Known limitations

- Desktop saves live in the Electron profile (`%APPDATA%\Snake`). Closing the window normally saves immediately; force-killing the process within a second or two of a save can lose it.
- Keyboard play only (no touch controls).
- Sound is untested by ear; it is generated with the Web Audio API and silently does nothing if audio is unavailable.
