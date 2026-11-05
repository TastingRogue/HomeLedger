// This file runs in the bundled Node runtime, never in the Electron renderer.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
let instance;
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  try { await instance?.close(); } finally { process.exit(0); }
}
process.on('disconnect', stop);
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('message', async message => {
  if (message?.type === 'shutdown') return stop();
  if (message?.type !== 'init' || instance) return;
  const { dataDir, jwtSecret, token, port, locale } = message;
  Object.assign(process.env, {
    NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dataDir,
    JWT_SECRET: jwtSecret, REGISTRATION_MODE: 'first_user_only', DEFAULT_LOCALE: locale,
    DISPLAY_CURRENCY: 'MXN', ALLOW_INSECURE_DEFAULTS: 'false', LOG_LEVEL: 'silent',
    HOMELEDGER_OCR_LANG: path.join(__dirname, 'ocr'),
    HOMELEDGER_OCR_CACHE: path.join(dataDir, 'ocr-cache'),
    HOMELEDGER_PDF_MODULE: pathToFileURL(path.join(__dirname, 'pdf.mjs')).href,
  });
  try {
    const Database = require('better-sqlite3');
    const migrations = path.join(__dirname, 'packages/backend/dist/db/migrations');
    const journal = JSON.parse(fs.readFileSync(path.join(migrations, 'meta/_journal.json'), 'utf8'));
    const latest = Math.max(...journal.entries.map(entry => entry.when));
    const info = JSON.parse(fs.readFileSync(path.join(__dirname, 'build-info.json'), 'utf8'));
    const hash = createHash('sha256').update(info.version);
    for (const entry of journal.entries) hash.update(fs.readFileSync(path.join(migrations, `${entry.tag}.sql`)));
    const fingerprint = hash.digest('hex');
    const markerPath = path.join(dataDir, 'desktop-runtime.json');
    let marker = null;
    if (fs.existsSync(markerPath)) marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    const versionParts = value => value.split('.').slice(0, 3).map(Number);
    if (marker?.version) {
      const previous = versionParts(marker.version), current = versionParts(info.version);
      for (let i = 0; i < 3; i++) {
        if (current[i] > previous[i]) break;
        if (current[i] < previous[i]) throw Object.assign(new Error('Downgrade'), { code: 'DESKTOP_DOWNGRADE' });
      }
    }
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    const dbPath = path.join(dataDir, 'homeledger.db');
    if (fs.existsSync(dbPath)) {
      const sqlite = new Database(dbPath);
      try {
        if (sqlite.prepare("SELECT name FROM sqlite_master WHERE name='__drizzle_migrations'").get()) {
          const existing = sqlite.prepare('SELECT MAX(created_at) AS latest FROM __drizzle_migrations').get();
          if (existing.latest > latest) throw Object.assign(new Error('Newer schema'), { code: 'DESKTOP_DOWNGRADE' });
        }
        if (marker?.fingerprint !== fingerprint) {
          const folder = path.join(dataDir, 'backups');
          fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
          const name = `pre-upgrade-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
          // SQLite online backup includes WAL data; failure stops startup before migrating.
          await sqlite.backup(path.join(folder, name));
        }
      } finally { sqlite.close(); }
    }
    const { startEmbeddedServer } = await import(pathToFileURL(path.join(__dirname, 'packages/backend/dist/server.js')).href);
    instance = await startEmbeddedServer(token, port);
    fs.writeFileSync(`${markerPath}.tmp`, JSON.stringify({ version: info.version, fingerprint }), { mode: 0o600 });
    fs.renameSync(`${markerPath}.tmp`, markerPath);
    process.send?.({ type: 'ready', port: instance.address.port });
  } catch (error) {
    process.send?.({ type: 'error', code: error.code === 'EADDRINUSE' ? 'PORT_IN_USE' : error.code === 'DESKTOP_DOWNGRADE' ? 'NEWER_DATA' : 'START_FAILED' });
    try { await instance?.close(); } finally { process.exit(1); }
  }
});
