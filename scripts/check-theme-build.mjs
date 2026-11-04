// Run after npm run build. Verifies actual production HTML/CSS and the
// serialized first-paint script without depending on a browser or user data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { runInNewContext } from 'node:vm';
import { handler } from '../packages/frontend/build/handler.js';

const server = createServer(handler);
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${base}/login`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const externalBootstrap = await fetch(`${base}/appearance.js`);
  assert.equal(externalBootstrap.status, 200);
  const script = scripts.find(value => value.includes('sf_ui_skin')) ?? await externalBootstrap.text();
  assert.match(response.headers.get('content-security-policy') ?? '', /script-src/);
  assert.ok(script, 'Missing production appearance bootstrap');

  for (const [id, mode, expectedId, expectedScheme, expectedColor] of [
    ['cyberpunk', 'light', 'cyberpunk', 'dark', '#100b10'],
    ['normal', 'light', 'normal', 'light', '#eef1f6'],
    ['normal', 'dark', 'normal', 'dark', '#0b1118'],
    ['removed-theme', 'light', 'normal', 'light', '#eef1f6'],
  ]) {
    const attributes = {};
    const root = { style: {}, setAttribute: (key, value) => { attributes[key] = value; } };
    const meta = { setAttribute: (key, value) => { attributes[`meta-${key}`] = value; } };
    runInNewContext(script, {
      document: {
        documentElement: root, querySelector: () => meta,
        getElementById: () => null,
        createElement: () => ({ id: '', textContent: '', remove() {} }),
        head: { appendChild() {} },
      },
      localStorage: { getItem: key => key === 'sf_ui_skin' ? id : mode },
    });
    assert.equal(attributes['data-ui'], expectedId);
    assert.equal(root.style.colorScheme, expectedScheme);
    assert.equal(attributes['meta-content'], expectedColor);
  }

  const stylesheets = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)].map(match => match[1]);
  const css = (await Promise.all(stylesheets.map(async path => {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 200);
    return response.text();
  }))).join('\n');
  assert.match(css, /data-ui=['"]?cyberpunk/);
  assert.match(css, /data-ui=['"]?normal['"]?\]\[data-theme=['"]?light/);
  assert.match(css, /--chart-income:\s*#6ff4ed/);
  console.log('Theme production check passed: HTML, scoped CSS, pre-paint preferences, fallback and browser chrome.');
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
