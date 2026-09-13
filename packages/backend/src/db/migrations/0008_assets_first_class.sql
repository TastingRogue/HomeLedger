-- Migration: assets become a first-class entity (P4).
-- Renames `value` → `current_value` and adds descriptive/link columns
-- (brand, model, serial_number, category, purchase_date, purchase_price,
-- location, status, purchase_transaction_id, receipt_attachment_id).
--
-- SQLite can't rename + add-with-constraints in one ALTER cleanly, so we use the
-- standard 12-step table rebuild (same pattern as 0007). FKs are disabled for the
-- rebuild so child references survive, then re-enabled. Existing rows carry over,
-- mapping the old `value` into `current_value`; new columns default to NULL /
-- 'active'.
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_assets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `current_value` real NOT NULL,
  `type` text NOT NULL,
  `brand` text,
  `model` text,
  `serial_number` text,
  `category` text,
  `purchase_date` text,
  `purchase_price` real,
  `location` text,
  `status` text DEFAULT 'active' NOT NULL,
  `purchase_transaction_id` integer REFERENCES `transactions`(`id`) ON DELETE set null,
  `receipt_attachment_id` integer REFERENCES `attachments`(`id`) ON DELETE set null,
  `notes` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_assets` (`id`, `user_id`, `name`, `current_value`, `type`, `notes`, `created_at`, `updated_at`)
  SELECT `id`, `user_id`, `name`, `value`, `type`, `notes`, `created_at`, `updated_at`
  FROM `assets`;
--> statement-breakpoint
DROP TABLE `assets`;
--> statement-breakpoint
ALTER TABLE `__new_assets` RENAME TO `assets`;
--> statement-breakpoint
CREATE INDEX `assets_user_id_idx` ON `assets` (`user_id`);
--> statement-breakpoint
CREATE INDEX `assets_purchase_transaction_id_idx` ON `assets` (`purchase_transaction_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
