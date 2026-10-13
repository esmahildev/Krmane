// Minimal static file server for playing the game in a browser (ES modules need http://, not file://).
// Serves only index.html, src/ and assets/ and binds to localhost.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5173;
const ALLOWED = [path.join(ROOT, 'index.html'), path.join(ROOT, 'src') + path.sep, path.join(ROOT, 'assets') + path.sep];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.resolve(ROOT, `.${rel}`);
    const ok = ALLOWED.some((a) => (a.endsWith(path.sep) ? file.startsWith(a) : file === a));
    if (!ok) {
      res.writeHead(404).end('Not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Krmane running at http://localhost:${PORT}  (Ctrl+C to stop)`);
});
