// Generates a HomeLedger backup JSON pre-filled with realistic demo data so the
// UI looks populated for screenshots. Run: `node scripts/generate-demo-backup.mjs`
// Output: homeledger-demo-backup.json at the repo root.
//
// Import it via the app: Settings -> Data & Backup -> Import (confirm replace).
// It matches the BackupService format (version 0.1.0, data.* arrays). IDs are
// preserved on import and userId is overwritten with the importing user's id.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'homeledger-demo-backup.json');

// ─── Date helpers (relative to "now" so the current month is populated) ───
const now = new Date();
const iso = (d) => d.toISOString();
/** Date n days ago at a fixed-ish hour, as ISO string. */
function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return iso(d);
}
/** First day of the month, m months from the current one (m<=0 = past/current). */
function monthStart(m) {
  const d = new Date(now.getFullYear(), now.getMonth() + m, 1, 0, 0, 0, 0);
  return iso(d);
}
function monthEnd(m) {
  const d = new Date(now.getFullYear(), now.getMonth() + m + 1, 0, 23, 59, 59, 0);
  return iso(d);
}
/** A day within a given month offset (m<=0). day is 1-based, clamped. */
function dayInMonth(m, day, hour = 12) {
  const base = new Date(now.getFullYear(), now.getMonth() + m, 1);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const d = new Date(base.getFullYear(), base.getMonth(), Math.min(day, daysInMonth), hour, 0, 0, 0);
  return iso(d);
}
function daysFromNow(n, hour = 9) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return iso(d);
}
const CREATED = daysAgo(120);

// ─── Accounts ───
// Mix of types so the dashboard, credit utilization and net worth all show data.
const accounts = [
  { id: 1, name: 'Nómina', type: 'Débito', bank: 'BBVA', initialBalance: 18500, balanceLimit: null, creditLimit: null, status: 'Activo', currency: 'MXN', createdAt: CREATED, updatedAt: CREATED },
  { id: 2, name: 'Tarjeta Oro', type: 'Crédito', bank: 'Santander', initialBalance: 0, balanceLimit: null, creditLimit: 45000, status: 'Activo', currency: 'MXN', createdAt: CREATED, updatedAt: CREATED },
  { id: 3, name: 'Ahorro Inversión', type: 'Inversión', bank: 'Nu', initialBalance: 62000, balanceLimit: null, creditLimit: null, status: 'Activo', currency: 'MXN', createdAt: CREATED, updatedAt: CREATED },
  { id: 4, name: 'Efectivo', type: 'Efectivo', bank: null, initialBalance: 2400, balanceLimit: null, creditLimit: null, status: 'Activo', currency: 'MXN', createdAt: CREATED, updatedAt: CREATED },
];

// ─── Categories ───
// type: 'Gasto' | 'Ingreso' | 'Ambos'. Icons match the Icon.svelte set loosely.
// NOTE: on import, the app deletes the user's own rows but NOT seeded/global
// system categories (those have userId = NULL and survive). To avoid an
// "UNIQUE constraint failed: categories.id" collision with those seeded ids,
// the demo categories use a high id base unlikely to clash.
const CAT_BASE = 9000;
const categories = [
  { id: CAT_BASE + 1, name: 'Salario', icon: 'wallet', color: '#22c55e', type: 'Ingreso', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 2, name: 'Freelance', icon: 'briefcase', color: '#06b6d4', type: 'Ingreso', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 3, name: 'Supermercado', icon: 'shopping-cart', color: '#f59e0b', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 4, name: 'Restaurantes', icon: 'utensils', color: '#ef4444', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 5, name: 'Transporte', icon: 'car', color: '#3b82f6', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 6, name: 'Servicios', icon: 'zap', color: '#8b5cf6', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 7, name: 'Entretenimiento', icon: 'film', color: '#ec4899', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 8, name: 'Salud', icon: 'heart', color: '#14b8a6', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 9, name: 'Hogar', icon: 'home', color: '#eab308', type: 'Gasto', isSystem: false, createdAt: CREATED },
  { id: CAT_BASE + 10, name: 'Suscripciones', icon: 'repeat', color: '#a78bfa', type: 'Gasto', isSystem: false, createdAt: CREATED },
];

