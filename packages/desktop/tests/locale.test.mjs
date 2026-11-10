import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { resolveLocale, text, portuguese } = require('../src/locale.cjs');
test('resolves Brazilian locale and preserves English/Spanish fallback', () => {
  for (const locale of ['pt', 'pt-BR', 'pt_BR']) assert.equal(resolveLocale(locale), 'pt-BR');
  assert.equal(resolveLocale('es-MX'), 'es');
  assert.equal(resolveLocale('fr'), 'en');
  assert.equal(text('pt-BR', 'File', 'Archivo'), 'Arquivo');
});
test('every explicit native menu and dialog string has a Portuguese translation', () => {
  const source = readFileSync(new URL('../src/main.cjs', import.meta.url), 'utf8');
  for (const match of source.matchAll(/\btext\('([^']+)'\s*,/g)) {
    assert.ok(portuguese[match[1]], `Missing Portuguese: ${match[1]}`);
  }
});
