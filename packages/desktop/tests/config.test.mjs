import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import config from '../src/config.cjs';

test('installation secret and port survive restart; corrupt config is never replaced silently', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-desktop-config-'));
  try {
    const first = config.loadConfig(dir);
    assert.match(first.jwtSecret, /^[a-f0-9]{64}$/);
    config.saveConfig(dir, { ...first, port: 32145 });
    assert.deepEqual(config.loadConfig(dir), { ...first, port: 32145 });
    fs.writeFileSync(path.join(dir, 'desktop.json'), '{}');
    assert.throws(() => config.loadConfig(dir), /Invalid desktop configuration/);
    assert.equal(fs.readFileSync(path.join(dir, 'desktop.json'), 'utf8'), '{}');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('backend environment cannot inherit server credentials, loader hooks or public binding', () => {
  assert.deepEqual(config.childEnvironment({ SystemRoot: 'system', NODE_OPTIONS: '--import=bad', JWT_SECRET: 'bad', HOST: '0.0.0.0', ADMIN_PASSWORD: 'bad', PATH: 'bad' }), { SystemRoot: 'system' });
});

test('navigation boundaries reject other origins, credentials and executable schemes', () => {
  const origin = 'http://127.0.0.1:45678';
  assert.equal(config.isAppUrl(`${origin}/dashboard`, origin), true);
  assert.equal(config.isAppUrl('http://127.0.0.1:45679/dashboard', origin), false);
  assert.equal(config.isAppUrl('http://u:p@127.0.0.1:45678/', origin), false);
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'https://u:p@example.com/', 'http://127.0.0.1:3000', 'shell:bad']) assert.equal(config.externalUrl(url), false);
  assert.equal(config.externalUrl('https://github.com/TastingRogue/HomeLedger'), true);
  assert.equal(config.isPdfViewerUrl('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html'), true);
  assert.equal(config.isPdfViewerUrl('chrome-extension://another-extension/index.html'), false);
  assert.equal(config.isPdfViewerUrl('https://mhjfbmdgcfjbbpaeojofohoefgiehjai/'), false);
  const viewer = 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html';
  assert.equal(config.isPdfResourceUrl('chrome://resources/js/assert.js', viewer), true);
  assert.equal(config.isPdfResourceUrl('chrome://resources/js/assert.js', origin), false);
  assert.equal(config.isPdfResourceUrl('chrome://settings/', viewer), false);
});

test('window moved off a disconnected display is restored to visible defaults', () => {
  const displays = [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }];
  assert.deepEqual(config.safeBounds({ x: 4000, y: 0, width: 1200, height: 800 }, displays), { width: 1280, height: 850 });
  assert.deepEqual(config.safeBounds({ x: 40, y: 40, width: 1200, height: 800 }, displays), { x: 40, y: 40, width: 1200, height: 800 });
});

test('packaged QA cannot redirect a normal profile or touch an arbitrary directory', () => {
  assert.equal(config.qaProfile('/anything', false), null);
  assert.throws(() => config.qaProfile(path.resolve('data'), true));
  const temporary = path.join(os.tmpdir(), 'homeledger-desktop-qa-test');
  assert.equal(config.qaProfile(temporary, true), path.resolve(temporary));
});
