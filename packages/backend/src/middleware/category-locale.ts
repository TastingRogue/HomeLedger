import { backendTranslations, localeCodes } from '@homeledger/shared';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { categories } from '../db/schema.js';
import { SYSTEM_CATEGORIES } from '../db/seed.js';
import { isSupportedLocale } from '../config/locale.js';

/** Localize default display names only; persisted/custom names and backups stay intact. */
export function registerCategoryLocale(app: FastifyInstance): void {
  app.addHook('preSerialization', async (request, reply, payload) => {
    const locale = request.headers['accept-language'];
    if (!isSupportedLocale(locale) || !request.user || request.method !== 'GET' || reply.statusCode >= 400) return payload;
    if (!/^\/api\/v1\/(categories|transactions|reports|budgets|search|rules|subscriptions)(?:[/?]|$)/.test(request.url)) return payload;
    const names = new Map<number, { original: string; localized: string }>();
    for (const category of getDb().select().from(categories).where(eq(categories.userId, request.user.userId)).all()) {
      const seeded = SYSTEM_CATEGORIES.find(item => item.key === category.key);
      if (seeded && localeCodes.some(code => backendTranslations[code].categories[seeded.key] === category.name)) {
        names.set(category.id, { original: category.name, localized: backendTranslations[locale].categories[seeded.key] });
      }
    }
    const visit = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      const row = value as Record<string, unknown>;
      const result = Object.fromEntries(Object.entries(row).map(([key, child]) => [key, visit(child)]));
      const category = typeof row['categoryId'] === 'number' ? names.get(row['categoryId']) : undefined;
      if (category && row['categoryName'] === category.original) result['categoryName'] = category.localized;
      const own = typeof row['id'] === 'number' && typeof row['key'] === 'string' ? names.get(row['id']) : undefined;
      if (own && row['name'] === own.original) {
        result['name'] = own.localized;
        result['originalName'] = own.original;
      }
      return result;
    };
    return visit(payload);
  });
}
