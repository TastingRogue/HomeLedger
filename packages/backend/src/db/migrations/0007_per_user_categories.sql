-- Migration: per-user categories.
-- Categories are now owned by a user (no shared/global rows), so `user_id`
-- becomes NOT NULL and we add a unique (user_id, key) index to prevent
-- duplicate seeding of the same default category for a user.
--
-- SQLite can't ALTER a column to NOT NULL in place, so we rebuild the table
-- (the standard 12-step pattern). Foreign keys are disabled for the rebuild so
-- the child tables' references survive the rename, then re-enabled.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `key` text,
  `name` text NOT NULL,
  `icon` text,
  `color` text,
  `type` text DEFAULT 'Ambos' NOT NULL,
  `is_system` integer DEFAULT false NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
-- Copy only rows that already have a user_id. Any legacy global rows
-- (user_id IS NULL) are dropped here — in the per-user model they no longer
-- belong to anyone. (On a fresh install there are no rows to copy.)
INSERT INTO `__new_categories` (`id`, `user_id`, `key`, `name`, `icon`, `color`, `type`, `is_system`, `created_at`)
  SELECT `id`, `user_id`, `key`, `name`, `icon`, `color`, `type`, `is_system`, `created_at`
  FROM `categories` WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;
--> statement-breakpoint
CREATE INDEX `categories_user_id_idx` ON `categories` (`user_id`);
--> statement-breakpoint
CREATE INDEX `categories_key_idx` ON `categories` (`key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_id_key_unique` ON `categories` (`user_id`,`key`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
