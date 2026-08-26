/**
 * Standalone migration script.
 * Run with: npx tsx src/db/migrate.ts
 *
 * Applies all pending database migrations to the SQLite database.
 */
import { initializeDatabase, closeDatabase } from './connection.js';

function main(): void {
  console.log('Running database migrations...');

  try {
    initializeDatabase();
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
}

main();
