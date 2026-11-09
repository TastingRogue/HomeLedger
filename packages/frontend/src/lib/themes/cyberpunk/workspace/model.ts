import type { TranslationKey } from '$lib/i18n/es';
import type { Attachment } from '$lib/api/attachments';
import { apiGet } from '$lib/api/client';
import { dictionaries, getIntlTag, type SupportedLocale } from '$lib/i18n/registry';

export type Row = Record<string, unknown> & { id: number };
export const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
export const text = (value: unknown): string => value == null ? '' : String(value);
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export function rows(value: unknown): Row[] {
  const data = Array.isArray(value) ? value : object(value).items;
  return Array.isArray(data) ? data.map((item, i) => ({ ...object(item), id: number(object(item).id ?? object(item).categoryId ?? i) })) : [];
}

export const routes = [
  ['dashboard', 'nav.dashboard', 'layout-dashboard', 'cyberpunk.route_dashboard_description'],
  ['cuentas', 'nav.accounts', 'building', 'cyberpunk.route_cuentas_description'],
  ['transacciones', 'nav.transactions', 'coins', 'cyberpunk.route_transacciones_description'],
  ['transferencias', 'nav.transfers', 'arrow-left-right', 'cyberpunk.route_transferencias_description'],
  ['suscripciones', 'nav.subscriptions', 'repeat', 'cyberpunk.route_suscripciones_description'],
  ['calendario', 'subscriptions.view_calendar', 'calendar', 'cyberpunk.route_calendario_description'],
  ['presupuestos', 'nav.budgets', 'clipboard', 'cyberpunk.route_presupuestos_description'],
  ['metas', 'nav.goals', 'target', 'cyberpunk.route_metas_description'],
  ['prestamos', 'nav.loans', 'credit-card', 'cyberpunk.route_prestamos_description'],
  ['patrimonio', 'nav.networth', 'trending-up', 'cyberpunk.route_patrimonio_description'],
  ['categorias', 'nav.categories', 'tag', 'cyberpunk.route_categorias_description'],
  ['reglas', 'nav.rules', 'zap', 'cyberpunk.route_reglas_description'],
  ['reportes', 'nav.reports', 'bar-chart', 'cyberpunk.route_reportes_description'],
  ['alertas', 'nav.alerts', 'bell', 'cyberpunk.route_alertas_description'],
  ['recibos', 'search.entity_receipts', 'file-text', 'cyberpunk.route_recibos_description'],
  ['importar', 'backup.type_import', 'upload', 'cyberpunk.route_importar_description'],
  ['respaldo', 'page_title.backup', 'save', 'cyberpunk.route_respaldo_description'],
  ['buscar', 'nav.search', 'search', 'cyberpunk.route_buscar_description'],
  ['registro-rapido', 'cyberpunk.quick_entry', 'plus', 'cyberpunk.route_registro-rapido_description'],
  ['configuracion', 'nav.settings', 'settings', 'cyberpunk.route_configuracion_description'],
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
  t: (key: TranslationKey) => string;
  money: (value: unknown, currency?: string) => string;
  date: (value: unknown) => string;
  account: (id: unknown) => string; category: (id: unknown) => string;
}
export function buildModel(data: WorkspaceData, route: string, locale: SupportedLocale, currency: string): Model {
  return {
    ...data, locale, currency, route, t: key => dictionaries[locale][key],
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
