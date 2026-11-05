import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

/** npm workspace junctions on Windows can retain absolute build-machine paths. */
export async function materializeWorkspaces(runtime) {
  for (const name of ['backend', 'shared']) {
    const link = path.join(runtime, 'node_modules/@homeledger', name);
    const stat = await fs.lstat(link);
    if (!stat.isSymbolicLink()) continue;
    const source = path.join(runtime, 'packages', name);
    if (await fs.realpath(link) !== await fs.realpath(source)) throw new Error('Unexpected workspace link target');
    await fs.unlink(link);
    await fs.cp(source, link, { recursive: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await materializeWorkspaces(fileURLToPath(new URL('../runtime', import.meta.url)));
}
