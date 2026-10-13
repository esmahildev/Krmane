# Snake Game for Windows — Project Plan

## 1. Project Overview

Build a polished desktop version of the classic Nokia Snake game. The player controls a snake, eats small red food items, grows longer, earns points, and tries to avoid crashing into walls or its own body.

The game should preserve the simple, nostalgic feel of the original while offering a clean modern interface and the option to package it as a standalone Windows application.

## 2. Goals

- Recreate the familiar, easy-to-understand Snake gameplay.
- Make controls responsive and gameplay smooth.
- Provide a polished start screen, game screen, pause screen, and game-over screen.
- Track the current score and save the player's best score locally.
- Support keyboard controls and fullscreen play.
- Keep the project straightforward to run, maintain, and build in VS Code.
- Optionally package the game as a Windows `.exe`.

## 3. Recommended Technology

- **HTML** — application structure.
- **CSS** — layout, styling, animations, and responsive behavior.
- **JavaScript** — game rules, input handling, scoring, and state management.
- **HTML Canvas API** — rendering the board, snake, and food efficiently.
- **Electron** — desktop packaging for Windows, if a standalone executable is required.
- **LocalStorage** — saving the high score and user settings locally.

Start with a browser-based game using HTML, CSS, JavaScript, and Canvas. Add Electron packaging after the game works correctly.

## 4. Core Gameplay

1. The snake begins at a starting position on a grid.
2. A small red food item appears at a random unoccupied grid cell.
3. The player steers the snake using the keyboard.
4. When the snake eats the food:
   - Increase the score.
   - Grow the snake by one segment.
   - Place new food at a random unoccupied cell.
   - Increase the game speed gradually, within a reasonable limit.
5. The game ends if the snake hits a wall or collides with its own body.
6. The player can restart and try to beat the previous high score.

Food must never spawn inside the snake. Prevent immediate 180-degree turns so the snake cannot reverse directly into itself.

## 5. Controls

- **Arrow keys** — move up, down, left, and right.
- **W / A / S / D** — alternative movement controls.
- **Space** — pause or resume.
- **Enter** — start or restart, where appropriate.
- **Escape** — exit fullscreen or close an overlay, where appropriate.
- Include visible on-screen control hints.

Ignore invalid direction changes and process queued inputs safely so fast key presses do not cause unexpected movement.

## 6. Visual Design

Use a modern retro-arcade style by default:

- Dark background with a clearly visible grid.
- Bright green snake.
- Small red food item.
- Readable score and high-score display.
- Subtle glow effects, smooth transitions, and restrained animations.
- Clear typography and strong contrast.
- A centered game board that scales appropriately to the available window.
- A consistent visual style across all screens.

Avoid excessive effects that reduce readability or slow gameplay. Keep the board and snake easy to see.

### Screens

**Start screen**
- Game title.
- Play button.
- Difficulty selection.
- Sound toggle.
- Brief keyboard-control instructions.

**Gameplay screen**
- Game board.
- Current score.
- Best score.
- Pause/resume control.
- Current difficulty or speed indicator, if useful.

**Pause screen**
- Clear paused status.
- Resume and restart options.

**Game-over screen**
- Final score.
- Best score.
- New-record message when applicable.
- Play-again button.
- Return-to-menu option.

## 7. Difficulty and Scoring

Provide three difficulty levels:

- **Easy** — slower movement, suitable for beginners.
- **Normal** — balanced default speed.
- **Hard** — faster movement for experienced players.

Each food item should add a clearly defined number of points. Use a consistent scoring rule and display it clearly. Increase speed gradually as the score rises, but cap the maximum speed to keep the game playable.

The exact starting speeds, speed increments, grid dimensions, and points per food should be configurable constants rather than scattered hard-coded values.

## 8. Sound

Add simple optional sound effects:

- Food collected.
- Button or menu interaction, if appropriate.
- Game over.

Provide a sound on/off setting. Sound should not play unexpectedly before the player interacts with the game. If audio assets are used, ensure they are licensed for the project or created specifically for it.

## 9. Saving and Settings

Use browser LocalStorage initially to persist:

- Best score.
- Selected difficulty.
- Sound enabled/disabled.
- Any other small preferences.

Handle missing, invalid, or corrupted stored values safely. If the project is packaged with Electron, verify that saved data persists correctly between application launches.

## 10. Technical Structure

Keep the code modular and readable. A suggested structure is:

