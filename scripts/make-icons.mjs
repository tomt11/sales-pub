// Generates the PWA icons (dojo target mark) without image dependencies:
// raw RGBA scanlines → zlib → hand-assembled PNG. Run: node scripts/make-icons.mjs
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, paint) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const NAVY = [11, 17, 23];
const BLUE = [47, 155, 255];
const GOLD = [232, 179, 57];

// Dojo target: navy rounded square, blue outer ring, gold centre dot.
function paint(x, y, size) {
  const c = size / 2;
  const dx = x + 0.5 - c;
  const dy = y + 0.5 - c;
  const d = Math.sqrt(dx * dx + dy * dy);
  const corner = size * 0.18;
  // rounded-square mask
  const ex = Math.max(Math.abs(dx) - (c - corner), 0);
  const ey = Math.max(Math.abs(dy) - (c - corner), 0);
  if (Math.sqrt(ex * ex + ey * ey) > corner) return [0, 0, 0, 0];

  const ring = (radius, width) => Math.abs(d - radius) < width;
  if (d < size * 0.085) return [...GOLD, 255];
  if (ring(size * 0.2, size * 0.028)) return [...BLUE, 255];
  if (ring(size * 0.31, size * 0.028)) return [...BLUE, 200];
  if (ring(size * 0.31, size * 0.028)) return [...BLUE, 200];
  return [...NAVY, 255];
}

mkdirSync("public", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, png(size, paint));
}
writeFileSync("public/apple-touch-icon.png", png(180, paint));
console.log("icons written: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png");
