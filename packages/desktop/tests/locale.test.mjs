import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { resolveLocale, isSupportedLocale, text, dictionaries, localeCodes } = require('../src/locale.cjs');
test('normalizes OS language tags and rejects unsupported/prototype keys', () => {
  for (const locale of ['pt', 'pt-BR', 'pt_BR']) assert.equal(resolveLocale(locale), 'pt-BR');
  assert.equal(resolveLocale('es-MX'), 'es');
  assert.equal(resolveLocale('zz'), 'en');
  assert.equal(isSupportedLocale('toString'), false);
  assert.equal(text('pt-BR', 'file'), 'Arquivo');
});
test('every native text key is translated in every registered language', () => {
  const source = readFileSync(new URL('../src/main.cjs', import.meta.url), 'utf8');
  const used = [...source.matchAll(/\btext\(["']([^"']+)["']\)/g)].map(m => m[1]);
  assert.ok(used.length > 30);
  for (const locale of localeCodes) {
    assert.deepEqual(Object.keys(dictionaries[locale]).sort(), Object.keys(dictionaries.en).sort());
    for (const key of used) assert.ok(dictionaries[locale][key], `${locale}: missing ${key}`);
  }
});
