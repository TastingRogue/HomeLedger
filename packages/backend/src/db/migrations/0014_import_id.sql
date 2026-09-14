-- Migration: associate imported transactions with their import session (P4.4).
-- Adds a nullable `import_id` to `transactions` so the smart importer can:
--   • tag every row it inserts with the session that created it, and
--   • support "undo import" (reverse exactly the rows a given session created).
-- Additive ADD COLUMN (no default → NULL for existing/manual rows) + an index
-- for the undo lookup. IF NOT EXISTS keeps the index safe on re-runs.
--
-- Note: SQLite `ALTER TABLE ... ADD COLUMN` cannot add a column with a REFERENCES
-- clause, so the FK is enforced logically by the app (import_id points at
-- imports.id; on session delete the app nulls it). This matches the existing
-- `attachment_id` column, which is likewise a plain integer at the DB level.
ALTER TABLE `transactions` ADD COLUMN `import_id` integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transactions_import_id_idx` ON `transactions` (`import_id`);
