-- Migration: tags as a first-class, reusable per-user label + M2M join to
-- transactions (P4.1 Phase 2). Replaces the old placeholder behavior where the
-- rules engine's `addTag` action concatenated tags into `transactions.notes`.
-- Purely additive: two new tables + their indexes, no change to existing data.
CREATE TABLE `tags` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `color` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tags_user_id_idx` ON `tags` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_id_name_unique` ON `tags` (`user_id`,`name`);
--> statement-breakpoint
CREATE TABLE `transaction_tags` (
  `transaction_id` integer NOT NULL REFERENCES `transactions`(`id`) ON DELETE cascade,
  `tag_id` integer NOT NULL REFERENCES `tags`(`id`) ON DELETE cascade,
  PRIMARY KEY(`transaction_id`, `tag_id`)
);
--> statement-breakpoint
CREATE INDEX `transaction_tags_transaction_id_idx` ON `transaction_tags` (`transaction_id`);
--> statement-breakpoint
CREATE INDEX `transaction_tags_tag_id_idx` ON `transaction_tags` (`tag_id`);
