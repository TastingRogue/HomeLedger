/**
 * Currency conversion helpers for cross-account aggregations (P4.11).
 *
 * Every account carries a `currency` and an `exchangeRate` (the rate to convert
 * the account's native amount into the instance/base currency). Consolidating
 * views (dashboard totals, net worth, cash flow, reports, budgets) must convert
 * each account's amounts to base before summing, so mixed-currency installs
 * produce correct base-currency totals.
 *
 * IMPORTANT: conversion happens ONLY in these consolidating callers — never
 * inside `AccountService.calculateBalance`, which stays in native units — to
 * avoid double-conversion.
 *
 * Single-currency installs are a no-op: every account's rate is 1.
 */

import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { accounts } from '../db/schema.js';
import { roundMoney } from './money.js';

/** Convert a native amount to base currency using the account's rate. */
export function toBase(amount: number, exchangeRate: number): number {
  return roundMoney(amount * (Number.isFinite(exchangeRate) && exchangeRate > 0 ? exchangeRate : 1));
}

/**
 * Loads a `Map<accountId, exchangeRate>` for a user's accounts, so aggregators
 * can convert per-account amounts to base without an extra query per row.
 */
export function loadAccountRates(userId: number): Map<number, number> {
  const db = getDb();
  const rows = db
    .select({ id: accounts.id, rate: accounts.exchangeRate })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .all();
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.id, r.rate && r.rate > 0 ? r.rate : 1);
  return map;
}

/** The rate for one account id (defaults to 1 when unknown). */
export function rateFor(rates: Map<number, number>, accountId: number): number {
  return rates.get(accountId) ?? 1;
}
