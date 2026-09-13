-- Migration: Remove the dead `recurring_transactions` table.
-- It had no service, route, scheduler, or UI (subscriptions with autoCharge
-- already cover recurring needs), so it was unused surface. Dropped in P2.4.
DROP TABLE IF EXISTS recurring_transactions;
