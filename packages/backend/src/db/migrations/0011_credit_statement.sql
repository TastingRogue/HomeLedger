-- Migration: credit-card statement modeling (P4.2, v1.x depth).
-- Four additive, optional columns on `accounts`, only meaningful for credit
-- accounts. All nullable → SQLite `ADD COLUMN` applies in place, no data change:
--   statement_day     — day of month (1–31) the statement closes
--   payment_due_day   — day of month (1–31) the payment is due
--   apr               — annual percentage rate (informational)
--   minimum_payment   — minimum payment for the current statement
ALTER TABLE `accounts` ADD COLUMN `statement_day` integer;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `payment_due_day` integer;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `apr` real;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `minimum_payment` real;
