// Generates the app icon (assets/icon.png, assets/icon.ico) from the snake's own look:
// green rounded segments with eyes on the dark board colour. Run: node scripts/make-icon.mjs
// No dependencies: shapes are rasterised with 4x4 supersampling and written as PNG / PNG-in-ICO.
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BG = hex('#0b1530');
const BODY = hex('#22d96b');
const HEAD = hex('#39ff88');
const EYE = hex('#04210f');

// Shapes in unit-square coordinates, drawn back to front.
const SEG = 0.3;
const rrect = (x, y, color, r = 0.09) => ({ kind: 'rect', x, y, w: SEG, h: SEG, r, color });
const shapes = [
  { kind: 'rect', x: 0, y: 0, w: 1, h: 1, r: 0.22, color: BG },
  rrect(0.17, 0.53, BODY),
  rrect(0.53, 0.53, BODY),
  rrect(0.53, 0.17, HEAD),
  { kind: 'circle', cx: 0.62, cy: 0.29, r: 0.034, color: EYE },
  { kind: 'circle', cx: 0.74, cy: 0.29, r: 0.034, color: EYE },
];

function inside(s, px, py) {
  if (s.kind === 'circle') return (px - s.cx) ** 2 + (py - s.cy) ** 2 <= s.r ** 2;
  const cx = Math.min(Math.max(px, s.x + s.r), s.x + s.w - s.r);
  const cy = Math.min(Math.max(py, s.y + s.r), s.y + s.h - s.r);
  return px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h && (px - cx) ** 2 + (py - cy) ** 2 <= s.r ** 2;
}

function render(size) {
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          let hit = null;
          for (const s of shapes) if (inside(s, px, py)) hit = s.color;
          if (hit) { r += hit[0]; g += hit[1]; b += hit[2]; a += 1; }
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      if (a) { rgba[i] = Math.round(r / a); rgba[i + 1] = Math.round(g / a); rgba[i + 2] = Math.round(b / a); }
      rgba[i + 3] = Math.round((a / n) * 255);
    }
  }
  return rgba;
}

function png(size, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function ico(sizes) {
  const images = sizes.map((s) => ({ s, data: png(s, render(s)) }));
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dir = images.map(({ s, data }) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s; e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map((i) => i.data)]);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'icon.png'), png(512, render(512)));
writeFileSync(path.join(OUT, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]));
console.log('Wrote assets/icon.png and assets/icon.ico');
