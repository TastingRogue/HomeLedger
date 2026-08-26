<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listAlerts,
    markAlertAsRead,
    markAllAlertsAsRead,
    deleteAlert,
    evaluateAlerts,
    type AlertData,
    type AlertType,
    type AlertSeverity,
  } from '$lib/api/alerts';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  // ─── State ───
  let alerts: AlertData[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let markingAll = $state(false);
  let markingIds = $state<Set<number>>(new Set());

  // Filter state
  let filterType: AlertType | 'all' = $state('all');
  let filterRead: 'all' | 'unread' | 'read' = $state('all');

  // ─── Alert Type Config ───
  interface AlertTypeConfig {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
  }

  const alertTypeConfig: Record<AlertType, AlertTypeConfig> = {
    balance_low: {
      label: $t('alerts.type_balance_low'),
      icon: '⚠️',
      color: '#e65100',
      bgColor: '#fff3e0',
    },
    credit_high: {
      label: $t('alerts.type_credit_high'),
      icon: '🔴',
      color: '#c62828',
      bgColor: '#ffebee',
    },
    payment_due: {
      label: $t('alerts.type_payment_due'),
      icon: '⏰',
      color: '#f9a825',
      bgColor: '#fffde7',
    },
    payment_overdue: {
      label: $t('alerts.type_payment_overdue'),
      icon: '❗',
      color: '#c62828',
      bgColor: '#ffebee',
    },
    goal_completed: {
      label: $t('alerts.type_goal_completed'),
      icon: '🎉',
      color: '#2e7d32',
      bgColor: '#e8f5e9',
    },
  };

  const severityConfig: Record<AlertSeverity, { label: string; className: string }> = {
    warning: { label: $t('alerts.severity_warning'), className: 'severity-warning' },
    critical: { label: $t('alerts.severity_critical'), className: 'severity-critical' },
    info: { label: $t('alerts.severity_info'), className: 'severity-info' },
  };

  // ─── Computed ───
  let filteredAlerts = $derived.by(() => {
    let result = alerts;

    if (filterType !== 'all') {
      result = result.filter((a) => a.type === filterType);
    }

    if (filterRead === 'unread') {
      result = result.filter((a) => !a.isRead);
    } else if (filterRead === 'read') {
      result = result.filter((a) => a.isRead);
    }

    return result;
  });

  let unreadCount = $derived(alerts.filter((a) => !a.isRead).length);

  // ─── Helpers ───
  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return $t('alerts.time_now');
    if (diffMins < 60) return $t('alerts.time_min', { n: diffMins });
    if (diffHours < 24) return $t('alerts.time_hours', { n: diffHours });
    if (diffDays < 7) return $t('alerts.time_days', { n: diffDays, s: diffDays > 1 ? 's' : '' });

    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  function getSeverityBorderColor(severity: AlertSeverity): string {
    if (severity === 'critical') return 'var(--accent-red)';
    if (severity === 'warning') return 'var(--accent-orange)';
    return 'var(--accent-blue)';
  }

  // Generate localized alert title/message from type + data
  function getAlertData(alert: AlertData): Record<string, any> {
    let d = alert.data;
    // Handle double-stringified data from older alerts
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = {}; } }
    return (d as Record<string, any>) ?? {};
  }

  function getAlertTitle(alert: AlertData): string {
    const d = getAlertData(alert);
    switch (alert.type) {
      case 'balance_low': return $t('alerts.msg.balance_low_title', { account: d.accountName ?? '?' });
      case 'credit_high': return $t('alerts.msg.credit_high_title', { account: d.accountName ?? '?' });
      case 'payment_due': return $t('alerts.msg.payment_due_title', { name: d.subscriptionName ?? '?' });
      case 'payment_overdue': return $t('alerts.msg.payment_overdue_title', { name: d.subscriptionName ?? '?' });
      case 'goal_completed': return $t('alerts.msg.goal_completed_title', { name: d.goalName ?? '?' });
      default: return alert.title;
    }
  }

  function getAlertMessage(alert: AlertData): string {
    const d = getAlertData(alert);
    switch (alert.type) {
      case 'balance_low': return $t('alerts.msg.balance_low_desc', { account: d.accountName ?? '?', balance: formatCurrency(d.currentBalance ?? 0), limit: formatCurrency(d.balanceLimit ?? 0) });
      case 'credit_high': return $t('alerts.msg.credit_high_desc', { account: d.accountName ?? '?', pct: (d.utilization ?? 0).toFixed(1) });
      case 'payment_due': return $t('alerts.msg.payment_due_desc', { name: d.subscriptionName ?? '?', days: d.daysRemaining ?? 0, amount: formatCurrency(d.amount ?? 0) });
      case 'payment_overdue': return $t('alerts.msg.payment_overdue_desc', { name: d.subscriptionName ?? '?', amount: formatCurrency(d.amount ?? 0) });
      case 'goal_completed': return $t('alerts.msg.goal_completed_desc', { name: d.goalName ?? '?' });
      default: return alert.message;
    }
  }

  // ─── Data Loading ───
  async function loadAlerts() {
    loading = true;
    error = null;
    try {
      alerts = await listAlerts();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('alerts.error_loading');
    } finally {
      loading = false;
    }
  }

  // ─── Actions ───
  async function handleMarkAsRead(alert: AlertData) {
    if (alert.isRead || markingIds.has(alert.id)) return;

    markingIds = new Set([...markingIds, alert.id]);
    try {
      await markAlertAsRead(alert.id);
      alerts = alerts.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a));
    } catch (e: unknown) {
      console.error('Error marking alert as read:', e);
    } finally {
      const newSet = new Set(markingIds);
      newSet.delete(alert.id);
      markingIds = newSet;
    }
  }

  async function handleMarkAllAsRead() {
    if (markingAll || unreadCount === 0) return;

    markingAll = true;
    try {
      await markAllAlertsAsRead();
      alerts = alerts.map((a) => ({ ...a, isRead: true }));
    } catch (e: unknown) {
      console.error('Error marking all as read:', e);
    } finally {
      markingAll = false;
    }
  }

  async function handleDelete(alert: AlertData) {
    try {
      await deleteAlert(alert.id);
      alerts = alerts.filter(a => a.id !== alert.id);
    } catch {}
  }

  let evaluating = $state(false);
  let evalMsg = $state('');

  async function handleEvaluate() {
    evaluating = true; evalMsg = '';
    try {
      const result = await evaluateAlerts();
      evalMsg = result.generated > 0 ? `${result.generated} ${$t('alerts.new_alerts')}` : $t('alerts.no_new_alerts');
      await loadAlerts();
      setTimeout(() => evalMsg = '', 3000);
    } catch { evalMsg = 'Error'; }
    finally { evaluating = false; }
  }

  onMount(() => {
    loadAlerts();
  });
