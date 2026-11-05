import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import lifecycle from '../src/lifecycle.cjs';
import diagnostics from '../src/diagnostics.cjs';

async function childFixture(mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-desktop-child-'));
  const file = path.join(dir, 'child.cjs');
  fs.writeFileSync(file, `
    process.on('message', message => {
      if (message.type === 'shutdown' && process.argv[2] === 'cooperative') process.exit(0);
    });
    setInterval(() => {}, 1000);
    process.send({ type: 'ready' });
  `);
  const child = fork(file, [mode], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], execArgv: [], windowsHide: true });
  await once(child, 'message');
  return { child, async cleanup() {
    if (!lifecycle.hasExited(child)) { const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; }
    fs.rmSync(dir, { recursive: true, force: true });
  } };
}

test('cooperative backend exits through IPC without reaching force-kill timeout', { timeout: 10000 }, async () => {
  const fixture = await childFixture('cooperative');
  try {
    let forced = false;
    await lifecycle.stopChild(fixture.child, { timeoutMs: 2000, onTimeout: () => { forced = true; } });
    assert.equal(fixture.child.exitCode, 0);
    assert.equal(forced, false);
  } finally { await fixture.cleanup(); }
});

test('unresponsive backend is forcibly terminated and can be stopped again without hanging', { timeout: 10000 }, async () => {
  const fixture = await childFixture('stubborn');
  try {
    let forced = false;
    await lifecycle.stopChild(fixture.child, { timeoutMs: 50, onTimeout: () => { forced = true; } });
    assert.equal(forced, true);
    assert.equal(lifecycle.hasExited(fixture.child), true);
    // Regression: signal termination leaves exitCode=null, but Retry must resolve.
    await lifecycle.stopChild(fixture.child, { timeoutMs: 50, onTimeout: () => assert.fail('Already dead process reached timeout') });
  } finally { await fixture.cleanup(); }
});

test('unexpected backend kill does not leave a stale process blocking Retry', { timeout: 10000 }, async () => {
  const fixture = await childFixture('stubborn');
  try {
    const exited = once(fixture.child, 'exit');
    fixture.child.kill('SIGKILL');
    await exited;
    assert.equal(lifecycle.hasExited(fixture.child), true);
    await lifecycle.stopChild(fixture.child);
  } finally { await fixture.cleanup(); }
});

test('inaccessible diagnostics never throw or overwrite the obstruction', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-desktop-log-'));
  try {
    fs.writeFileSync(path.join(dir, 'logs'), 'preserve this file');
    assert.equal(diagnostics.appendDiagnostic(dir, 'START_FAILED'), false);
    assert.equal(fs.readFileSync(path.join(dir, 'logs'), 'utf8'), 'preserve this file');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
