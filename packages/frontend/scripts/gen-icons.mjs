// Generates the HomeLedger app icons (PNG) from the brand SVG: a house (blue
// roof + green apex dot) enclosing an "H" (blue columns + white beam), with a
// dark $ badge ringed in green. Keeps the SVG here as the single source of
// truth so it matches src/lib/components/Logo.svelte.
//
// Outputs static/icon-512.png, static/icon-192.png, static/favicon.png (32px).
// Run: node scripts/gen-icons.mjs   (requires `sharp`: npm install --no-save sharp)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC = path.resolve(__dirname, '..', 'static');

/**
 * Brand SVG at 512x512. `favicon` mode drops the tiny $ badge (illegible at
 * 32px) and thickens nothing — the house + H stay crisp.
 */
function brandSvg({ favicon = false } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#131a24"/><stop offset="1" stop-color="#0b1118"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b9bff"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bg)"/>
  <rect x="16.5" y="16.5" width="479" height="479" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>

  <!-- roof -->
  <path d="M256 118 L392 232" fill="none" stroke="url(#blue)" stroke-width="34" stroke-linecap="round"/>
  <path d="M256 118 L120 232" fill="none" stroke="url(#blue)" stroke-width="34" stroke-linecap="round"/>
  <circle cx="256" cy="118" r="18" fill="#22c55e"/>

  <!-- H -->
  <rect x="158" y="214" width="60" height="176" rx="18" fill="url(#blue)"/>
  <rect x="294" y="214" width="60" height="176" rx="18" fill="url(#blue)"/>
  <rect x="158" y="284" width="196" height="40" rx="16" fill="#f4f7fb"/>
${favicon ? '' : `
  <!-- $ badge (dark fill, green ring + glyph) -->
  <circle cx="372" cy="372" r="58" fill="#0b1118" stroke="#22c55e" stroke-width="6"/>
  <text x="372" y="376" text-anchor="middle" dominant-baseline="central"
    font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="74" font-weight="800" fill="#22c55e">$</text>
`}
</svg>`;
}

const full = Buffer.from(brandSvg());
const small = Buffer.from(brandSvg({ favicon: true }));

const targets = [
  { name: 'icon-512.png', size: 512, svg: full },
  { name: 'icon-192.png', size: 192, svg: full },
  { name: 'favicon.png', size: 32, svg: small },
];

for (const { name, size, svg } of targets) {
  const out = path.join(STATIC, name);
  await sharp(svg).resize(size, size).png().toFile(out);
  const bytes = fs.statSync(out).size;
  console.log(`wrote static/${name} (${bytes} bytes)`);
}
