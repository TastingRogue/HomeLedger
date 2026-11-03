import { formatCurrency } from './format';
import type { Translate } from '../i18n/labels';
type AlertCopy = { id?: number; type?: unknown; title?: unknown; message?: unknown; data?: unknown };
  // Generate localized alert title/message from type + data
  function getAlertData(alert: AlertCopy): Record<string, unknown> {
    let d = alert.data;
    // Handle double-stringified data from older alerts
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = {}; } }
    return (d as Record<string, unknown>) ?? {};
  }

  export function getAlertTitle(alert: AlertCopy, tr: Translate): string {
    const d = getAlertData(alert);
    switch (alert.type) {
      case 'balance_low': return tr('alerts.msg.balance_low_title', { account: String(d.accountName ?? '?') });
      case 'credit_high': return tr('alerts.msg.credit_high_title', { account: String(d.accountName ?? '?') });
      case 'payment_due': return tr('alerts.msg.payment_due_title', { name: String(d.subscriptionName ?? '?') });
      case 'payment_overdue': return tr('alerts.msg.payment_overdue_title', { name: String(d.subscriptionName ?? '?') });
      case 'goal_completed': return tr('alerts.msg.goal_completed_title', { name: String(d.goalName ?? '?') });
      default: return String(alert.title ?? '');
    }
  }

  export function getAlertMessage(alert: AlertCopy, tr: Translate): string {
    const d = getAlertData(alert);
    switch (alert.type) {
      case 'balance_low': return tr('alerts.msg.balance_low_desc', { account: String(d.accountName ?? '?'), balance: formatCurrency(Number(d.currentBalance ?? 0)), limit: formatCurrency(Number(d.balanceLimit ?? 0)) });
      case 'credit_high': return tr('alerts.msg.credit_high_desc', { account: String(d.accountName ?? '?'), pct: Number(d.utilization ?? 0).toFixed(1) });
      case 'payment_due': return tr('alerts.msg.payment_due_desc', { name: String(d.subscriptionName ?? '?'), days: Number(d.daysRemaining ?? 0), amount: formatCurrency(Number(d.amount ?? 0)) });
      case 'payment_overdue': return tr('alerts.msg.payment_overdue_desc', { name: String(d.subscriptionName ?? '?'), amount: formatCurrency(Number(d.amount ?? 0)) });
      case 'goal_completed': return tr('alerts.msg.goal_completed_desc', { name: String(d.goalName ?? '?') });
      default: return String(alert.message ?? '');
    }
  }
