// Launches the Electron desktop app. Some hosts (e.g. VS Code extension hosts) export
// ELECTRON_RUN_AS_NODE=1, which makes electron.exe behave like plain Node and crash on startup,
// so it is removed from the child's environment.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [root, ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
