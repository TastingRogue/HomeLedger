/**
 * Performance benchmark for HomeLedger's hot read paths against a large dataset.
 *
 * Seeds a throwaway SQLite DB (its own DATA_DIR) with N transactions spread over
 * ~2 years across several accounts/categories, then times the real service
 * methods and dumps EXPLAIN QUERY PLAN for the key queries so we can confirm
 * index usage. Not a test — a diagnostic you run on demand:
 *
 *   npx tsx scripts/perf-bench.ts            # default 5000 transactions
 *   npx tsx scripts/perf-bench.ts 20000      # custom count
 *
 * Cleans up its temp DB on exit.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Point the DB at a fresh temp dir BEFORE importing the connection module.
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-bench-'));
process.env['DATA_DIR'] = TMP_DIR;

const N = parseInt(process.argv[2] ?? '5000', 10);

async function main(): Promise<void> {
  const { getDb, getSqlite, initializeDatabase, closeDatabase } = await import('../src/db/connection.js');
  const { AccountService } = await import('../src/services/account.service.js');
  const { ReportService } = await import('../src/services/report.service.js');
  const { NetWorthService } = await import('../src/services/networth.service.js');
  const { CategoryService } = await import('../src/services/category.service.js');
  const { TransactionService } = await import('../src/services/transaction.service.js');

  initializeDatabase();
  const sqlite = getSqlite();
  const db = getDb();

  // ── Seed ────────────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const NUM_ACCOUNTS = 10;
  const NUM_CATEGORIES = 20;

  sqlite.prepare(
    "INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES ('bench@x.com','x','Bench','admin',?,?)"
  ).run(now, now);
  const userId = 1;

  const insAcct = sqlite.prepare(
    "INSERT INTO accounts (user_id, name, type, initial_balance, status, currency, created_at, updated_at) VALUES (?,?,?,?, 'Activo','MXN',?,?)"
  );
  const insCat = sqlite.prepare(
    "INSERT INTO categories (user_id, key, name, type, is_system, created_at) VALUES (?, NULL, ?, ?, 0, ?)"
  );
  const insTx = sqlite.prepare(
    "INSERT INTO transactions (user_id, account_id, category_id, name, amount, type, date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
  );

  const seed = sqlite.transaction(() => {
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
      insAcct.run(userId, `Account ${i}`, i % 4 === 0 ? 'Crédito' : 'Débito', 1000, now, now);
    }
    for (let i = 0; i < NUM_CATEGORIES; i++) {
      insCat.run(userId, `Category ${i}`, i === 0 ? 'Ingreso' : 'Gasto', now);
    }
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    const spanMs = Date.now() - start.getTime();
    for (let i = 0; i < N; i++) {
      const accountId = (i % NUM_ACCOUNTS) + 1;
      const categoryId = (i % NUM_CATEGORIES) + 1;
      const isIncome = i % 5 === 0;
      const date = new Date(start.getTime() + Math.floor((i / N) * spanMs)).toISOString().slice(0, 10);
      insTx.run(userId, accountId, categoryId, `Tx ${i}`, Math.round(Math.random() * 500000) / 100, isIncome ? 'Ingreso' : 'Gasto', date, now, now);
    }
  });
  seed();

  // A couple of active budgets with categories to exercise getBudgetVsActual.
  const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const farFuture = new Date(); farFuture.setFullYear(farFuture.getFullYear() + 1);
  sqlite.prepare("INSERT INTO budgets (user_id, name, period, start_date, end_date, created_at, updated_at) VALUES (?, 'B', 'monthly', ?, ?, ?, ?)")
    .run(userId, twoYearsAgo.toISOString().slice(0, 10), farFuture.toISOString().slice(0, 10), now, now);
  for (let c = 2; c <= 8; c++) {
    sqlite.prepare("INSERT INTO budget_categories (budget_id, category_id, allocated, rollover) VALUES (1, ?, 5000, 0)").run(c);
  }

  console.log(`\nSeeded ${N} transactions, ${NUM_ACCOUNTS} accounts, ${NUM_CATEGORIES} categories.\n`);

  // ── Timing helper ─────────────────────────────────────────────────────────
  async function bench(label: string, fn: () => unknown | Promise<unknown>, runs = 20): Promise<void> {
    // warm up
    await fn();
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) await fn();
    const ms = (performance.now() - t0) / runs;
    console.log(`  ${label.padEnd(42)} ${ms.toFixed(3)} ms/op`);
  }

  const y2 = twoYearsAgo.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  console.log('Timings (avg over runs):');
  await bench('AccountService.calculateBalance (1 acct)', () => AccountService.calculateBalance(1));
  await bench('accounts list (getActive + N balances)', async () => {
    const accts = await AccountService.getActive(userId);
    for (const a of accts) await AccountService.calculateBalance(a.id);
  });
  await bench('ReportService.getDashboard', () => ReportService.getDashboard(userId), 10);
  await bench('NetWorthService.getCurrent', () => NetWorthService.getCurrent(userId), 10);
  await bench('TransactionService.list (page1/20) + N+1', () => {
    const res = TransactionService.list(userId, { page: 1, pageSize: 20 });
    for (const item of res.items) {
      sqlite.prepare('SELECT name FROM accounts WHERE id = ?').get(item.accountId);
      sqlite.prepare('SELECT name FROM categories WHERE id = ?').get(item.categoryId);
    }
  });
  await bench('CategoryService.getAnalysis (2y)', () => CategoryService.getAnalysis(userId, { startDate: y2, endDate: today }));
  await bench('ReportService.getCashFlow (2y)', () => ReportService.getCashFlow(userId, { startDate: y2, endDate: today }));
  await bench('ReportService.getTrends (12mo)', () => ReportService.getTrends(userId, 12));
  await bench('ReportService.getBudgetVsActual', () => ReportService.getBudgetVsActual(userId));
  await bench('TransactionService.listAllForExport (2y)', () => TransactionService.listAllForExport(userId, { startDate: y2, endDate: today }), 10);

  // ── EXPLAIN QUERY PLAN ──────────────────────────────────────────────────
  const eqp = (label: string, sqlText: string, ...params: unknown[]): void => {
    const plan = sqlite.prepare('EXPLAIN QUERY PLAN ' + sqlText).all(...params) as { detail: string }[];
    console.log(`\n  [EQP] ${label}`);
    for (const row of plan) console.log(`        ${row.detail}`);
  };

  console.log('\nEXPLAIN QUERY PLAN:');
  eqp('calculateBalance income SUM (account_id + type)',
    "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE account_id = ? AND type = 'Ingreso'", 1);
  eqp('list page (user_id ORDER BY date DESC)',
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 20 OFFSET 0', userId);
  eqp('monthly income sum (user_id + type + date range)',
    "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id = ? AND type = 'Ingreso' AND date >= ? AND date <= ?", userId, y2, today);
  eqp('category analysis GROUP BY (join categories)',
    "SELECT t.category_id, COALESCE(SUM(t.amount),0) FROM transactions t INNER JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'Gasto' AND t.date >= ? AND t.date <= ? GROUP BY t.category_id", userId, y2, today);

  closeDatabase();
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => {
    try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* best effort */ }
  });
