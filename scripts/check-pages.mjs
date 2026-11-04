import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const page = resolve('docs/index.html');
const html = readFileSync(page, 'utf8');
const missing = [];
for (const [, value] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(value)) continue;
  const path = resolve(dirname(page), value.split(/[?#]/)[0]);
  if (!existsSync(path)) missing.push(value);
}
if (missing.length) throw new Error(`Missing Pages resources: ${missing.join(', ')}`);
console.log('Pages links and images verified.');
