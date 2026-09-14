-- Migration: multi-currency, manual-first (P4.11).
-- Two additive, defaulted columns so existing single-currency installs are a
-- pure no-op (rate = 1, and the transfer destination amount falls back to the
-- source amount):
--   accounts.exchange_rate    — the rate to convert this account's native amount
--                               into the instance/base currency. Default 1 (base).
--   transfers.destination_amount — the amount that ENTERS the destination in its
--                               own currency (the existing `amount` is what LEAVES
--                               the source). NULL → same currency, use `amount`.
-- Aggregations convert amount×exchange_rate to base; per-account/per-card views
-- stay in native units. calculateBalance uses COALESCE(destination_amount, amount)
-- for the transfers-in leg so cross-currency transfers are correct on both sides.
ALTER TABLE `accounts` ADD COLUMN `exchange_rate` real DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `transfers` ADD COLUMN `destination_amount` real;
