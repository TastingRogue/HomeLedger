import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// No upstream fix exists yet. This package only merges trusted Vite build
// configuration; it must never become a production dependency. See the audit.
const buildOnlyAdvisory = 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4';

export function checkReport(report, lock) {
  if (report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
    throw new Error('npm audit did not return a complete report');
  }
  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    if (entry.severity !== 'low') throw new Error(`Unreviewed vulnerability: ${name}`);
    for (const via of entry.via) {
      if (typeof via === 'string') {
        if (!report.vulnerabilities[via]) throw new Error(`Missing advisory: ${via}`);
      } else if (via.url !== buildOnlyAdvisory || via.name !== 'deepmerge') {
        throw new Error(`Unreviewed advisory: ${via.url}`);
      }
    }
    for (const node of entry.nodes) {
      if (lock.packages[node]?.dev !== true)
        throw new Error(`Vulnerable runtime dependency: ${node}`);
    }
  }
  return Object.keys(report.vulnerabilities).length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let output;
  try {
    output = execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
  } catch (error) {
    if (error.status !== 1 || !error.stdout) throw error;
    output = error.stdout;
  }
  const count = checkReport(
    JSON.parse(output),
    JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8')),
  );
  console.log(
    count
      ? `Reviewed build-only deepmerge advisory remains (${count} affected dependency entries); no other advisories.`
      : 'No dependency advisories. Remove the deepmerge exception when upstream is fixed.',
  );
}
