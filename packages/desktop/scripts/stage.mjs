import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { materializeWorkspaces } from './materialize.mjs';

const desktop = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(desktop, '../..');
const runtime = path.join(desktop, 'runtime');
const scratch = path.join(desktop, '.staging/prepare');
const cache = path.join(desktop, '.staging/cache');
const nodeVersion = '22.23.4';
const archives = {
  'win32-x64': ['win-x64.zip', 'cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20'],
  'darwin-arm64': ['darwin-arm64.tar.gz', 'c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428'],
  'darwin-x64': ['darwin-x64.tar.gz', 'efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819'],
  'linux-x64': ['linux-x64.tar.gz', 'b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406'],
};
const key = `${process.platform}-${process.arch}`;
if (!archives[key]) throw new Error(`Unsupported build host: ${key}. Build natively on a supported host.`);
const [suffix, expected] = archives[key];
const archive = `node-v${nodeVersion}-${suffix}`;

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.status}`);
}
async function clean(target) {
  if (![runtime, scratch].includes(path.resolve(target))) throw new Error('Unsafe staging cleanup');
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}
await clean(runtime);
await clean(scratch);
await fs.mkdir(cache, { recursive: true });
let bytes = await fs.readFile(path.join(cache, archive)).catch(() => null);
if (!bytes || createHash('sha256').update(bytes).digest('hex') !== expected) {
  const response = await fetch(`https://nodejs.org/dist/v${nodeVersion}/${archive}`);
  if (!response.ok) throw new Error(`Node download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('Node checksum mismatch');
await fs.writeFile(path.join(cache, archive), bytes);
const archivePath = path.join(scratch, archive);
await fs.writeFile(archivePath, bytes);
run('tar', ['-xf', archivePath, '-C', scratch]);
const extracted = path.join(scratch, archive.replace(/\.(zip|tar\.gz)$/, ''));
const nodeFile = process.platform === 'win32' ? 'node.exe' : 'node';
await fs.mkdir(path.join(runtime, 'bin'), { recursive: true });
await fs.copyFile(path.join(extracted, process.platform === 'win32' ? nodeFile : `bin/${nodeFile}`), path.join(runtime, 'bin', nodeFile));
if (process.platform !== 'win32') await fs.chmod(path.join(runtime, 'bin', nodeFile), 0o755);
await fs.copyFile(path.join(extracted, 'LICENSE'), path.join(runtime, 'NODE-LICENSE.txt'));

const app = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const desktopPackage = JSON.parse(await fs.readFile(path.join(desktop, 'package.json'), 'utf8'));
if (desktopPackage.version !== app.version) throw new Error('Desktop and root versions must match before staging a release');
const manifest = JSON.parse(await fs.readFile(path.join(desktop, 'runtime-package.json'), 'utf8'));
manifest.version = app.version;
await fs.writeFile(path.join(runtime, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const name of ['backend', 'shared']) {
  const target = path.join(runtime, 'packages', name);
  await fs.mkdir(target, { recursive: true });
  await fs.copyFile(path.join(root, 'packages', name, 'package.json'), path.join(target, 'package.json'));
  await fs.cp(path.join(root, 'packages', name, 'dist'), path.join(target, 'dist'), {
    recursive: true, filter: source => !/\.(map|test\.js|d\.ts)$/.test(source),
  });
}
await fs.cp(path.join(root, 'packages/backend/src/db/migrations'), path.join(runtime, 'packages/backend/dist/db/migrations'), { recursive: true });
await fs.mkdir(path.join(runtime, 'packages/frontend'), { recursive: true });
await fs.cp(path.join(root, 'packages/frontend/build'), path.join(runtime, 'packages/frontend/build'), { recursive: true });
for (const name of ['backend.cjs', 'pdf.mjs', 'pdf-worker.mjs']) await fs.copyFile(path.join(desktop, 'src', name), path.join(runtime, name));
const lock = path.join(desktop, 'runtime-lock.json');
if (!process.argv.includes('--update-lock')) await fs.copyFile(lock, path.join(runtime, 'package-lock.json'));
// npm runs through the downloaded Node, so native builds use exactly the shipped ABI.
const npmCli = path.join(extracted, process.platform === 'win32' ? 'node_modules/npm/bin/npm-cli.js' : 'lib/node_modules/npm/bin/npm-cli.js');
run(path.join(runtime, 'bin', nodeFile), [npmCli, process.argv.includes('--update-lock') ? 'install' : 'ci', '--omit=dev', '--no-audit', '--no-fund'], runtime);
if (process.argv.includes('--update-lock')) await fs.copyFile(path.join(runtime, 'package-lock.json'), lock);
await materializeWorkspaces(runtime);
await fs.mkdir(path.join(runtime, 'ocr'), { recursive: true });
for (const lang of ['eng', 'spa']) {
  const source = path.join(runtime, 'node_modules/@tesseract.js-data', lang, '4.0.0', `${lang}.traineddata.gz`);
  await fs.copyFile(source, path.join(runtime, 'ocr', `${lang}.traineddata.gz`));
}
await fs.copyFile(path.join(root, 'LICENSE'), path.join(runtime, 'LICENSE'));
await fs.writeFile(path.join(runtime, 'build-info.json'), JSON.stringify({ version: app.version, node: nodeVersion, platform: process.platform, arch: process.arch, nodeArchive: archive, sha256: expected }, null, 2));
// Include third party license/notice/source metadata from installed npm packages.
const notices = [];
async function licenses(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === '.bin') continue;
    const folder = path.join(dir, entry.name);
    const pkg = await fs.readFile(path.join(folder, 'package.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (pkg) {
      const texts = [];
      for (const f of await fs.readdir(folder)) if (/^(license|licence|copying|notice)(\.|$)/i.test(f)) {
        const stat = await fs.stat(path.join(folder, f));
        if (stat.isFile()) texts.push(`${f}\n${await fs.readFile(path.join(folder, f), 'utf8')}`);
      }
      notices.push(`${pkg.name}@${pkg.version} | ${JSON.stringify(pkg.license)}\n${JSON.stringify(pkg.repository ?? '')}\n${texts.join('\n')}`);
      await licenses(path.join(folder, 'node_modules')).catch(e => { if (e.code !== 'ENOENT') throw e; });
    } else if (entry.name.startsWith('@')) await licenses(folder);
  }
}
await licenses(path.join(runtime, 'node_modules'));
await fs.writeFile(path.join(runtime, 'THIRD-PARTY-NOTICES.txt'), notices.sort().join('\n\n--------------------\n\n'));
if (key === 'win32-x64') {
  const nativeMaterials = path.join(desktop, 'resources/licenses/windows-x64');
  const manifest = JSON.parse(await fs.readFile(path.join(nativeMaterials, 'manifest.json'), 'utf8'));
  for (const [name, expectedHash] of Object.entries(manifest.binaries)) {
    const actual = createHash('sha256').update(await fs.readFile(path.join(runtime, name))).digest('hex');
    if (actual !== expectedHash) throw new Error(`Update native source/license materials for changed binary: ${name}`);
  }
  await fs.cp(nativeMaterials, path.join(runtime, 'licenses/windows-x64'), { recursive: true });
}
await fs.mkdir(path.join(desktop, 'resources'), { recursive: true });
await fs.copyFile(path.join(root, 'packages/frontend/static/icon-512.png'), path.join(desktop, 'resources/icon.png'));
console.log(`Runtime ready: ${key}, Node ${nodeVersion}, ${runtime}`);
