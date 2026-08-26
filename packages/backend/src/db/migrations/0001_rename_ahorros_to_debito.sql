-- Migration: Rename account type 'Ahorros' to 'Débito'
UPDATE accounts SET type = 'Débito' WHERE type = 'Ahorros';
