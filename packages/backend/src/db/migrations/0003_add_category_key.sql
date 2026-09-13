-- Migration: Add stable `key` identifier to categories (system categories).
-- Null for user-created categories. Used to look up the default/"uncategorized"
-- category independently of its displayed name/language.
ALTER TABLE categories ADD COLUMN key text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS categories_key_idx ON categories (key);
