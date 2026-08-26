-- Migration: Add type column to categories (Gasto, Ingreso, Ambos)
ALTER TABLE categories ADD COLUMN type TEXT NOT NULL DEFAULT 'Ambos';
