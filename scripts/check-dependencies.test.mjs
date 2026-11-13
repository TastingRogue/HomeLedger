import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReport } from './check-dependencies.mjs';

const advisory = { name: 'deepmerge', url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4' };
function fixture() {
  return {
    report: {
      metadata: { vulnerabilities: {} },
      vulnerabilities: {
        deepmerge: { severity: 'low', via: [advisory], nodes: ['node_modules/deepmerge'] },
      },
    },
    lock: { packages: { 'node_modules/deepmerge': { dev: true } } },
  };
}
test('permits only the reviewed build-only advisory', () => {
  const { report, lock } = fixture();
  assert.equal(checkReport(report, lock), 1);
  report.vulnerabilities.deepmerge.via = [{ name: 'deepmerge', url: 'https://example.test/new' }];
  assert.throws(() => checkReport(report, lock), /Unreviewed advisory/);
});
test('rejects runtime exposure, higher severity and incomplete audit responses', () => {
  const { report, lock } = fixture();
  lock.packages['node_modules/deepmerge'].dev = false;
  assert.throws(() => checkReport(report, lock), /runtime dependency/);
  report.vulnerabilities.deepmerge.severity = 'high';
  assert.throws(() => checkReport(report, lock), /Unreviewed vulnerability/);
  assert.throws(() => checkReport({ error: 'network' }, lock), /complete report/);
});
