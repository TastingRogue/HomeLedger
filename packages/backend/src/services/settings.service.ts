import { getSqlite } from '../db/connection.js';

/**
 * Instance-wide key/value settings, persisted so they survive restarts and can
 * be changed at runtime by an admin (complementing env bootstrap). Stored in a
 * small `app_settings` table created outside Drizzle migrations (idempotent),
 * mirroring the `backup_history` pattern.
 */
export class SettingsService {
  private static ensureTable(): void {
    // CREATE TABLE IF NOT EXISTS is cheap and idempotent; not cached so it stays
    // correct across connection resets (tests call closeDatabase between suites).
    getSqlite().exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /** Returns the stored value for a key, or null if unset. */
  static get(key: string): string | null {
    SettingsService.ensureTable();
    const row = getSqlite()
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  /** Upserts a setting value. */
  static set(key: string, value: string): void {
    SettingsService.ensureTable();
    getSqlite()
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, value, new Date().toISOString());
  }

  /** Sets a value only if the key is not already present. Returns true if it wrote. */
  static setIfAbsent(key: string, value: string): boolean {
    SettingsService.ensureTable();
    if (SettingsService.get(key) !== null) return false;
    SettingsService.set(key, value);
    return true;
  }
}
