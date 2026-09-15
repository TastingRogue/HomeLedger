-- Migration: TOTP 2FA + login history / session metadata (P4.12).
-- All columns are additive and nullable/defaulted, so existing installs are a
-- pure no-op (2FA stays off; existing refresh tokens simply have no session
-- metadata yet).
--
--   users.totp_secret        — base32 TOTP secret (RFC 6238). NULL until enrolled.
--   users.totp_enabled       — 0/1; only 1 after the user confirms a valid code.
--   users.totp_backup_codes  — JSON array of sha256-hashed one-time recovery codes.
--   refresh_tokens.user_agent / .ip — captured at login so sessions are listable.
--   refresh_tokens.last_used_at     — bumped on refresh; shows recent activity.
ALTER TABLE `users` ADD COLUMN `totp_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `totp_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `totp_backup_codes` text;
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD COLUMN `user_agent` text;
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD COLUMN `ip` text;
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD COLUMN `last_used_at` text;
