import type { Attachment } from '$lib/api/attachments';
import { apiGet } from '$lib/api/client';
import { getIntlTag, type SupportedLocale } from '$lib/i18n/registry';

export type Row = Record<string, unknown> & { id: number };
export const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
export const text = (value: unknown): string => value == null ? '' : String(value);
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export function rows(value: unknown): Row[] {
  const data = Array.isArray(value) ? value : object(value).items;
  return Array.isArray(data) ? data.map((item, i) => ({ ...object(item), id: number(object(item).id ?? object(item).categoryId ?? i) })) : [];
}

export const routes = [
  ['dashboard', 'Dashboard', 'Tablero', 'layout-dashboard', 'Your financial overview', 'Tu panorama financiero'],
  ['cuentas', 'Accounts', 'Cuentas', 'building', 'Your accounts and credit cards', 'Tus cuentas y tarjetas'],
  ['transacciones', 'Transactions', 'Transacciones', 'coins', 'Every movement, in one place', 'Todos tus movimientos en un lugar'],
  ['transferencias', 'Transfers', 'Transferencias', 'arrow-left-right', 'Move money between your accounts', 'Mueve dinero entre tus cuentas'],
  ['suscripciones', 'Subscriptions', 'Suscripciones', 'repeat', 'Recurring payments and upcoming renewals', 'Pagos recurrentes y próximos vencimientos'],
  ['calendario', 'Calendar', 'Calendario', 'calendar', 'Your payment calendar', 'Tu calendario de pagos'],
  ['presupuestos', 'Budgets', 'Presupuestos', 'clipboard', 'Allocate your money with intention', 'Asigna tu dinero con intención'],
  ['metas', 'Goals', 'Metas', 'target', 'Small steps. Real progress.', 'Pequeños pasos. Progreso real.'],
  ['prestamos', 'Loans', 'Préstamos', 'credit-card', 'Balances, payments and amortization', 'Saldos, pagos y amortización'],
  ['patrimonio', 'Net worth', 'Patrimonio', 'trending-up', 'The complete picture of your finances', 'La visión completa de tus finanzas'],
  ['categorias', 'Categories', 'Categorías', 'tag', 'Organize your income and expenses', 'Organiza tus ingresos y gastos'],
  ['reglas', 'Rules', 'Reglas', 'zap', 'Automate transaction categorization', 'Automatiza la clasificación de movimientos'],
  ['reportes', 'Reports', 'Reportes', 'bar-chart', 'Understand your history and trends', 'Entiende tu historial y tendencias'],
  ['alertas', 'Alerts', 'Alertas', 'bell', 'Stay ahead of your finances', 'Mantén el control de tus finanzas'],
  ['recibos', 'Receipts', 'Recibos', 'file-text', 'Your receipts and extracted details', 'Tus comprobantes y datos extraídos'],
  ['importar', 'Import', 'Importar', 'upload', 'Import a bank statement', 'Importa un estado de cuenta'],
  ['respaldo', 'Backup', 'Respaldo', 'save', 'Export and restore your data', 'Exporta y restaura tus datos'],
  ['buscar', 'Search', 'Buscar', 'search', 'Find transactions, receipts and subscriptions', 'Busca movimientos, recibos y suscripciones'],
  ['registro-rapido', 'Quick entry', 'Registro rápido', 'plus', 'Add income or an expense in seconds', 'Registra ingresos o gastos en segundos'],
  ['configuracion', 'Settings', 'Configuración', 'settings', 'Make HomeLedger yours', 'Personaliza tu experiencia'],
] as const;

