import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fork } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import lifecycle from '../src/lifecycle.cjs';

const runtime = process.env.DESKTOP_RUNTIME_PATH || fileURLToPath(new URL('../runtime', import.meta.url));
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'homeledger-desktop-smoke-'));
const dataDir = path.join(temporary, 'datos con espacios ñ');
const jwtSecret = randomBytes(32).toString('hex');
const token = randomBytes(32).toString('hex');
const binary = path.join(runtime, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
const runtimeRequire = createRequire(path.join(runtime, 'package.json'));
for (const name of ['better-sqlite3', 'bcrypt', 'sharp', 'tesseract.js', 'pdfjs-dist', '@napi-rs/canvas']) {
  const relative = path.relative(runtime, runtimeRequire.resolve(name));
  assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `Dependency escaped packaged runtime: ${name}`);
}
assert.ok(!(path.relative(runtime, await fs.realpath(path.join(runtime, 'node_modules/@homeledger/shared/package.json')))).startsWith('..'));
let child;
async function boot(port = 0) {
  child = fork(path.join(runtime, 'backend.cjs'), [], { execPath: binary, execArgv: [], cwd: os.tmpdir(), stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  const ready = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Runtime startup timeout')), 60000);
    child.once('error', reject);
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Runtime exited: ${code}`)); });
    child.on('message', message => { clearTimeout(timeout); message.type === 'ready' ? resolve(message) : reject(new Error(message.code)); });
    child.send({ type: 'init', dataDir, jwtSecret, token, port, locale: 'en' });
  });
  return `http://127.0.0.1:${ready.port}`;
}
async function stop() {
  await lifecycle.stopChild(child);
}
try {
  let origin = await boot();
  const headers = { 'X-HomeLedger-Desktop': token, 'Content-Type': 'application/json', 'X-HomeLedger-Session': 'browser' };
  assert.equal((await fetch(`${origin}/api/v1/health`)).status, 403);
  assert.equal((await fetch(`${origin}/api/v1/auth/register`, { method: 'POST', headers: { ...headers, Origin: 'https://external.example' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${origin}/`, { headers })).status, 200);
  const response = await fetch(`${origin}/api/v1/auth/register`, { method: 'POST', headers, body: JSON.stringify({ name: 'Desktop QA', email: 'desktop@example.test', password: 'Desktop-test-only-4829!' }) });
  assert.equal(response.status, 201, await response.clone().text());
  const body = await response.json();
  const authHeaders = { ...headers, Authorization: `Bearer ${body.data.accessToken}` };
  assert.equal(body.data.refreshToken, 'cookie');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const account = await fetch(`${origin}/api/v1/accounts`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: 'Desktop savings', type: 'Efectivo', initialBalance: 1250, currency: 'MXN' }) });
  assert.equal(account.status, 201, await account.clone().text());
  assert.equal((await fetch(`${origin}/api/v1/accounts`, { headers: authHeaders })).status, 200);
  const port = new URL(origin).port;
  await stop();
  await assert.rejects(fetch(`${origin}/api/v1/health`));
  origin = await boot(Number(port));
  const login = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: 'desktop@example.test', password: 'Desktop-test-only-4829!' }) });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  const accounts = await fetch(`${origin}/api/v1/accounts`, { headers: { ...headers, Authorization: `Bearer ${loginBody.data.accessToken}` } });
  assert.match(await accounts.text(), /Desktop savings/);
  await stop();
  const markerFile = path.join(dataDir, 'desktop-runtime.json');
  const marker = JSON.parse(await fs.readFile(markerFile, 'utf8'));
  await fs.writeFile(markerFile, JSON.stringify({ ...marker, fingerprint: 'previous-build' }));
  // A failed snapshot must stop the upgrade before opening/migrating the server.
  const backups = path.join(dataDir, 'backups');
  const heldBackups = path.join(dataDir, 'backups-held-for-qa');
  let hadBackups = false;
  try { await fs.rename(backups, heldBackups); hadBackups = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const databaseHash = async () => createHash('sha256').update(await fs.readFile(path.join(dataDir, 'homeledger.db'))).digest('hex');
  const beforeFailedUpgrade = await databaseHash();
  await fs.writeFile(backups, 'Synthetic QA obstruction');
  try {
    await assert.rejects(boot(Number(port)), /START_FAILED/);
    await stop();
    assert.equal(await databaseHash(), beforeFailedUpgrade);
    assert.equal(JSON.parse(await fs.readFile(markerFile, 'utf8')).fingerprint, 'previous-build');
  } finally {
    await fs.unlink(backups);
    if (hadBackups) await fs.rename(heldBackups, backups);
  }
  origin = await boot(Number(port));
  await stop();
  const snapshot = (await fs.readdir(backups)).find(name => name.startsWith('pre-upgrade-'));
  assert.ok(snapshot);
  const Database = runtimeRequire('better-sqlite3');
  const saved = new Database(path.join(backups, snapshot), { readonly: true });
  try {
    assert.equal(saved.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(saved.prepare('SELECT count(*) AS count FROM accounts').get().count, 1);
  } finally { saved.close(); }
  await fs.writeFile(markerFile, JSON.stringify({ ...marker, version: '99.0.0' }));
  await assert.rejects(boot(Number(port)), /NEWER_DATA/);
  await stop();
  await fs.writeFile(markerFile, JSON.stringify(marker));
  const occupied = createServer();
  await new Promise(resolve => occupied.listen(Number(port), '127.0.0.1', resolve));
  try { await assert.rejects(boot(Number(port)), /PORT_IN_USE/); await stop(); }
  finally { await new Promise(resolve => occupied.close(resolve)); }
  // Test PDF rendering and sharp using the exact isolated runtime dependency tree.
  const require = createRequire(path.join(runtime, 'package.json'));
  const sharp = require('sharp');
  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'white' } }).png().toBuffer();
  assert.ok(image.length > 0);
  const { createReaders } = await import(pathToFileURL(path.join(runtime, 'pdf.mjs')).href);
  // Minimal valid PDF generated in memory; a stable fixture, no external services.
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const content = 'BT /F1 20 Tf 40 220 Td (HomeLedger Receipt) Tj 0 -40 Td (TOTAL 125.00) Tj ET';
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  let pdf = '%PDF-1.4\n', offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const fixture = path.join(temporary, 'receipt.pdf');
  await fs.writeFile(fixture, pdf);
  const readers = createReaders(async file => { assert.ok((await fs.stat(file)).size > 0); return 'rendered'; });
  assert.match(await readers.extractText(fixture), /TOTAL 125/);
  assert.equal(await readers.ocr(fixture), 'rendered');
  for (const lang of ['eng', 'spa']) assert.ok((await fs.stat(path.join(runtime, 'ocr', `${lang}.traineddata.gz`))).size > 100000);
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('spa+eng', undefined, { langPath: path.join(runtime, 'ocr'), cachePath: path.join(temporary, 'ocr') });
  try {
    const ocr = createReaders(async file => (await worker.recognize(file)).data.text);
    assert.match(await ocr.ocr(fixture), /125[.,]00/);
  } finally { await worker.terminate(); }
  origin = await boot(Number(port));
  const resumed = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers, body: JSON.stringify({ email: 'desktop@example.test', password: 'Desktop-test-only-4829!' }) });
  const resumedBody = await resumed.json();
  const resumedHeaders = { ...headers, Authorization: `Bearer ${resumedBody.data.accessToken}` };
  const cookie = resumed.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${origin}/api/v1/auth/refresh`, { method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify({ refreshToken: 'cookie' }) })).status, 200);
  const form = new FormData();
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'desktop-receipt.pdf');
  const uploadHeaders = { 'X-HomeLedger-Desktop': token, Authorization: resumedHeaders.Authorization };
  const uploaded = await fetch(`${origin}/api/v1/attachments/upload`, { method: 'POST', headers: uploadHeaders, body: form });
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const uploadBody = await uploaded.json();
  const analysis = await fetch(`${origin}/api/v1/receipts/${uploadBody.data.id}/analyze`, { method: 'POST', headers: uploadHeaders });
  assert.equal(analysis.status, 200, await analysis.clone().text());
  assert.equal((await analysis.json()).data.total, 125);
  const exported = await fetch(`${origin}/api/v1/backup/export`, { method: 'POST', headers: uploadHeaders });
  assert.equal(exported.status, 200);
  const backup = (await exported.json()).data;
  assert.equal(backup.data.attachments.length, 1);
  assert.ok(backup.data.attachments[0].fileBase64);
  const imported = await fetch(`${origin}/api/v1/backup/import`, { method: 'POST', headers: resumedHeaders, body: JSON.stringify({ backup, confirmed: true }) });
  assert.equal(imported.status, 200, await imported.clone().text());
  const restored = await fetch(`${origin}/api/v1/backup/export`, { method: 'POST', headers: uploadHeaders });
  const restoredBackup = (await restored.json()).data;
  assert.equal(restoredBackup.data.attachments[0].fileBase64, backup.data.attachments[0].fileBase64);
  assert.equal(restoredBackup.data.accounts[0].name, 'Desktop savings');
  await stop();
  console.log('PASS: isolated runtime, security boundary, registration/cookie refresh, native SQLite/bcrypt/sharp, persistence, upgrade snapshot, downgrade/port-collision rejection, PDF text/render, real English/Spanish OCR, HTTP receipt analysis, backup/restore with attachment bytes, shutdown.');
} finally {
  await stop();
  if (process.argv.includes('--keep-fixtures')) console.log(`Synthetic QA fixtures: ${temporary}`);
  else await fs.rm(temporary, { recursive: true, force: true });
}