const CAT = {
  salario: CAT_BASE + 1, freelance: CAT_BASE + 2, super: CAT_BASE + 3, resto: CAT_BASE + 4,
  transporte: CAT_BASE + 5, servicios: CAT_BASE + 6, ocio: CAT_BASE + 7, salud: CAT_BASE + 8,
  hogar: CAT_BASE + 9, subs: CAT_BASE + 10,
};

// ─── Transactions ───
// Built across the last 4 months (m = -3..0). Each month: salary + freelance
// income and a spread of expenses so charts, category donut and reports fill in.
const transactions = [];
let txId = 1;
function tx(m, day, name, amount, type, accountId, categoryId) {
  transactions.push({
    id: txId++, accountId, categoryId, subcategoryId: null,
    name, amount, type, date: dayInMonth(m, day),
    notes: null, attachmentId: null,
    createdAt: dayInMonth(m, day), updatedAt: dayInMonth(m, day),
  });
}

// Per-month expense template (varied amounts to make trends interesting).
const monthlyPlan = [
  // m = -3
  { salary: 26500, freelance: 4200, expenses: [
    ['Despensa quincenal', 2380, 3, 1], ['Cena aniversario', 1250, 4, 2],
    ['Gasolina', 900, 5, 1], ['Uber', 320, 5, 1], ['Luz CFE', 740, 6, 1],
    ['Internet', 599, 6, 2], ['Cine', 260, 7, 1], ['Farmacia', 480, 8, 4],
    ['Ferretería', 610, 9, 1], ['Netflix', 219, 10, 2], ['Spotify', 129, 10, 2],
  ] },
  // m = -2
  { salary: 26500, freelance: 3600, expenses: [
    ['Despensa quincenal', 2560, 3, 1], ['Tacos fin de semana', 540, 4, 2],
    ['Gasolina', 980, 5, 1], ['Mantenimiento auto', 1800, 5, 4], ['Agua', 260, 6, 1],
    ['Gas', 480, 6, 1], ['Concierto', 1400, 7, 2], ['Consulta médica', 900, 8, 4],
    ['Muebles', 2100, 9, 2], ['Netflix', 219, 10, 2], ['Spotify', 129, 10, 2],
  ] },
  // m = -1
  { salary: 27000, freelance: 5200, expenses: [
    ['Despensa quincenal', 2440, 3, 1], ['Comida oficina', 760, 4, 1],
    ['Gasolina', 1020, 5, 1], ['Transporte público', 220, 5, 4], ['Luz CFE', 810, 6, 1],
    ['Internet', 599, 6, 2], ['Streaming extra', 199, 7, 2], ['Dentista', 1350, 8, 4],
    ['Decoración', 890, 9, 1], ['Netflix', 219, 10, 2], ['Spotify', 129, 10, 2],
  ] },
  // m = 0 (current month) — keep it healthy and mid-progress for budgets
  { salary: 27000, freelance: 2800, expenses: [
    ['Despensa semanal', 1180, 3, 1], ['Despensa semanal', 1260, 3, 1],
    ['Restaurante amigos', 680, 4, 2], ['Gasolina', 940, 5, 1], ['Uber', 280, 5, 1],
    ['Luz CFE', 690, 6, 1], ['Internet', 599, 6, 2], ['Cine', 240, 7, 1],
    ['Farmacia', 360, 8, 4], ['Netflix', 219, 10, 2], ['Spotify', 129, 10, 2],
  ] },
];

const expenseCatByLabel = {
  3: CAT.super, 4: CAT.resto, 5: CAT.transporte, 6: CAT.servicios,
  7: CAT.ocio, 8: CAT.salud, 9: CAT.hogar, 10: CAT.subs,
};

