/** A signal-terminated ChildProcess has a null exitCode and a non-null signalCode. */
function hasExited(child) {
  return !child || !child.pid || child.exitCode !== null || child.signalCode !== null;
}

function stopChild(child, { timeoutMs = 10000, onTimeout = () => {} } = {}) {
  if (hasExited(child)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      clearTimeout(timer);
      child.removeListener('exit', done);
      child.removeListener('error', failed);
    };
    const done = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve();
    };
    const failed = error => {
      if (hasExited(child)) return done();
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };
    const force = () => {
      if (hasExited(child)) return done();
      try { child.kill('SIGKILL'); } catch (error) { failed(error); }
    };
    const timer = setTimeout(() => {
      try { onTimeout(); } finally { force(); }
    }, timeoutMs);
    child.once('exit', done);
    child.once('error', failed);
    if (hasExited(child)) return done();
    if (!child.connected) return force();
    try {
      child.send({ type: 'shutdown' }, error => { if (error) force(); });
    } catch { force(); }
  });
}

module.exports = { hasExited, stopChild };
