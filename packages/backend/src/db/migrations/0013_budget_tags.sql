-- Migration: budget-by-tag (P4.3 Phase C). A budget can now allocate an amount
-- to a TAG (from the P4.1 tags M2M), not just a category. Mirrors
-- budget_categories; spent is computed by joining transaction_tags. Purely
-- additive: one new table + its indexes, no change to existing data.
CREATE TABLE `budget_tags` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `budget_id` integer NOT NULL REFERENCES `budgets`(`id`) ON DELETE cascade,
  `tag_id` integer NOT NULL REFERENCES `tags`(`id`) ON DELETE restrict,
  `allocated` real NOT NULL,
  `rollover` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `budget_tags_budget_id_idx` ON `budget_tags` (`budget_id`);
--> statement-breakpoint
CREATE INDEX `budget_tags_tag_id_idx` ON `budget_tags` (`tag_id`);