```text
snake-game/
├── index.html
├── src/
│   ├── styles.css
│   ├── main.js
│   ├── game.js
│   ├── renderer.js
│   ├── input.js
│   ├── storage.js
│   └── audio.js
├── assets/
│   └── audio/
├── package.json
├── README.md
└── .gitignore
```

Adjust the structure if a simpler design is more appropriate, but keep rendering, game rules, input, and persistence reasonably separated.

If Electron is included, add the necessary Electron entry files and scripts without exposing unnecessary Node.js capabilities to the renderer process. Use a secure Electron configuration, including `contextIsolation: true` and `nodeIntegration: false`.

## 11. Reliability and Edge Cases

Implement and verify the following:

- The snake cannot reverse directly into itself.
- Food never appears on the snake.
- The game handles full-board conditions without entering an infinite loop.
- Pause truly stops game movement.
- Keyboard input does not create multiple simultaneous game loops.
- Restart resets the current game state without erasing the saved high score.
- Score and snake length remain consistent.
- Resizing the window does not distort the game board or break input.
- Fullscreen can be entered and exited reliably.
- Stored settings are validated before use.
- The game does not continue running duplicate animation loops after restarting.
- Movement timing remains consistent and does not become excessively fast on high-refresh-rate displays.

## 12. Testing Checklist

Before considering the game complete, test:

- Starting a new game.
- All four movement directions using both Arrow keys and WASD.
- Blocking reverse-direction input.
- Eating food, gaining points, and growing.
- Correct random food placement.
- Wall collision and self-collision.
- Pause and resume.
- Restart after game over.
- Difficulty changes and speed progression.
- High-score persistence after closing and reopening.
- Sound toggle.
- Window resizing and fullscreen.
- Handling a nearly or completely filled board.
- Production build and, if using Electron, Windows packaging.

Fix errors discovered during testing rather than merely documenting them.

## 13. Windows Desktop Packaging (Optional)

If a standalone desktop app is desired, use Electron and a suitable packaging tool such as `electron-builder`.

The finished Windows package should:

- Launch without requiring the user to open VS Code.
- Include all required assets and runtime files.
- Have an appropriate application name and icon, if an icon is supplied.
- Provide clear build and launch instructions.
- Be tested on Windows after packaging.

Do not claim that a Windows executable has been produced unless the build succeeds and the output is verified.

## 14. Development Phases

1. **Project setup** — create the project structure and make the initial version launch.
2. **Core game** — implement grid movement, food, growth, collisions, and scoring.
3. **Interface** — build the start, gameplay, pause, and game-over screens.
4. **Quality features** — add difficulty levels, sound, fullscreen, and saved high scores.
5. **Testing and refinement** — fix bugs, polish controls, and verify edge cases.
6. **Packaging** — optionally build and test the Windows executable.
7. **Documentation** — provide setup, run, test, build, and packaging instructions.

## 15. Instructions for Claude Code

Work directly in the currently opened VS Code workspace.

1. Inspect the workspace before creating or overwriting files. If it contains an existing project, explain the relevant structure and preserve unrelated work.
2. Implement the game in small, verifiable stages.
3. Choose the simplest reliable implementation that satisfies this plan. Do not add a backend, database, accounts, or online multiplayer; they are unnecessary for this game.
4. Use clear names, modular code, and comments where they clarify non-obvious logic.
5. Do not leave core functionality as placeholders or TODOs.
6. Run the available checks and build commands. Test the game in the available environment and report exactly what was and was not tested.
7. Fix any errors caused by the implementation before finishing.
8. If a browser or desktop preview is available, use it to verify the actual game experience.
9. If Electron packaging is requested or implemented, verify the relevant build and clearly identify the generated output path.
10. At the end, summarize:
    - Files created or changed.
    - Features implemented.
    - Commands to install dependencies and run the game.
    - Commands to test and build it.
    - Whether Windows packaging succeeded.
    - Known limitations, if any.

## 16. Definition of Done

The project is complete when the player can launch the game, control the snake smoothly, eat food, earn points, pause and resume, lose and restart, select a difficulty, and retain the best score between sessions. The interface should be polished and readable, and all core gameplay should be tested. If Windows packaging is included, the generated executable or installer must be built successfully and verified.

---

**Initial direction:** Build a polished, modern-retro Snake game for Windows, inspired by the classic Nokia version. Prioritize reliable gameplay and a clean user experience before adding optional desktop packaging.
