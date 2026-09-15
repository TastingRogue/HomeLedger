-- Migration: API maturity (P4.13) — scoped API keys + user-configured webhooks.
--
--   api_keys.scopes  — JSON array of scope strings. NULL/empty = full access,
--                      so existing keys keep working unchanged.
--   webhooks         — per-user outbound webhooks (fire-and-forget POST on
--                      domain events, optional HMAC-SHA256 signed).
ALTER TABLE `api_keys` ADD COLUMN `scopes` text;
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`url` text NOT NULL,
	`secret` text,
	`events` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`last_status` text,
	`last_attempt_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_user_id_idx` ON `webhooks` (`user_id`);
