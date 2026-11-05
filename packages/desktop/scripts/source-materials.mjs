// Reproduce the Windows native source bundle from the reviewed hash manifest.
// Source archives remain outside Git. Nothing downloaded here is executed.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'win32') throw new Error('Build the Windows source-material ZIP on Windows with the bundled bsdtar tool');

const desktop = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(await fs.readFile(path.join(desktop, 'package.json'), 'utf8'));
const reviewed = path.join(desktop, 'resources/licenses/windows-x64');
const manifest = JSON.parse(await fs.readFile(path.join(reviewed, 'manifest.json'), 'utf8'));
const staging = path.join(desktop, '.staging/license-review/materials');
const sources = path.join(staging, 'sources');
await fs.mkdir(sources, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < manifest.sources.length) {
    const item = manifest.sources[cursor++];
    if (!/^[a-zA-Z0-9_.+-]+$/.test(item.name) || !item.url.startsWith('https://') || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Invalid source manifest entry');
    const target = path.join(sources, item.name);
    let bytes = await fs.readFile(target).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (!bytes) {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error(`Source download failed: ${item.name} (${response.status})`);
      bytes = Buffer.from(await response.arrayBuffer());
    }
    if (digest(bytes) !== item.sha256) throw new Error(`Source checksum mismatch: ${item.name}`);
    await fs.writeFile(target, bytes);
  }
}));
// Copy only manifest-listed archives; an old staging cache cannot add files.
const bundle = path.join(desktop, '.staging/windows-source-bundle');
await fs.mkdir(path.join(bundle, 'sources'), { recursive: true });
const allowed = new Set(manifest.sources.map(item => item.name));
for (const existing of await fs.readdir(path.join(bundle, 'sources'))) {
  if (!allowed.has(existing)) throw new Error(`Unexpected stale source in bundle: ${existing}`);
}
for (const item of manifest.sources) await fs.copyFile(path.join(sources, item.name), path.join(bundle, 'sources', item.name));
for (const name of ['manifest.json', 'THIRD-PARTY-NATIVE-NOTICES.txt', 'canvas-win32-x64.sbom.json', 'ocr-models.json', 'README.txt']) {
  await fs.copyFile(path.join(reviewed, name), path.join(bundle, name));
}
const output = path.join(desktop, `dist/HomeLedger-${version}-windows-source-materials.zip`);
await fs.mkdir(path.dirname(output), { recursive: true });
// Replace only this generated ZIP after checking it stays inside desktop/dist.
if (path.dirname(output) !== path.join(desktop, 'dist')) throw new Error('Invalid bundle target');
await fs.rm(output, { force: true });
const result = spawnSync('tar', ['-a', '-cf', output, 'sources', 'manifest.json', 'THIRD-PARTY-NATIVE-NOTICES.txt', 'canvas-win32-x64.sbom.json', 'ocr-models.json', 'README.txt'], { cwd: bundle, stdio: 'inherit' });
if (result.status !== 0) throw new Error('Source ZIP creation failed');
console.log(`Source bundle verified: ${manifest.sources.length} archives, ${digest(await fs.readFile(output))}`);
