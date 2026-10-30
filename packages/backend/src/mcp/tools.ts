import type { FastifyInstance } from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { scopesSatisfy } from '../config/scopes.js';

/**
 * MCP tools for HomeLedger.
 *
 * Every tool is a thin wrapper over the existing REST API, called in-process
 * with the caller's own API key. That reuses the REST validation and user
 * scoping, so MCP can never see or change more than the key's owner could.
 *
 * API-key scopes are NOT enforced by the REST routes, so each tool checks the
 * scope it needs here before making the call.
 *
 * There is intentionally no delete tool: destructive operations stay in the UI.
 */

export interface McpToolContext {
  app: FastifyInstance;
  /** Raw API key of the caller, forwarded to the internal REST call. */
  apiKey: string;
  /** Scopes of that key; null/empty = full access. */
  scopes: string[] | null;
  /** Client IP, so the internal call is rate-limited per real client. */
  ip: string;
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

function text(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

function failure(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** A bare YYYY-MM-DD becomes midday so timezone shifts can't move the day. */
function normalizeDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date;
}

async function callApi(
  ctx: McpToolContext,
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  payload?: Record<string, unknown>,
): Promise<CallToolResult> {
  const response = await ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { 'x-api-key': ctx.apiKey },
    remoteAddress: ctx.ip,
    ...(payload ? { payload } : {}),
  });
  let body: { success?: boolean; data?: unknown; error?: { code?: string; message?: string } } | null = null;
  try {
    body = response.json();
  } catch {
    body = null;
  }
  if (response.statusCode >= 200 && response.statusCode < 300 && body?.success) {
    return text(body.data);
  }
  const code = body?.error?.code ?? `HTTP_${response.statusCode}`;
  const message = body?.error?.message ?? 'La solicitud falló';
  return failure(`${code}: ${message}`);
}

/** Returns an error result when the key lacks `scope`, otherwise null. */
function denied(ctx: McpToolContext, scope: string): CallToolResult | null {
  return scopesSatisfy(ctx.scopes, scope)
    ? null
    : failure(`INSUFFICIENT_SCOPE: the API key needs the "${scope}" scope for this tool`);
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const txType = z.enum(['Gasto', 'Ingreso']);

export function createMcpServer(ctx: McpToolContext): McpServer {
  const server = new McpServer({ name: 'homeledger', version: '1.0.0' });

  server.registerTool(
    'list_accounts',
    {
      title: 'List accounts',
      description: 'List the user\'s accounts with their current calculated balance.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:accounts') ?? callApi(ctx, 'GET', '/accounts'),
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description: 'List expense/income categories and subcategories. Needed to get ids for create_transaction.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:categories') ?? callApi(ctx, 'GET', '/categories'),
  );

  server.registerTool(
    'list_transactions',
    {
      title: 'List transactions',
      description:
        'List transactions, newest first, with optional filters. Paginated: use page/pageSize and the hasNext flag in the result.',
      inputSchema: {
        accountId: z.number().int().positive().optional(),
        categoryId: z.number().int().positive().optional(),
        type: txType.optional().describe('Gasto = expense, Ingreso = income'),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        status: z.enum(['pending', 'posted']).optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional().describe('Default 20, max 100'),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      denied(ctx, 'read:transactions') ?? callApi(ctx, 'GET', `/transactions${query(args)}`),
  );

  server.registerTool(
    'get_transaction',
    {
      title: 'Get a transaction',
      description: 'Get a single transaction by id.',
      inputSchema: { id: z.number().int().positive() },
      annotations: READ_ONLY,
    },
    async ({ id }) => denied(ctx, 'read:transactions') ?? callApi(ctx, 'GET', `/transactions/${id}`),
  );

  server.registerTool(
    'list_budgets',
    {
      title: 'List budgets',
      description: 'List budgets.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:budgets') ?? callApi(ctx, 'GET', '/budgets'),
  );

  server.registerTool(
    'get_budget_summary',
    {
      title: 'Budget summary',
      description: 'Budget progress summary: how much of each budget is spent.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:budgets') ?? callApi(ctx, 'GET', '/budgets/summary'),
  );

  server.registerTool(
    'list_goals',
    {
      title: 'List savings goals',
      description: 'List savings goals and their progress.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:goals') ?? callApi(ctx, 'GET', '/goals'),
  );

  server.registerTool(
    'list_subscriptions',
    {
      title: 'List subscriptions',
      description: 'List recurring subscriptions.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:subscriptions') ?? callApi(ctx, 'GET', '/subscriptions'),
  );

  server.registerTool(
    'get_dashboard_report',
    {
      title: 'Dashboard report',
      description: 'High-level financial overview: balances, income and expenses for the current period.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:reports') ?? callApi(ctx, 'GET', '/reports/dashboard'),
  );

  server.registerTool(
    'get_cashflow_report',
    {
      title: 'Cash flow report',
      description: 'Income vs expenses over a date range.',
      inputSchema: { startDate: isoDate, endDate: isoDate },
      annotations: READ_ONLY,
    },
    async (args) => denied(ctx, 'read:reports') ?? callApi(ctx, 'GET', `/reports/cashflow${query(args)}`),
  );

  server.registerTool(
    'get_net_worth',
    {
      title: 'Net worth',
      description: 'Current net worth: assets minus liabilities.',
      annotations: READ_ONLY,
    },
    async () => denied(ctx, 'read:networth') ?? callApi(ctx, 'GET', '/networth/current'),
  );

  server.registerTool(
    'create_transaction',
    {
      title: 'Create a transaction',
      description:
        'Create an expense (Gasto) or income (Ingreso). Look up accountId and categoryId first with list_accounts and list_categories. amount is always positive; the sign comes from type.',
      inputSchema: {
        name: z.string().min(1).max(100),
        accountId: z.number().int().positive(),
        categoryId: z.number().int().positive(),
        subcategoryId: z.number().int().positive().optional(),
        date: z.string().describe('YYYY-MM-DD or ISO date-time'),
        amount: z.number().positive().max(999999999.99).describe('Positive, up to 2 decimals'),
        type: txType,
        merchant: z.string().max(100).optional(),
        status: z.enum(['pending', 'posted']).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) =>
      denied(ctx, 'write:transactions') ??
      callApi(ctx, 'POST', '/transactions', { ...args, date: normalizeDate(args.date) }),
  );

  server.registerTool(
    'update_transaction',
    {
      title: 'Update a transaction',
      description: 'Change fields of an existing transaction. Only the fields you pass are changed.',
      inputSchema: {
        id: z.number().int().positive(),
        name: z.string().min(1).max(100).optional(),
        accountId: z.number().int().positive().optional(),
        categoryId: z.number().int().positive().optional(),
        subcategoryId: z.number().int().positive().optional(),
        date: z.string().optional().describe('YYYY-MM-DD or ISO date-time'),
        amount: z.number().positive().max(999999999.99).optional(),
        type: txType.optional(),
        merchant: z.string().max(100).optional(),
        status: z.enum(['pending', 'posted']).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, ...changes }) => {
      const scopeError = denied(ctx, 'write:transactions');
      if (scopeError) return scopeError;
      const payload: Record<string, unknown> = { ...changes };
      if (typeof changes.date === 'string') payload['date'] = normalizeDate(changes.date);
      return callApi(ctx, 'PUT', `/transactions/${id}`, payload);
    },
  );

  return server;
}
