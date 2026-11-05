const fs = require('node:fs');
const path = require('node:path');

/** Logging must never prevent recovery when storage is full or inaccessible. */
function appendDiagnostic(directory, message) {
  try {
    const logs = path.join(directory, 'logs');
    fs.mkdirSync(logs, { recursive: true, mode: 0o700 });
    const file = path.join(logs, 'desktop.log');
    if (fs.existsSync(file) && fs.statSync(file).size > 1024 * 1024) {
      fs.renameSync(file, `${file}.previous`);
    }
    fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`, { mode: 0o600 });
    return true;
  } catch { return false; }
}

module.exports = { appendDiagnostic };
