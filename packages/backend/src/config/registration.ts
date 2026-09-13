import { SettingsService } from '../services/settings.service.js';

/**
 * Registration policy.
 *
 * - `first_user_only` (default, safe): only the very first user may register
 *   (bootstraps the admin); afterwards registration is closed. Safe on an
 *   exposed instance out of the box.
 * - `open`: anyone may register (optionally restricted by the email allowlist).
 * - `closed`: nobody may register; the admin manages users.
 *
 * The live values are stored in `app_settings` (admin-editable at runtime). On
 * first run they are seeded from the `REGISTRATION_MODE` / `REGISTRATION_ALLOWLIST`
 * env vars for headless setups; env only seeds — it never overrides a value an
 * admin later changes.
 */
export const REGISTRATION_MODES = ['first_user_only', 'open', 'closed'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const SETTING_REGISTRATION_MODE = 'registration_mode';
export const SETTING_REGISTRATION_ALLOWLIST = 'registration_allowlist';

const DEFAULT_MODE: RegistrationMode = 'first_user_only';

function isMode(value: unknown): value is RegistrationMode {
  return typeof value === 'string' && (REGISTRATION_MODES as readonly string[]).includes(value);
}

/** Normalizes an allowlist string into lowercased, trimmed, de-duped emails. */
export function parseAllowlist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )];
}

/**
 * Seeds registration settings from env on first run only (never overwrites an
 * existing admin-set value). Call once at startup after the DB is ready.
 */
export function seedRegistrationSettingsFromEnv(): void {
  const envMode = process.env['REGISTRATION_MODE']?.trim().toLowerCase();
  SettingsService.setIfAbsent(SETTING_REGISTRATION_MODE, isMode(envMode) ? envMode : DEFAULT_MODE);

  const envAllow = process.env['REGISTRATION_ALLOWLIST'];
  if (envAllow !== undefined) {
    // Store the normalized allowlist; empty string means "no allowlist".
    SettingsService.setIfAbsent(SETTING_REGISTRATION_ALLOWLIST, parseAllowlist(envAllow).join(','));
  } else {
    SettingsService.setIfAbsent(SETTING_REGISTRATION_ALLOWLIST, '');
  }
}

/** Current registration mode (live from settings; falls back to default). */
export function getRegistrationMode(): RegistrationMode {
  const stored = SettingsService.get(SETTING_REGISTRATION_MODE);
  return isMode(stored) ? stored : DEFAULT_MODE;
}

/** Current email allowlist (live from settings). Empty = no allowlist. */
export function getRegistrationAllowlist(): string[] {
  return parseAllowlist(SettingsService.get(SETTING_REGISTRATION_ALLOWLIST));
}

export function setRegistrationMode(mode: RegistrationMode): void {
  SettingsService.set(SETTING_REGISTRATION_MODE, mode);
}

export function setRegistrationAllowlist(emails: string[]): void {
  SettingsService.set(SETTING_REGISTRATION_ALLOWLIST, parseAllowlist(emails.join(',')).join(','));
}
