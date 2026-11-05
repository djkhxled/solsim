import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LOGO_LINE, gradientAt } from '../src/shared/logo.js';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function sample(u, v) {
  const r = 0.22;
  const qx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0), qy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
  if (Math.hypot(qx, qy) > r) return [0, 0, 0, 0];
  let d = Infinity;
  for (let i = 0; i < LOGO_LINE.length - 1; i++) d = Math.min(d, segDist(u, v, LOGO_LINE[i], LOGO_LINE[i + 1]));
  if (d <= 0.045) return [255, 255, 255, 255];
  return [...gradientAt((u + (1 - v)) / 2), 255]; // bottom-left -> top-right
}
export function renderIcon(size, ss = 4) {
  const buf = Buffer.alloc(size * size * 4);
  const n = ss * ss;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const acc = [0, 0, 0, 0];
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const c = sample((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
      const a = c[3] / 255;
      acc[0] += c[0] * a; acc[1] += c[1] * a; acc[2] += c[2] * a; acc[3] += c[3];
    }
    const i = (y * size + x) * 4, aSum = acc[3] / 255;
    buf[i] = aSum ? Math.round(acc[0] / aSum) : 0;
    buf[i + 1] = aSum ? Math.round(acc[1] / aSum) : 0;
    buf[i + 2] = aSum ? Math.round(acc[2] / aSum) : 0;
    buf[i + 3] = Math.round(acc[3] / n);
  }
  return buf;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync('assets', { recursive: true });
  for (const s of [16, 48, 128]) writeFileSync(`assets/icon${s}.png`, encodePng(s, s, renderIcon(s)));
  console.log('icons written');
}
