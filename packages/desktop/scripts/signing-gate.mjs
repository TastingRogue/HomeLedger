// Signing material is supplied by trusted CI secrets only; never print it.
const signed = process.env.DESKTOP_SIGNED === 'true';
if (!signed || process.platform === 'linux') {
  console.log(signed ? 'Linux checksums; no OS certificate required.' : 'Unsigned preview: not a stable signed release.');
} else {
  const keys = ['CSC_LINK', 'CSC_KEY_PASSWORD', ...(process.platform === 'darwin' ? ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'] : [])];
  const missing = keys.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Signed build requires configured secrets: ${missing.join(', ')}`);
  if (!process.env.GITHUB_REF?.startsWith('refs/tags/v') && process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Signing is restricted to main or version tags');
  console.log('Signing prerequisites present. Signature/notarization verification is still required after build.');
}
