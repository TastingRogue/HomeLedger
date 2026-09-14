/**
 * CustomReportService — user-saved report definitions (P4.10).
 *
 * A "custom report" is just a saved view: a name, one of the built-in report
 * types, and a JSON config (date range, limit, etc.) the frontend re-runs
 * locally. Stored in a runtime-ensured table (no formal migration, mirroring the
 * receipt tables pattern).
 */

import { getSqlite } from '../db/connection.js';

/** Report types a saved custom report can point at. */
export const CUSTOM_REPORT_TYPES = [
  'cashflow',
  'trends',
  'categories',
  'budget-vs-actual',
  'savings-rate',
  'debt',
  'credit-utilization',
  'merchant',
] as const;
export type CustomReportType = (typeof CUSTOM_REPORT_TYPES)[number];

export interface CustomReport {
  id: number;
  userId: number;
  name: string;
  type: CustomReportType;
  config: Record<string, unknown>;
  createdAt: string;
}

export class CustomReportError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'CustomReportError';
    this.code = code;
  }
}

function ensureTable(): void {
  getSqlite().exec(`
    CREATE TABLE IF NOT EXISTS custom_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS custom_reports_user_id_idx ON custom_reports(user_id);
  `);
}

function hydrate(row: Record<string, unknown>): CustomReport {
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(String(row.config ?? '{}')); } catch { config = {}; }
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: String(row.name),
    type: String(row.type) as CustomReportType,
    config,
    createdAt: String(row.created_at),
  };
}

export class CustomReportService {
  static list(userId: number): CustomReport[] {
    ensureTable();
    const rows = getSqlite()
      .prepare('SELECT * FROM custom_reports WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];
    return rows.map(hydrate);
  }

  static create(userId: number, input: { name: string; type: string; config?: Record<string, unknown> }): CustomReport {
    ensureTable();
    const name = (input.name ?? '').trim();
    if (!name) throw new CustomReportError('El nombre es obligatorio', 'NAME_REQUIRED');
    if (!CUSTOM_REPORT_TYPES.includes(input.type as CustomReportType)) {
      throw new CustomReportError('Tipo de reporte no válido', 'INVALID_TYPE');
    }
    const now = new Date().toISOString();
    const result = getSqlite()
      .prepare('INSERT INTO custom_reports (user_id, name, type, config, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name.substring(0, 100), input.type, JSON.stringify(input.config ?? {}), now);
    return hydrate(
      getSqlite().prepare('SELECT * FROM custom_reports WHERE id = ?').get(Number(result.lastInsertRowid)) as Record<string, unknown>,
    );
  }

  static delete(id: number, userId: number): boolean {
    ensureTable();
    const existing = getSqlite().prepare('SELECT id FROM custom_reports WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) throw new CustomReportError('Reporte no encontrado', 'NOT_FOUND');
    getSqlite().prepare('DELETE FROM custom_reports WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  }
}
