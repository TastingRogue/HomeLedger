// Generates simple, valid PNG app icons (solid brand background with a lighter
// rounded square mark) at 192 and 512 px, plus a 32px favicon — zero external
// deps, using Node's zlib for the PNG IDAT. Run: node scripts/gen-icons.mjs
// Re-run whenever the brand color changes. Output goes to ../static/.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC = path.resolve(__dirname, '..', 'static');

// Brand palette (matches app.css theme-color / accents).
const BG = [11, 17, 24];        // #0b1118 deep background
const FG = [59, 130, 246];      // #3b82f6 accent blue (the mark)

/** Build an RGBA pixel buffer: a rounded-ish square mark centered on BG. */
function pixels(size) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = Math.round(size * 0.22);
  const inner = size - pad * 2;
  const radius = Math.round(inner * 0.18);
  const inCorner = (x, y) => {
    // Rounded-corner test for the inner square.
    const rx = x < pad + radius ? pad + radius - x : x > size - pad - radius ? x - (size - pad - radius) : 0;
    const ry = y < pad + radius ? pad + radius - y : y > size - pad - radius ? y - (size - pad - radius) : 0;
    return rx * rx + ry * ry <= radius * radius;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inSquare = x >= pad && x < size - pad && y >= pad && y < size - pad;
      const on = inSquare && inCorner(x, y);
      const [r, g, b] = on ? FG : BG;
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

/** Encode an RGBA buffer as a PNG (filter byte 0 per scanline + zlib deflate). */
function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw);

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  // 10,11,12 = compression/filter/interlace = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// CRC32 (PNG spec).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

for (const size of [512, 192, 32]) {
  const png = encodePng(size, pixels(size));
  const name = size === 32 ? 'favicon.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(STATIC, name), png);
  console.log(`wrote static/${name} (${png.length} bytes)`);
}
