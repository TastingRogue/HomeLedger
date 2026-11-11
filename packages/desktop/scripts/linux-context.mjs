// Prepare a bounded, synthetic Docker build context. Never include local profiles.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const desktop = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(desktop, '../..');
const output = path.join(desktop, '.staging/linux-context');
if (path.dirname(output) !== path.join(desktop, '.staging')) throw new Error('Unsafe output');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'tsconfig.base.json', 'LICENSE']) await fs.copyFile(path.join(root, file), path.join(output, file));
// Locale validation runs before build and runtime staging. Keep this allowlist
// explicit so local configuration and profiles never enter the Docker context.
for (const file of ['scripts/locales.mjs', 'ha-addon/config.yaml']) {
  await fs.mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await fs.copyFile(path.join(root, file), path.join(output, file));
}
await fs.mkdir(path.join(output, 'locales'), { recursive: true });
for (const file of await fs.readdir(path.join(root, 'locales'))) {
  if (file.endsWith('.json')) await fs.copyFile(path.join(root, 'locales', file), path.join(output, 'locales', file));
}
for (const name of ['backend', 'frontend', 'shared']) {
  await fs.cp(path.join(root, 'packages', name), path.join(output, 'packages', name), {
    recursive: true,
    filter: source => !source.split(path.sep).some(part => ['node_modules', 'dist', 'build', '.svelte-kit', '.staging', 'runtime', 'data'].includes(part)) && !/\.log$/.test(source),
  });
}
await fs.mkdir(path.join(output, 'packages/desktop'), { recursive: true });
for (const entry of await fs.readdir(desktop)) {
  if (['node_modules', 'dist', '.staging', 'runtime'].includes(entry)) continue;
  await fs.cp(path.join(desktop, entry), path.join(output, 'packages/desktop', entry), { recursive: true });
}
await fs.copyFile(path.join(desktop, 'scripts/Dockerfile.qa-linux'), path.join(output, 'Dockerfile'));
console.log(output);