monthlyPlan.forEach((plan, i) => {
  const m = i - 3; // -3..0
  // Income (salary to Nómina, freelance to Inversión)
  tx(m, 1, 'Salario mensual', plan.salary, 'Ingreso', 1, CAT.salario);
  tx(m, 12, 'Proyecto freelance', plan.freelance, 'Ingreso', 3, CAT.freelance);
  // Expenses: [name, amount, categoryId, dayBucket]
  plan.expenses.forEach(([name, amount, catId, bucket], idx) => {
    const day = 3 + bucket * 5 + (idx % 3); // spread through the month
    // Subscriptions/entertainment on the credit card; a couple of small
    // expenses on cash (kept small so it never goes negative); the rest on debit.
    let acct;
    if (catId === CAT.subs || catId === CAT.ocio) acct = 2; // credit card
    else if (amount <= 320 && idx % 5 === 0) acct = 4;      // cash, small only
    else acct = 1;                                          // debit (Nómina)
    tx(m, day, name, amount, 'Gasto', acct, expenseCatByLabel[catId] ?? catId);
  });
});

// ─── Transfers ───
const transfers = [
  { id: 1, sourceAccountId: 1, destinationAccountId: 3, name: 'Ahorro mensual', amount: 4000, date: dayInMonth(-1, 5), notes: 'Meta de ahorro', createdAt: dayInMonth(-1, 5) },
  { id: 2, sourceAccountId: 1, destinationAccountId: 4, name: 'Retiro efectivo', amount: 1500, date: dayInMonth(0, 4), notes: null, createdAt: dayInMonth(0, 4) },
  { id: 3, sourceAccountId: 1, destinationAccountId: 3, name: 'Ahorro mensual', amount: 4000, date: dayInMonth(0, 6), notes: null, createdAt: dayInMonth(0, 6) },
];

