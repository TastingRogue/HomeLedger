-- Migration: transaction audit history (P4.1 Phase 3) — who/when changed what.
-- One row per create/update/delete of a transaction, with a JSON `changes` diff.
-- `transaction_id` is nullable with ON DELETE SET NULL (NOT cascade) so a
-- `deleted` audit row survives after its transaction is gone. Purely additive.
CREATE TABLE `transaction_audit` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `transaction_id` integer REFERENCES `transactions`(`id`) ON DELETE set null,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `action` text NOT NULL,
  `changes` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transaction_audit_transaction_id_idx` ON `transaction_audit` (`transaction_id`);
--> statement-breakpoint
CREATE INDEX `transaction_audit_user_id_idx` ON `transaction_audit` (`user_id`);
