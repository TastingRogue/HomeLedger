import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteInstance: Database.Database | null = null;

/**
 * Returns the path to the SQLite database file.
 * Uses DATA_DIR env var or defaults to ./data relative to project root.
 */
function getDatabasePath(): string {
  const dataDir = process.env['DATA_DIR'] || './data';
  const resolvedDir = path.resolve(dataDir);

  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  return path.join(resolvedDir, 'smart-finance.db');
}

/**
 * Returns the path to the migrations directory.
 */
function getMigrationsPath(): string {
  return path.resolve(__dirname, 'migrations');
}

/**
 * Creates and configures a new SQLite connection with WAL mode and busy timeout.
 */
function createSqliteConnection(): Database.Database {
  const dbPath = getDatabasePath();
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL');

  // Set busy timeout to 5000ms to handle concurrent access gracefully
  sqlite.pragma('busy_timeout = 5000');

  // Enable foreign keys enforcement
  sqlite.pragma('foreign_keys = ON');

  return sqlite;
}

/**
 * Returns the singleton Drizzle ORM database instance.
 * Creates the connection on first call with WAL mode and busy timeout configured.
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    sqliteInstance = createSqliteConnection();
    dbInstance = drizzle(sqliteInstance, { schema });
  }
  return dbInstance;
}

/**
 * Returns the raw better-sqlite3 connection instance.
 * Useful for direct SQL operations or transaction management.
 */
export function getSqlite(): Database.Database {
  if (!sqliteInstance) {
    getDb(); // Ensures connection is created
  }
  return sqliteInstance!;
}

/**
 * Runs all pending database migrations.
 * Should be called on application startup to ensure schema is up to date.
 */
export function initializeDatabase(): void {
  const db = getDb();
  const migrationsFolder = getMigrationsPath();

  migrate(db, { migrationsFolder });

  // Add columns to attachments table if missing (safe migration)
  const sqlite = getSqlite();
  const cols = sqlite.pragma('table_info(attachments)') as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('transfer_id')) {
    sqlite.exec('ALTER TABLE attachments ADD COLUMN transfer_id integer');
  }
  if (!colNames.includes('original_name')) {
    sqlite.exec('ALTER TABLE attachments ADD COLUMN original_name text');
  }
}

/**
 * Closes the database connection and resets the singleton.
 * Useful for graceful shutdown and testing.
 */
export function closeDatabase(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}
