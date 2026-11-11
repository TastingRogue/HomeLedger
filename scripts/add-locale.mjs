import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../locales/', import.meta.url));
const [code, label, intlTag = code] = process.argv.slice(2);
if (!code || !label || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code)) {
  throw Error('Usage: npm run locales:add -- fr "Français" fr-FR');
}
if (!Intl.DateTimeFormat.supportedLocalesOf([intlTag]).length) throw Error(`Unsupported Intl tag: ${intlTag}`);
const pack = JSON.parse(fs.readFileSync(path.join(directory,'en.json'),'utf8'));
pack.meta = { code, label, intlTag, aliases:[], order:100, currencySpace:'', draft:true };
// Exclusive creation prevents overwriting an existing contribution.
fs.writeFileSync(path.join(directory,`${code}.json`), JSON.stringify(pack,null,2)+'\n', {flag:'wx'});
console.log(`Created locales/${code}.json. Translate every section, configure aliases/spacing, remove meta.draft, then run npm run locales:sync.`);