</script>

<svelte:head>
  <title>{$t('alerts.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-left">
      <div>
        <h1>{$t('alerts.title')}</h1>
        <p class="page-subtitle">{$t('alerts.subtitle')}</p>
      </div>
      {#if unreadCount > 0}
        <span class="unread-badge">{unreadCount}</span>
      {/if}
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick={handleEvaluate} disabled={evaluating}>
        {evaluating ? '...' : `🔄 ${$t('alerts.evaluate_now')}`}
      </button>
      {#if evalMsg}<span class="eval-msg">{evalMsg}</span>{/if}
      {#if unreadCount > 0}
        <button class="btn btn-primary" onclick={handleMarkAllAsRead} disabled={markingAll}>
          {markingAll ? $t('alerts.marking') : $t('alerts.mark_all_read')}
        </button>
      {/if}
    </div>
  </header>

  <!-- Inline Filters -->
  <div class="filters">
    <select bind:value={filterType} aria-label={$t('common.filter')}>
      <option value="all">{$t('alerts.filter_type_all')}</option>
      <option value="balance_low">{$t('alerts.filter_balance_low')}</option>
      <option value="credit_high">{$t('alerts.filter_credit_high')}</option>
      <option value="payment_due">{$t('alerts.filter_payment_due')}</option>
      <option value="payment_overdue">{$t('alerts.filter_payment_overdue')}</option>
      <option value="goal_completed">{$t('alerts.filter_goal_completed')}</option>
    </select>
    <select bind:value={filterRead} aria-label={$t('common.filter')}>
      <option value="all">{$t('alerts.filter_status_all')}</option>
      <option value="unread">{$t('alerts.filter_unread')}</option>
      <option value="read">{$t('alerts.filter_read')}</option>
    </select>
  </div>

  {#if loading}
    <div class="state-msg"><p>{$t('alerts.loading')}</p></div>
  {:else if error}
    <div class="state-msg error">
      <p>{error}</p>
      <button class="btn btn-secondary" onclick={loadAlerts}>{$t('common.retry')}</button>
    </div>
  {:else if alerts.length === 0}
    <div class="state-msg">
      <p>{$t('alerts.no_alerts')}</p>
      <p class="state-hint">{$t('alerts.auto_generated')}</p>
    </div>
  {:else if filteredAlerts.length === 0}
    <div class="state-msg"><p>{$t('alerts.no_filtered')}</p></div>
  {:else}
    <div class="alerts-list" role="list" aria-label="Lista de alertas">
      {#each filteredAlerts as alert (alert.id)}
        {@const config = alertTypeConfig[alert.type]}
        {@const severity = severityConfig[alert.severity]}
        <div
          class="alert-row"
          class:unread={!alert.isRead}
          style="border-left-color: {getSeverityBorderColor(alert.severity)}"
          role="listitem"
          aria-label="{getAlertTitle(alert)} - {alert.isRead ? $t('alerts.read_label') : $t('alerts.filter_unread')}"
        >
          <div class="alert-body">
            <div class="alert-top-row">
              <span class="alert-title">{getAlertTitle(alert)}</span>
              <span class="severity-tag {severity.className}">{severity.label}</span>
            </div>
            <p class="alert-message">{getAlertMessage(alert)}</p>
            <div class="alert-footer">
              <span class="alert-time">{formatTimestamp(alert.createdAt)}</span>
              <span class="alert-type-label">{config.label}</span>
              {#if !alert.isRead}
                <button
                  class="btn-mark"
                  onclick={() => handleMarkAsRead(alert)}
                  disabled={markingIds.has(alert.id)}
                >
                  {markingIds.has(alert.id) ? '...' : $t('alerts.mark_read')}
                </button>
              {:else}
                <span class="read-label">{$t('alerts.read_label')}</span>
              {/if}
              <button class="btn-dismiss" onclick={() => handleDelete(alert)} title={$t('alerts.dismiss')}>✕</button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { width: 100%; margin: 0; }

  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 1.25rem; gap: var(--spacing-sm);
  }
  .header-left { display: flex; align-items: center; gap: var(--spacing-sm); }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }
  .unread-badge {
    font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.35rem;
    border-radius: var(--radius-full); background: var(--accent-blue); color: #fff;
  }

  /* Filters */
  .filters { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); flex-wrap: wrap; }
  .filters select { max-width: 160px; font-size: 0.78rem; }

  /* Alerts List */
  .alerts-list { display: flex; flex-direction: column; gap: 2px; }

  .alert-row {
    padding: 0.5rem 0.7rem; background: var(--bg-surface);
    border-left: 3px solid var(--border-default); border-radius: var(--radius-sm);
    transition: background 0.1s;
  }
  .alert-row:hover { background: var(--bg-hover); }
  .alert-row.unread { background: var(--bg-elevated); }

  .alert-body { display: flex; flex-direction: column; gap: 0.2rem; }
  .alert-top-row { display: flex; align-items: center; gap: 0.4rem; }
  .alert-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
  .unread .alert-title { font-weight: 700; }

  .severity-tag { font-size: 0.6rem; font-weight: 600; padding: 0.08rem 0.3rem; border-radius: var(--radius-sm); }
  .severity-tag.severity-warning { background: var(--tag-orange-bg); color: var(--accent-orange); }
  .severity-tag.severity-critical { background: var(--tag-red-bg); color: var(--accent-red); }
  .severity-tag.severity-info { background: var(--tag-green-bg); color: var(--accent-green); }

  .alert-message { font-size: 0.78rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }

  .alert-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.15rem; }
  .alert-time { font-size: 0.68rem; color: var(--text-muted); }
  .alert-type-label { font-size: 0.65rem; color: var(--text-muted); }
  .read-label { font-size: 0.65rem; color: var(--text-muted); font-style: italic; margin-left: auto; }

  .btn-mark {
    margin-left: auto; font-size: 0.68rem; font-weight: 500;
    background: var(--tag-blue-bg); color: var(--accent-blue);
    border: none; border-radius: var(--radius-sm); padding: 0.15rem 0.4rem; cursor: pointer;
  }
  .btn-mark:hover:not(:disabled) { background: rgba(82, 156, 202, 0.25); }
  .btn-mark:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-dismiss { background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; padding: 0.1rem 0.3rem; border-radius: var(--radius-sm); margin-left: 0.3rem; }
  .btn-dismiss:hover { color: var(--accent-red); background: var(--tag-red-bg); }
  .header-actions { display: flex; align-items: center; gap: 0.5rem; }
  .eval-msg { font-size: 0.72rem; color: var(--accent-green); }

  /* States */
  .state-msg { text-align: center; padding: var(--spacing-xl); color: var(--text-secondary); font-size: 0.85rem; }
  .state-msg.error { color: var(--accent-red); }
  .state-msg button { margin-top: var(--spacing-sm); }
  .state-hint { font-size: 0.78rem; margin-top: var(--spacing-xs); color: var(--text-muted); }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.35rem 0.75rem; border: none; border-radius: var(--radius-sm);
    font-size: 0.8rem; font-weight: 500; cursor: pointer;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: var(--accent-blue); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
  .btn-secondary { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); }
  .btn-secondary:hover:not(:disabled) { background: var(--bg-hover); }

  @media (max-width: 600px) {
    .filters { flex-direction: column; }
    .filters select { max-width: 100%; }
  }
</style>