// ─── Subscriptions ───
const subscriptions = [
  { id: 1, accountId: 2, categoryId: CAT.subs, name: 'Netflix', amount: 219, cycle: 'Mensual', startDate: monthStart(-5), nextPaymentDate: daysFromNow(6), autoCharge: true, status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
  { id: 2, accountId: 2, categoryId: CAT.subs, name: 'Spotify', amount: 129, cycle: 'Mensual', startDate: monthStart(-5), nextPaymentDate: daysFromNow(11), autoCharge: true, status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
  { id: 3, accountId: 1, categoryId: CAT.servicios, name: 'Internet Izzi', amount: 599, cycle: 'Mensual', startDate: monthStart(-5), nextPaymentDate: daysFromNow(3), autoCharge: false, status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
  { id: 4, accountId: 2, categoryId: CAT.ocio, name: 'Gym', amount: 650, cycle: 'Mensual', startDate: monthStart(-5), nextPaymentDate: daysFromNow(18), autoCharge: true, status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
];

// ─── Goals ───
const goals = [
  { id: 1, name: 'Fondo de emergencia', targetAmount: 60000, savedAmount: 38500, type: 'ListaDeseos', deadline: monthEnd(4), status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
  { id: 2, name: 'Viaje a Japón', targetAmount: 45000, savedAmount: 12800, type: 'ListaDeseos', deadline: monthEnd(8), status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
  { id: 3, name: 'Laptop nueva', targetAmount: 32000, savedAmount: 32000, type: 'ListaDeseos', deadline: monthEnd(-1), status: 'Completada', createdAt: CREATED, updatedAt: CREATED },
  { id: 4, name: 'Pago tarjeta', targetAmount: 20000, savedAmount: 7500, type: 'Deuda', deadline: monthEnd(3), status: 'Activa', createdAt: CREATED, updatedAt: CREATED },
];

// ─── Budgets (monthly, current month) + allocations ───
// Budgets store dates as plain YYYY-MM-DD (that's what the app writes and what
// its "active budget" filter compares against today's YYYY-MM-DD string).
const dateOnly = (isoStr) => isoStr.split('T')[0];
const budgets = [
  { id: 1, name: 'Presupuesto mensual', period: 'monthly', startDate: dateOnly(monthStart(0)), endDate: dateOnly(monthEnd(0)), createdAt: CREATED, updatedAt: CREATED },
];
const budgetCategories = [
  { id: 1, budgetId: 1, categoryId: CAT.super, allocated: 5000, rollover: 0 },
  { id: 2, budgetId: 1, categoryId: CAT.resto, allocated: 2000, rollover: 0 },
  { id: 3, budgetId: 1, categoryId: CAT.transporte, allocated: 2500, rollover: 0 },
  { id: 4, budgetId: 1, categoryId: CAT.servicios, allocated: 2000, rollover: 0 },
  { id: 5, budgetId: 1, categoryId: CAT.ocio, allocated: 1500, rollover: 0 },
];

// ─── Assets & Liabilities (Net worth / Patrimonio) ───
const assets = [
  { id: 1, name: 'Departamento', value: 1850000, type: 'Propiedad', notes: 'Depto 2 recámaras', createdAt: CREATED, updatedAt: CREATED },
  { id: 2, name: 'Automóvil', value: 265000, type: 'Vehículo', notes: 'Sedán 2021', createdAt: CREATED, updatedAt: CREATED },
  { id: 3, name: 'Portafolio inversión', value: 62000, type: 'Inversión', notes: null, createdAt: CREATED, updatedAt: CREATED },
];
const liabilities = [
  { id: 1, name: 'Hipoteca', balance: 920000, type: 'Hipoteca', notes: 'Plazo 20 años', createdAt: CREATED, updatedAt: CREATED },
  { id: 2, name: 'Crédito automotriz', balance: 84000, type: 'Préstamo', notes: null, createdAt: CREATED, updatedAt: CREATED },
];

// ─── Offset every id + FK reference by a large base ───
// The backup import preserves ids and only deletes the *importing* user's rows.
// Any existing rows from other users (or seeded global categories) keep their
// ids, so low ids like 1..4 can collide ("UNIQUE constraint failed"). Shifting
// everything into a high, unlikely-used range makes the import safe regardless
// of what's already in the target database.
const BASE = 900000;
const off = (v) => (v == null ? v : v + BASE);

for (const a of accounts) a.id = off(a.id);
for (const c of categories) c.id = off(c.id);
for (const t of transactions) { t.id = off(t.id); t.accountId = off(t.accountId); t.categoryId = off(t.categoryId); }
for (const t of transfers) { t.id = off(t.id); t.sourceAccountId = off(t.sourceAccountId); t.destinationAccountId = off(t.destinationAccountId); }
for (const s of subscriptions) { s.id = off(s.id); s.accountId = off(s.accountId); s.categoryId = off(s.categoryId); }
for (const g of goals) g.id = off(g.id);
for (const b of budgets) b.id = off(b.id);
for (const bc of budgetCategories) { bc.id = off(bc.id); bc.budgetId = off(bc.budgetId); bc.categoryId = off(bc.categoryId); }
for (const a of assets) a.id = off(a.id);
for (const l of liabilities) l.id = off(l.id);

// ─── Assemble backup file ───
const backup = {
  version: '0.1.0',
  exportedAt: iso(now),
  userId: 1,
  data: {
    accounts,
    transactions,
    transactionSplits: [],
    transfers,
    subscriptions,
    goals,
    budgets,
    budgetCategories,
    categories,
    subcategories: [],
    rules: [],
    alerts: [],
    assets,
    liabilities,
    loans: [],
    loanPayments: [],
    networthSnapshots: [],
    creditSubscriptions: [],
    recurringTransactions: [],
  },
};

writeFileSync(OUT, JSON.stringify(backup, null, 2), 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`  accounts=${accounts.length} categories=${categories.length} transactions=${transactions.length} transfers=${transfers.length}`);
console.log(`  subscriptions=${subscriptions.length} goals=${goals.length} budgets=${budgets.length} assets=${assets.length} liabilities=${liabilities.length}`);
