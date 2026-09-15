-- Migration: richer transaction model (P4.1, v1.x depth).
-- Adds five additive, optional columns to `transactions`. All are nullable or
-- carry a constant default, so SQLite `ADD COLUMN` applies in place with no table
-- rebuild and no data change:
--   merchant     — payee, separate from the free-text name/notes (nullable)
--   subtype      — refund / reimbursement / adjustment; refines a tx WITHOUT
--                  changing `type` (balance still sums by type) (nullable)
--   reconciled   — cleared against a statement; default 0 (not reconciled)
--   status       — 'pending' | 'posted'; manual entries are already 'posted'
--   external_id  — stable id from an imported source (bank reference), for dedupe
-- Plus a composite index for import-dedupe lookups by (user_id, external_id).
-- IF NOT EXISTS on the index keeps it safe on installs that already created it.
ALTER TABLE `transactions` ADD COLUMN `merchant` text;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `subtype` text;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `reconciled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `status` text DEFAULT 'posted' NOT NULL;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `external_id` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transactions_user_id_external_id_idx` ON `transactions` (`user_id`,`external_id`);
