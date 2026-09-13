-- Migration: composite index on transactions(account_id, type).
-- AccountService.calculateBalance sums transactions filtered by account_id AND
-- type ('Ingreso' / 'Gasto'); previously only transactions_account_id_idx
-- existed, so SQLite searched by account_id then filtered type row-by-row. This
-- composite lets the per-account income/expense SUMs be satisfied straight from
-- the index. calculateBalance runs in N+1 loops on the dashboard, accounts list,
-- and net-worth paths, so the win compounds. Purely additive (no data change);
-- IF NOT EXISTS keeps it safe on installs that already created it.
CREATE INDEX IF NOT EXISTS `transactions_account_id_type_idx` ON `transactions` (`account_id`,`type`);
