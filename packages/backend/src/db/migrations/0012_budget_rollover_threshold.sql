-- Migration: persist envelope-budgeting settings on budgets (P4.3 Phase A).
-- `rollover_enabled` and `alert_threshold` were accepted by the API but never
-- stored (getCurrent/getById hardcoded them). Two additive, defaulted columns:
--   rollover_enabled — carry unused budget into the next period (default off)
--   alert_threshold  — % of allocation that fires a "near limit" warning (default 80)
ALTER TABLE `budgets` ADD COLUMN `rollover_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `budgets` ADD COLUMN `alert_threshold` real DEFAULT 80 NOT NULL;
