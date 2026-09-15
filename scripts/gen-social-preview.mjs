// Generates the GitHub social-preview image (1280x640 PNG) for HomeLedger.
// Composes a branded dark card: logo + title + tagline + feature badges on the
// left, the dashboard screenshot framed on the right.
//
// Usage:  node scripts/gen-social-preview.mjs
// Output: docs/social-preview.png  (upload via Settings > Social preview)
//
// Requires `sharp` (install transiently with: npm install --no-save sharp).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DASH = path.join(ROOT, 'docs', 'screenshots', 'dashboard.png');
const ICON = path.join(ROOT, 'packages', 'frontend', 'static', 'icon-512.png');
const OUT = path.join(ROOT, 'docs', 'social-preview.png');

const W = 1280;
const H = 640;

// Brand palette (matches app.css).
const BG_DEEP = '#0b1118';
const BG_SURFACE = '#131a24';
const ACCENT = '#3b82f6';
const GREEN = '#22c55e';
const TEXT = '#e6eaf0';
const MUTED = '#8a94a3';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  const iconB64 = fs.readFileSync(ICON).toString('base64');

  // Frame the dashboard screenshot: rounded corners + border. Match the panel to
  // the screenshot's real aspect ratio so `cover` fills it edge-to-edge with no
  // empty letterbox bands.
  const meta = await sharp(DASH).metadata();
  const panelW = 648;
  const panelH = Math.round((panelW * meta.height) / meta.width); // preserve the shot's ratio
  const rounded = Buffer.from(
    `<svg><rect x="0" y="0" width="${panelW}" height="${panelH}" rx="14" ry="14"/></svg>`,
  );
  const dashPanel = await sharp(DASH)
    .resize(panelW, panelH, { fit: 'cover' })
    .composite([{ input: rounded, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const dashB64 = dashPanel.toString('base64');
  // Center the panel vertically on the canvas.
  const panelX = W - panelW - 60;
  const panelY = Math.round((H - panelH) / 2);

  const badges = [
    { label: 'Self-hosted', x: 90 },
    { label: 'Open source', x: 250 },
    { label: 'Docker', x: 410 },
  ];

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_DEEP}"/>
      <stop offset="1" stop-color="${BG_SURFACE}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.4" r="0.6">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Left column: brand -->
  <g transform="translate(90, 132)">
    <!-- logo -->
    <image x="0" y="0" width="84" height="84" xlink:href="data:image/png;base64,${iconB64}"/>
    <text x="104" y="58" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="56" font-weight="800" fill="${TEXT}">HomeLedger</text>

    <!-- tagline -->
    <text x="2" y="168" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="600" fill="${TEXT}">Self-hosted personal finance,</text>
    <text x="2" y="210" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="600" fill="${TEXT}">your data on <tspan fill="${ACCENT}">your</tspan> server.</text>

    <text x="2" y="262" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="21" fill="${MUTED}">Accounts · budgets · goals · subscriptions</text>
    <text x="2" y="292" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="21" fill="${MUTED}">A privacy-first alternative to Mint / YNAB.</text>
  </g>

  <!-- badges -->
  <g transform="translate(0, 470)" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="18" font-weight="600">
    ${badges
      .map(
        (b) => `<g transform="translate(${b.x}, 0)">
      <rect x="0" y="0" width="${18 + b.label.length * 10}" height="38" rx="19" fill="${ACCENT}" fill-opacity="0.14" stroke="${ACCENT}" stroke-opacity="0.4"/>
      <text x="${(18 + b.label.length * 10) / 2}" y="25" text-anchor="middle" fill="${TEXT}">${esc(b.label)}</text>
    </g>`,
      )
      .join('\n    ')}
  </g>

  <!-- Right column: dashboard screenshot (ratio-matched, vertically centered) -->
  <g transform="translate(${panelX}, ${panelY})" filter="url(#shadow)">
    <rect x="-2" y="-2" width="${panelW + 4}" height="${panelH + 4}" rx="16" fill="${BG_SURFACE}" stroke="${ACCENT}" stroke-opacity="0.25"/>
    <image x="0" y="0" width="${panelW}" height="${panelH}" xlink:href="data:image/png;base64,${dashB64}"/>
  </g>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(OUT);
  console.log(`Wrote ${OUT} (${W}x${H})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