export interface WorkspaceData {
  attachments: Attachment[]; accounts: Row[]; categories: Row[]; dashboard: Record<string, unknown>;
  transactions: Row[]; transactionTotal: number; trends: Row[];
  transfers: Row[]; subscriptions: Row[]; goals: Row[]; budgets: Row[];
  loans: Row[]; schedule: Row[]; networth: Record<string, unknown>; history: Row[];
  rules: Row[]; alerts: Row[]; receipts: Row[]; backupHistory: Row[];
}
export const emptyData = (): WorkspaceData => ({
  attachments: [], accounts: [], categories: [], dashboard: {}, transactions: [], transactionTotal: 0, trends: [],
  transfers: [], subscriptions: [], goals: [], budgets: [], loans: [], schedule: [], networth: {}, history: [],
  rules: [], alerts: [], receipts: [], backupHistory: [],
});

export interface Model extends WorkspaceData {
  locale: SupportedLocale; currency: string; route: string;
  l: (en: string, es: string) => string;
  money: (value: unknown, currency?: string) => string;
  date: (value: unknown) => string;
  account: (id: unknown) => string; category: (id: unknown) => string;
}
export function buildModel(data: WorkspaceData, route: string, locale: SupportedLocale, currency: string): Model {
  return {
    ...data, locale, currency, route, l: (en, es) => locale === 'es' ? es : en,
    money: (value, unit = currency) => new Intl.NumberFormat(getIntlTag(locale), { style: 'currency', currency: unit, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number(value)),
    date: value => value && !isNaN(Date.parse(text(value))) ? new Intl.DateTimeFormat(getIntlTag(locale), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(text(value).length === 10 ? `${text(value)}T12:00:00` : text(value))) : '—',
    account: id => text(data.accounts.find(row => row.id === number(id))?.name) || '—',
    category: id => text(data.categories.find(row => row.id === number(id))?.name) || '—',
  };
}
export interface Actions {
  edit: (entity: string, row?: Row) => void;
  manage: () => void;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}

export async function loadWorkspace(route: string): Promise<WorkspaceData> {
  const data = emptyData();
  const [accounts, categories, dashboard] = await Promise.all([
    apiGet('/accounts'), apiGet('/categories'), apiGet('/reports/dashboard'),
  ]);
  data.accounts = rows(accounts); data.categories = rows(categories); data.dashboard = object(dashboard);
  const jobs: Promise<void>[] = [];
  const fetchRows = (key: keyof WorkspaceData, path: string) => {
    jobs.push(apiGet(path).then(value => { Object.assign(data, { [key]: rows(value) }); }));
  };
  if (['dashboard', 'transacciones', 'categorias'].includes(route)) jobs.push(apiGet('/transactions', { pageSize: 100, page: 1 }).then(value => {
    data.transactions = rows(value); data.transactionTotal = number(object(value).total);
  }));
  if (['dashboard', 'reportes'].includes(route)) jobs.push(apiGet('/reports/trends', { months: 6 }).then(value => { data.trends = rows(object(value).entries); }));
  if (route === 'transferencias') fetchRows('transfers', '/transfers');
  if (['suscripciones', 'calendario'].includes(route)) fetchRows('subscriptions', '/subscriptions');
  if (['metas', 'dashboard'].includes(route)) fetchRows('goals', '/goals');
  if (route === 'presupuestos') fetchRows('budgets', '/budgets');
  if (route === 'prestamos') fetchRows('loans', '/loans');
  if (route === 'patrimonio') {
    jobs.push(apiGet('/networth/current').then(value => { data.networth = object(value); }));
    fetchRows('history', '/networth/history?range=1y');
  }
  if (route === 'reglas') fetchRows('rules', '/rules');
  if (route === 'alertas') fetchRows('alerts', '/alerts');
  if (route === 'recibos') {fetchRows('receipts', '/receipts');jobs.push(apiGet<Attachment[]>('/attachments').then(value=>{data.attachments=value;}));}
  if (route === 'respaldo') fetchRows('backupHistory', '/backup/history');
  await Promise.all(jobs);
  if (route === 'prestamos' && data.loans[0]) data.schedule = rows(await apiGet(`/loans/${data.loans[0].id}/schedule`));
  return data;
}
