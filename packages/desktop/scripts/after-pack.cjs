const fs = require('node:fs');
const path = require('node:path');

module.exports = async context => {
  const resources = context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app/Contents/Resources`)
    : path.join(context.appOutDir, 'resources');
  const runtime = path.join(resources, 'runtime');
  const info = JSON.parse(fs.readFileSync(path.join(runtime, 'build-info.json'), 'utf8'));
  if (info.version !== context.packager.appInfo.version) throw new Error('Packaged UI and backend versions do not match');
  const backend = JSON.parse(fs.readFileSync(path.join(runtime, 'packages/backend/package.json'), 'utf8'));
  const extra = JSON.parse(fs.readFileSync(path.join(runtime, 'package.json'), 'utf8'));
  for (const name of Object.keys({ ...backend.dependencies, ...extra.dependencies })) {
    const resolved = fs.realpathSync(path.join(runtime, 'node_modules', name, 'package.json'));
    const relative = path.relative(runtime, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Packaged dependency resolves outside runtime: ${name}`);
  }
  for (const file of ['backend.cjs', 'pdf.mjs', 'pdf-worker.mjs', 'packages/frontend/build/handler.js', 'packages/backend/dist/db/migrations/meta/_journal.json', 'ocr/eng.traineddata.gz', 'ocr/spa.traineddata.gz', 'THIRD-PARTY-NOTICES.txt', 'NODE-LICENSE.txt']) {
    if (!fs.statSync(path.join(runtime, file)).isFile()) throw new Error(`Missing packaged resource: ${file}`);
  }
  if (context.electronPlatformName === 'win32' && info.arch === 'x64') {
    for (const name of ['manifest.json', 'THIRD-PARTY-NATIVE-NOTICES.txt', 'canvas-win32-x64.sbom.json', 'ocr-models.json']) {
      if (!fs.statSync(path.join(runtime, 'licenses/windows-x64', name)).isFile()) throw new Error(`Missing Windows native license material: ${name}`);
    }
  }
  console.log('Packaged runtime dependency/resource boundary verified.');
};
