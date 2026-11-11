import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { readPacks, createArtifacts, validatePacks } from './locales.mjs';

const packs = readPacks(fileURLToPath(new URL('../locales/',import.meta.url)));
const categories = JSON.parse(fs.readFileSync(new URL('../locales/categories.json',import.meta.url),'utf8'));
const ha = fs.readFileSync(new URL('../ha-addon/config.yaml',import.meta.url),'utf8');
const sampleCode = ['fr','de','it','nl','sv','da','fi','pl','ja','ko','hi','tr']
  .find(code => !packs.some(p => p.meta.code === code || p.meta.aliases.includes(code)));
assert.ok(sampleCode, 'Extend the fixture candidates when all sample languages are supported');
function fixture() {
  const extra = structuredClone(packs.find(p => p.meta.code === 'en'));
  extra.meta = {code:sampleCode,label:'Fixture language',intlTag:sampleCode,aliases:[`${sampleCode}-ZZ`],order:10000,currencySpace:'\u00a0'};
  extra.desktop.file = 'Fichier';
  extra.categories.income = 'Revenus';
  return [...structuredClone(packs),extra];
}
test('a fourth language propagates to web, backend, desktop, themes and Home Assistant without changing application code', () => {
  const artifacts = createArtifacts(fixture(),categories,ha);
  assert.ok(artifacts.get('packages/frontend/src/lib/i18n/generated.ts').includes(JSON.stringify(sampleCode)));
  assert.ok(artifacts.has(`packages/frontend/src/lib/i18n/${sampleCode}.ts`));
  assert.match(artifacts.get('packages/shared/src/locales.ts'), /Revenus/);
  assert.ok(artifacts.get('packages/frontend/src/lib/i18n/theme-texts.ts').includes(JSON.stringify(sampleCode)));
  assert.ok(artifacts.get('ha-addon/config.yaml').includes(`|${sampleCode})`));
  const module = {exports:{}};
  vm.runInNewContext(artifacts.get('packages/desktop/src/locale-data.cjs'),{module});
  assert.equal(module.exports.resolveLocale(` ${sampleCode.toUpperCase()}_zz `),sampleCode);
  assert.equal(module.exports.dictionaries[sampleCode].file,'Fichier');
  assert.equal(module.exports.isSupportedLocale('toString'),false);
  const shared = {};
  vm.runInNewContext(ts.transpileModule(artifacts.get('packages/shared/src/locales.ts'), {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText, {exports:shared});
  assert.equal(shared.resolveLocale(`${sampleCode}_ZZ`),sampleCode);
  assert.equal(shared.backendTranslations[sampleCode].categories.income,'Revenus');
  assert.deepEqual([...shared.localeCodes],[...module.exports.localeCodes]);
});
test('rejects missing translations, empty text, changed placeholders and conflicting aliases in any layer', () => {
  for (const section of ['ui','categories','receipts','desktop','themes']) {
    const changed = fixture();
    delete changed.at(-1)[section][Object.keys(changed.at(-1)[section])[0]];
    assert.throws(() => validatePacks(changed,categories), /missing or extra/);
  }
  const empty = fixture(); empty.at(-1).desktop.file = ' ';
  assert.throws(() => validatePacks(empty,categories), /empty/);
  const params = fixture(); params.at(-1).receipts.unsupportedType = 'Missing parameter';
  assert.throws(() => validatePacks(params,categories), /placeholders/);
  const alias = fixture(); alias.at(-1).meta.aliases = ['pt'];
  assert.throws(() => validatePacks(alias,categories), /alias/);
});
test('rejects draft packs and generation is deterministic', () => {
  const draft = fixture(); draft.at(-1).meta.draft = true;
  assert.throws(() => validatePacks(draft,categories), /draft/);
  assert.deepEqual([...createArtifacts(packs,categories,ha)], [...createArtifacts([...packs].reverse(),categories,ha)]);
});
