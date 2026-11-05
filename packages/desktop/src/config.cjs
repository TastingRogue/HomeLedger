const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const os = require('node:os');

function qaProfile(value, enabled) {
  if (!enabled || !value) return null;
  const resolved = path.resolve(value);
  if (!path.isAbsolute(value) || path.dirname(resolved) !== path.resolve(os.tmpdir()) || !/^homeledger-desktop-qa-[a-zA-Z0-9_-]+$/.test(path.basename(resolved))) {
    throw new Error('QA profiles must be isolated temporary directories');
  }
  return resolved;
}

function loadConfig(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'desktop.json');
  if (fs.existsSync(file)) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(value.jwtSecret) || !Number.isInteger(value.port) || value.port < 0 || value.port > 65535) {
      throw new Error('Invalid desktop configuration. Restore desktop.json from a backup.');
    }
    return value;
  }
  const value = { jwtSecret: randomBytes(32).toString('hex'), port: 0 };
  saveConfig(directory, value);
  return value;
}
function saveConfig(directory, value) {
  const file = path.join(directory, 'desktop.json');
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(`${file}.tmp`, file);
}
function safeBounds(saved, displays) {
  const fallback = { width: 1280, height: 850 };
  if (!saved || ![saved.x, saved.y, saved.width, saved.height].every(Number.isFinite)) return fallback;
  const visible = displays.some(({ workArea: d }) => saved.x + saved.width > d.x + 100 && saved.x < d.x + d.width - 100 && saved.y >= d.y && saved.y < d.y + d.height - 100);
  return visible ? { x: saved.x, y: saved.y, width: Math.max(600, Math.min(saved.width, 3840)), height: Math.max(480, Math.min(saved.height, 2160)) } : fallback;
}
function isAppUrl(value, origin) {
  try { const url = new URL(value); return url.origin === origin && !url.username && !url.password; } catch { return false; }
}
function isPdfViewerUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'chrome-extension:' && url.hostname === 'mhjfbmdgcfjbbpaeojofohoefgiehjai';
  } catch { return false; }
}
function isPdfResourceUrl(value, frameUrl) {
  return isPdfViewerUrl(value) || (isPdfViewerUrl(frameUrl) && value.startsWith('chrome://resources/'));
}
function externalUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); } catch { return false; }
}
function childEnvironment(source) {
  const result = {};
  for (const name of ['SystemRoot', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL', 'TZ']) {
    if (source[name]) result[name] = source[name];
  }
  return result;
}
module.exports = { loadConfig, saveConfig, safeBounds, isAppUrl, isPdfViewerUrl, isPdfResourceUrl, externalUrl, childEnvironment, qaProfile };
