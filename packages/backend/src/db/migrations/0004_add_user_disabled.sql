-- Migration: Add `disabled` flag to users. A disabled user cannot log in;
-- lets an admin suspend an account without deleting its data.
ALTER TABLE users ADD COLUMN disabled integer NOT NULL DEFAULT 0;
