<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiPost, apiPut, apiDelete } from '$lib/api/client';
  import { uploadAttachment, downloadAttachment as apiDownloadAttachment } from '$lib/api/attachments';
  import { formatCurrency, formatDateShort, formatDaysRemaining } from '$lib/utils/format';
  import BarChart from '$lib/components/BarChart.svelte';
  import DoughnutChart from '$lib/components/DoughnutChart.svelte';
  import ComboChart from '$lib/components/ComboChart.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { t } from '$lib/i18n';
  import { userProfile } from '$lib/stores/user';

  // ─── Types ───
  interface AccountData {
    id: number;
    name: string;
    type: string;
    bank?: string;
    initialBalance: number;
    balance?: number;
    calculatedBalance?: number;
    balanceLimit?: number | null;
    creditLimit?: number | null;
    status?: string;
  }

  interface DashboardData {
    consolidatedBalance: number;
    monthlySummary: { totalIncome: number; totalExpenses: number };
    categoryBreakdown: { categoryId: number; categoryName: string; total: number; percentage: number }[];
    accountHealth: { id: number; name: string; balance: number; balanceLimit: number | null; status: string }[];
    nextSubscriptions: { id: number; name: string; amount: number; daysRemaining: number; accountId: number; accountName?: string }[];
    activeGoals: { id: number; name: string; savedAmount: number; targetAmount: number; progress: number }[];
  }

  interface Transaction {
    id: number;
    name: string;
    amount: number;
    type: string;
    date: string;
    accountId?: number;
    categoryId?: number;
    categoryName?: string;
    accountName?: string;
  }

  interface SubscriptionCalendar {
    id: number;
    name: string;
    amount: number;
    cycle?: string;
    daysRemaining: number;
    nextDate?: string;
    accountName?: string;
    categoryName?: string;
  }

  interface CategoryAnalysis {
    categoryId: number;
    categoryName: string;
    totalExpenses: number;
    total?: number;
    percentage?: number;
  }

  interface Goal {
    id: number;
    name: string;
    targetAmount: number;
    savedAmount: number;
    progress: number;
    type: string;
    status: string;
  }

  interface Category {
    id: number;
    name: string;
    type?: 'Gasto' | 'Ingreso' | 'Ambos';
  }

  interface TransferData {
    id: number;
    name: string;
    amount: number;
    date: string;
    sourceAccountId: number;
    destinationAccountId: number;
  }

  interface TrendEntry {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }

  // ─── State ───
  let loading = $state(true);
  let dashboard: DashboardData | null = $state(null);
  let accounts: AccountData[] = $state([]);
  let transactions: Transaction[] = $state([]);
  let calendar: SubscriptionCalendar[] = $state([]);
  let catAnalysis: CategoryAnalysis[] = $state([]);
  let goals: Goal[] = $state([]);
  let categories: Category[] = $state([]);
  let trends: TrendEntry[] = $state([]);
  let transfers: TransferData[] = $state([]);
  let budgets: { name: string; categories: { categoryId: number; allocated: number; spent: number; remaining: number }[]; totalAllocated: number; totalSpent: number; percentUsed: number }[] = $state([]);

  // Quick Transaction Modal
  let showQuickModal = $state(false);
  let quickType: 'Gasto' | 'Ingreso' = $state('Gasto');
  let quickName = $state('');
  let quickAmount = $state('');
  let quickAccountId = $state<number | null>(null);
  let quickCategoryId = $state<number | null>(null);
  let quickSubmitting = $state(false);
  let quickError = $state<string | null>(null);
  let quickSuccess = $state(false);

  // Edit Transaction Modal
  let showEditTxModal = $state(false);
  let editTx = $state<Transaction | null>(null);
  let editTxName = $state('');
  let editTxAmount = $state('');
  let editTxDate = $state('');
  let editTxAccountId = $state<number | null>(null);
  let editTxCategoryId = $state<number | null>(null);
  let editTxType = $state<'Gasto' | 'Ingreso'>('Gasto');
  let editTxSubmitting = $state(false);
  let editTxError = $state<string | null>(null);

  // Edit Transfer Modal
  let showEditTfModal = $state(false);
  let editTf = $state<TransferData | null>(null);
  let editTfName = $state('');
  let editTfAmount = $state('');
  let editTfDate = $state('');
  let editTfSourceId = $state<number | null>(null);
  let editTfDestId = $state<number | null>(null);
  let editTfSubmitting = $state(false);
  let editTfError = $state<string | null>(null);

  // Attachment Modal
  let showAttachModal = $state(false);
  let attachFile = $state<File | null>(null);
  let attachTxId = $state<number | null>(null);
  let attachTfId = $state<number | null>(null);
  let attachSubmitting = $state(false);
  let attachError = $state<string | null>(null);
  let attachSuccess = $state(false);

  // Attachments in edit modals
  interface Attachment { id: number; originalName: string | null; filename: string; mimeType: string; size: number; }
  let editTxAttachments = $state<Attachment[]>([]);
  let editTfAttachments = $state<Attachment[]>([]);

  // Subscription edit popup
  let showSubEdit = $state(false);
  let editSubId = $state<number | null>(null);
  let editSubName = $state('');
  let editSubAmount = $state('');
  let editSubCycle = $state('Mensual');
  let editSubAccountId = $state<number | null>(null);
  let editSubCategoryId = $state<number | null>(null);
  let editSubDate = $state('');
  let editSubAutoCharge = $state(false);
  let editSubSubmitting = $state(false);
  let editSubError = $state<string | null>(null);
  let subDeleting = $state(false);

  // Period filter — independent for each card
  let chartPeriod: 'today' | 'week' | 'month' = $state('month');
  let donutPeriod: 'today' | 'week' | 'month' = $state('month');
  const periodOptions = [
    { value: 'today', label: $t('dashboard.period_today') },
    { value: 'week', label: $t('dashboard.period_week') },
    { value: 'month', label: $t('dashboard.period_month') },
  ];

  function getPeriodRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;
    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday as start
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }
    return { start, end };
  }

  function isInPeriod(dateStr: string, period: 'today' | 'week' | 'month'): boolean {
    const { start, end } = getPeriodRange(period);
    const d = new Date(dateStr);
    return d >= start && d <= end;
  }

  // ─── Derived ───
  let creditAccounts = $derived(accounts.filter(a => a.type === 'Crédito'));
  let totalBalance = $derived(
    accounts.filter(a => a.type !== 'Crédito').reduce((sum, a) => sum + getAccountBalance(a), 0)
    - accounts.filter(a => a.type === 'Crédito').reduce((sum, a) => sum + Math.abs(getAccountBalance(a)), 0)
  );
  let totalIncome = $derived.by(() => dashboard?.monthlySummary?.totalIncome ?? 0);
  let totalExpenses = $derived.by(() => dashboard?.monthlySummary?.totalExpenses ?? 0);
  let savings = $derived(totalIncome - totalExpenses);
  let activeGoals = $derived(goals.filter(g => g.status === 'Activa'));

  // Budget remaining: sum of all budgets (allocated - spent), fallback to income - expenses
  let budgetTotalAllocated = $derived(budgets.reduce((s, b) => s + (b.totalAllocated ?? 0), 0));
  let budgetTotalSpent = $derived(budgets.reduce((s, b) => s + (b.totalSpent ?? 0), 0));
  let budgetRemaining = $derived(budgets.length > 0 ? budgetTotalAllocated - budgetTotalSpent : savings);
  let budgetPct = $derived(budgets.length > 0
    ? (budgetTotalAllocated > 0 ? Math.round(((budgetTotalAllocated - budgetTotalSpent) / budgetTotalAllocated) * 100) : 0)
    : (totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0)
  );

  // Previous month comparison from trends data
  let prevMonthIncome = $derived.by(() => {
    if (trends.length < 2) return 0;
    return trends[trends.length - 2]?.income ?? 0;
  });
  let prevMonthExpenses = $derived.by(() => {
    if (trends.length < 2) return 0;
    return trends[trends.length - 2]?.expenses ?? 0;
  });
  let incomeChange = $derived.by(() => {
    if (prevMonthIncome === 0) return totalIncome > 0 ? 100 : 0;
    return Math.round(((totalIncome - prevMonthIncome) / prevMonthIncome) * 100);
  });
  let expenseChange = $derived.by(() => {
    if (prevMonthExpenses === 0) return totalExpenses > 0 ? 100 : 0;
    return Math.round(((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 100);
  });

  let filteredCategories = $derived(
    categories.filter(c => {
      const catType = c.type ?? 'Ambos';
      if (catType === 'Ambos') return true;
      return catType === quickType;
    })
  );

  // Category colors for donut
  const catColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  // Generate chart labels based on period
  let chartLabels = $derived.by(() => {
    const now = new Date();
    const { start } = getPeriodRange(chartPeriod);
    const days: string[] = [];
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    if (chartPeriod === 'today') {
      // Show hours
      for (let h = 0; h <= now.getHours(); h++) {
        days.push(h % 4 === 0 ? `${h}:00` : '');
      }
    } else if (chartPeriod === 'week') {
      const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      for (let i = 0; i <= day; i++) {
        days.push(dayNames[i] ?? '');
      }
    } else {
      for (let i = 1; i <= now.getDate(); i++) {
        if (i % 5 === 1 || i === now.getDate()) days.push(`${i} ${months[now.getMonth()]}`);
        else days.push('');
      }
    }
    return days;
  });

  // Chart data filtered by period
  let chartIncomeData = $derived.by(() => {
    const now = new Date();
    if (chartPeriod === 'today') {
      const hourly: number[] = new Array(now.getHours() + 1).fill(0);
      for (const tx of transactions) {
        if (tx.type === 'Ingreso' && isInPeriod(tx.date, 'today')) {
          const h = new Date(tx.date).getHours();
          if (h >= 0 && h < hourly.length) hourly[h] += tx.amount;
        }
      }
      return hourly;
    } else if (chartPeriod === 'week') {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const daily: number[] = new Array(day + 1).fill(0);
      const { start } = getPeriodRange('week');
      for (const tx of transactions) {
        if (tx.type === 'Ingreso' && isInPeriod(tx.date, 'week')) {
          const d = new Date(tx.date);
          const idx = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (idx >= 0 && idx < daily.length) daily[idx] += tx.amount;
        }
      }
      return daily;
    } else {
      const daily: number[] = new Array(now.getDate()).fill(0);
      for (const tx of transactions) {
        if (tx.type === 'Ingreso') {
          const d = new Date(tx.date);
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            const idx = d.getDate() - 1;
            if (idx >= 0 && idx < daily.length) daily[idx] += tx.amount;
          }
        }
      }
      return daily;
    }
  });

  let chartExpenseData = $derived.by(() => {
    const now = new Date();
    if (chartPeriod === 'today') {
      const hourly: number[] = new Array(now.getHours() + 1).fill(0);
      for (const tx of transactions) {
        if (tx.type === 'Gasto' && isInPeriod(tx.date, 'today')) {
          const h = new Date(tx.date).getHours();
          if (h >= 0 && h < hourly.length) hourly[h] += Math.abs(tx.amount);
        }
      }
      return hourly;
    } else if (chartPeriod === 'week') {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const daily: number[] = new Array(day + 1).fill(0);
      const { start } = getPeriodRange('week');
      for (const tx of transactions) {
        if (tx.type === 'Gasto' && isInPeriod(tx.date, 'week')) {
          const d = new Date(tx.date);
          const idx = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (idx >= 0 && idx < daily.length) daily[idx] += Math.abs(tx.amount);
        }
      }
      return daily;
    } else {
      const daily: number[] = new Array(now.getDate()).fill(0);
      for (const tx of transactions) {
        if (tx.type === 'Gasto') {
          const d = new Date(tx.date);
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            const idx = d.getDate() - 1;
            if (idx >= 0 && idx < daily.length) daily[idx] += Math.abs(tx.amount);
          }
        }
      }
      return daily;
    }
  });

  // Filtered totals for chart period
  let periodIncome = $derived(chartIncomeData.reduce((s, v) => s + v, 0));
  let periodExpenses = $derived(chartExpenseData.reduce((s, v) => s + v, 0));

  // Category data filtered by donut period
  let periodCatData = $derived.by(() => {
    const filtered = transactions.filter(tx => tx.type === 'Gasto' && isInPeriod(tx.date, donutPeriod));
    const catMap = new Map<string, number>();
    for (const tx of filtered) {
      const name = tx.categoryName ?? 'Otros';
      catMap.set(name, (catMap.get(name) ?? 0) + Math.abs(tx.amount));
    }
    const total = Array.from(catMap.values()).reduce((s, v) => s + v, 0);
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount]) => ({ categoryName: name, total: amount, percentage: total > 0 ? (amount / total) * 100 : 0 }));
  });

  // ─── Helpers ───
  function getAccountBalance(account: AccountData): number {
    return account.calculatedBalance ?? account.balance ?? account.initialBalance;
  }

  function getTypeIcon(type: string): string {
    const map: Record<string, string> = { 'Débito': '🏦', 'Crédito': '💳', 'Inversión': '📈', 'Vales': '🎫', 'Efectivo': '💵' };
    return map[type] ?? '🏦';
  }

  function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return $t('dashboard.greeting.morning');
    if (h < 18) return $t('dashboard.greeting.afternoon');
    return $t('dashboard.greeting.evening');
  }

  function getDateRange(): string {
    const now = new Date();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `01 – ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // ─── Quick Transaction Modal ───
  function openQuickModal(type: 'Gasto' | 'Ingreso') {
    quickType = type;
    quickName = '';
    quickAmount = '';
    quickAccountId = accounts.length > 0 ? accounts[0].id : null;
    const matching = categories.filter(c => (c.type ?? 'Ambos') === 'Ambos' || c.type === type);
    quickCategoryId = matching.length > 0 ? matching[0].id : null;
    quickError = null;
    quickSuccess = false;
    showQuickModal = true;
  }

  function closeQuickModal() { showQuickModal = false; }

  async function submitQuickTransaction() {
    if (!quickName.trim() || !quickAmount || !quickAccountId || !quickCategoryId) {
      quickError = $t('dashboard.fill_all_fields');
      return;
    }
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) { quickError = $t('dashboard.invalid_amount'); return; }
    quickSubmitting = true;
    quickError = null;
    try {
      await apiPost('/transactions', { name: quickName.trim(), amount, accountId: quickAccountId, categoryId: quickCategoryId, type: quickType, date: new Date().toISOString() });
      quickSuccess = true;
      setTimeout(() => { closeQuickModal(); loadAll(); }, 600);
    } catch (e: unknown) { quickError = e instanceof Error ? e.message : 'Error'; }
    finally { quickSubmitting = false; }
  }

  // ─── Edit Transaction from Dashboard ───
  function openEditTx(tx: Transaction) {
    editTx = tx;
    editTxName = tx.name;
    editTxAmount = String(tx.amount);
    editTxDate = tx.date.slice(0, 16);
    editTxAccountId = tx.accountId ?? null;
    editTxCategoryId = tx.categoryId ?? null;
    editTxType = (tx.type as 'Gasto' | 'Ingreso');
    editTxError = null;
    editTxAttachments = [];
    showEditTxModal = true;
    // Load attachments
    apiGet<Attachment[]>('/attachments', { transactionId: tx.id }).then(res => {
      editTxAttachments = Array.isArray(res) ? res : (res as any).data ?? (res as any) ?? [];
    }).catch(() => {});
  }

  function closeEditTxModal() { showEditTxModal = false; editTx = null; }

  async function submitEditTx() {
    if (!editTx || !editTxName.trim() || !editTxAmount || !editTxAccountId || !editTxCategoryId) {
      editTxError = $t('dashboard.fill_all_fields'); return;
    }
    editTxSubmitting = true; editTxError = null;
    try {
      await apiPut(`/transactions/${editTx.id}`, {
        name: editTxName.trim(), amount: parseFloat(editTxAmount), type: editTxType,
        accountId: editTxAccountId, categoryId: editTxCategoryId, date: new Date(editTxDate).toISOString(),
      });
      closeEditTxModal(); loadAll();
    } catch (e: unknown) { editTxError = e instanceof Error ? e.message : 'Error'; }
    finally { editTxSubmitting = false; }
  }

  async function deleteEditTx() {
    if (!editTx) return;
    editTxSubmitting = true;
    try { await apiDelete(`/transactions/${editTx.id}`); closeEditTxModal(); loadAll(); }
    catch (e: unknown) { editTxError = e instanceof Error ? e.message : 'Error'; }
    finally { editTxSubmitting = false; }
  }

  // ─── Edit Transfer from Dashboard ───
  function openEditTf(tf: TransferData) {
    editTf = tf;
    editTfName = tf.name;
    editTfAmount = String(tf.amount);
    editTfDate = tf.date.slice(0, 16);
    editTfSourceId = tf.sourceAccountId;
    editTfDestId = tf.destinationAccountId;
    editTfError = null;
    editTfAttachments = [];
    showEditTfModal = true;
    // Load attachments
    apiGet<Attachment[]>('/attachments', { transferId: tf.id }).then(res => {
      editTfAttachments = Array.isArray(res) ? res : (res as any).data ?? (res as any) ?? [];
    }).catch(() => {});
  }

  function closeEditTfModal() { showEditTfModal = false; editTf = null; }

  async function submitEditTf() {
    if (!editTf || !editTfName.trim() || !editTfAmount || !editTfSourceId || !editTfDestId) {
      editTfError = $t('dashboard.fill_all_fields'); return;
    }
    if (editTfSourceId === editTfDestId) { editTfError = $t('dashboard.accounts_must_differ'); return; }
    editTfSubmitting = true; editTfError = null;
    try {
      await apiPut(`/transfers/${editTf.id}`, {
        name: editTfName.trim(), amount: parseFloat(editTfAmount),
        sourceAccountId: editTfSourceId, destinationAccountId: editTfDestId, date: new Date(editTfDate).toISOString(),
      });
      closeEditTfModal(); loadAll();
    } catch (e: unknown) { editTfError = e instanceof Error ? e.message : 'Error'; }
    finally { editTfSubmitting = false; }
  }

  async function deleteEditTf() {
    if (!editTf) return;
    editTfSubmitting = true;
    try { await apiDelete(`/transfers/${editTf.id}`); closeEditTfModal(); loadAll(); }
    catch (e: unknown) { editTfError = e instanceof Error ? e.message : 'Error'; }
    finally { editTfSubmitting = false; }
  }

  // ─── Attachment Modal ───
  function openAttachModal() {
    attachFile = null;
    attachTxId = transactions.length > 0 ? transactions[0].id : null;
    attachTfId = null;
    attachError = null;
    attachSuccess = false;
    showAttachModal = true;
  }

  function closeAttachModal() { showAttachModal = false; }

  function handleAttachFile(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) attachFile = input.files[0];
  }

  async function submitAttachment() {
    if (!attachFile) { attachError = $t('dashboard.select_file'); return; }
    if (!attachTxId && !attachTfId) { attachError = $t('dashboard.select_tx_or_tf'); return; }
    attachSubmitting = true; attachError = null;
    try {
      await uploadAttachment(attachFile, {
        transactionId: attachTxId ?? undefined,
        transferId: attachTfId ?? undefined,
      });
      attachSuccess = true;
      setTimeout(() => closeAttachModal(), 1500);
    } catch (e: unknown) { attachError = e instanceof Error ? e.message : 'Error al subir'; }
    finally { attachSubmitting = false; }
  }

  async function downloadAttachment(id: number, filename: string) {
    try {
      await apiDownloadAttachment(id, filename);
    } catch (e: unknown) {
      attachError = e instanceof Error ? e.message : 'Error al descargar';
    }
  }

  // ─── Subscription Edit Popup ───
  async function openSubDetail(sub: SubscriptionCalendar) {
    editSubId = sub.id;
    editSubName = sub.name;
    editSubAmount = String(sub.amount);
    editSubCycle = sub.cycle ?? 'Mensual';
    editSubError = null;
    editSubSubmitting = false;
    subDeleting = false;

    // Load full subscription data to get accountId, categoryId, startDate
    try {
      const full = await apiGet<any>(`/subscriptions`);
      const found = (Array.isArray(full) ? full : full?.data ?? []).find((s: any) => s.id === sub.id);
      if (found) {
        editSubAccountId = found.accountId;
        editSubCategoryId = found.categoryId;
        editSubDate = found.startDate ?? found.nextPaymentDate ?? '';
        editSubAutoCharge = found.autoCharge ?? false;
      }
    } catch { }

    showSubEdit = true;
  }

  function closeSubEdit() { showSubEdit = false; editSubId = null; }

  async function submitSubEdit() {
    if (!editSubId || !editSubName.trim() || !editSubAmount || !editSubAccountId || !editSubCategoryId) {
      editSubError = $t('dashboard.fill_all_fields'); return;
    }
    editSubSubmitting = true; editSubError = null;
    try {
      await apiPut(`/subscriptions/${editSubId}`, {
        name: editSubName.trim(),
        amount: parseFloat(editSubAmount),
        cycle: editSubCycle,
        accountId: editSubAccountId,
        categoryId: editSubCategoryId,
        startDate: editSubDate,
        autoCharge: editSubAutoCharge,
      });
      closeSubEdit(); loadAll();
    } catch (e: unknown) { editSubError = e instanceof Error ? e.message : 'Error'; }
    finally { editSubSubmitting = false; }
  }

  async function deleteSubFromDashboard() {
    if (!editSubId) return;
    subDeleting = true;
    try { await apiDelete(`/subscriptions/${editSubId}`); closeSubEdit(); loadAll(); }
    catch { }
    finally { subDeleting = false; }
  }

  // ─── Data Loading ───
  async function loadAll() {
    try {
      const [dashRes, accRes, txRes, calRes, catRes, goalRes, catsRes, trendsRes, transfersRes, budgetsRes] = await Promise.allSettled([
        apiGet<DashboardData>('/reports/dashboard'),
        apiGet<AccountData[]>('/accounts'),
        apiGet<{ items: Transaction[] }>('/transactions', { pageSize: 100, page: 1 }),
        apiGet<SubscriptionCalendar[]>('/subscriptions/calendar'),
        apiGet<CategoryAnalysis[]>('/categories/analysis'),
        apiGet<{ data: Goal[] }>('/goals'),
        apiGet<Category[]>('/categories'),
        apiGet<{ entries: TrendEntry[] }>('/reports/trends', { months: 2 }),
        apiGet<TransferData[]>('/transfers'),
        apiGet<any[]>('/budgets'),
      ]);
      if (dashRes.status === 'fulfilled') dashboard = dashRes.value;
      if (accRes.status === 'fulfilled') accounts = accRes.value;
      if (txRes.status === 'fulfilled') transactions = (txRes.value as any).items ?? txRes.value as any;
      if (calRes.status === 'fulfilled') calendar = Array.isArray(calRes.value) ? calRes.value : (calRes.value as any).items ?? [];
      if (catRes.status === 'fulfilled') catAnalysis = Array.isArray(catRes.value) ? catRes.value : (catRes.value as any).items ?? [];
      if (goalRes.status === 'fulfilled') { const raw = goalRes.value; goals = Array.isArray(raw) ? raw : (raw as any).data ?? []; }
      if (catsRes.status === 'fulfilled') { const raw = catsRes.value; categories = Array.isArray(raw) ? raw : (raw as any).data ?? []; }
      if (trendsRes.status === 'fulfilled') { const raw = trendsRes.value as any; trends = raw?.entries ?? (Array.isArray(raw) ? raw : []); }
      if (transfersRes.status === 'fulfilled') { const raw = transfersRes.value; transfers = Array.isArray(raw) ? raw : (raw as any).data ?? (raw as any).items ?? []; }
      if (budgetsRes.status === 'fulfilled') { const raw = budgetsRes.value; budgets = Array.isArray(raw) ? raw : (raw as any).data ?? []; }
    } catch {} finally { loading = false; }
  }

  onMount(() => { loadAll(); });
</script>

<svelte:head><title>{$t('nav.dashboard')} - HomeLedger</title></svelte:head>

{#if loading}
  <div class="loading"><div class="spinner"></div><p>{$t('common.loading')}</p></div>
{:else}
<div class="panel">
  <!-- HEADER -->
  <header class="panel-header">
    <div class="header-left">
      <h1 class="greeting">{getGreeting()}, {$userProfile?.name ?? $t('dashboard.user')}! 👋</h1>
      <p class="greeting-sub">{$t('dashboard.subtitle')}</p>
    </div>
    <div class="header-right">
      <span class="date-range">{getDateRange()}</span>
      <button class="header-btn">⚙️ {$t('dashboard.customize')}</button>
      <div class="theme-toggle">
        <span class="theme-icon active">🌙</span>
        <span class="theme-icon">☀️</span>
      </div>
    </div>
  </header>

  <!-- SUMMARY CARDS -->
  <section class="summary-row">
    <div class="summary-card" title={$t('dashboard.net_worth_tooltip')}>
      <div class="sc-content">
        <span class="sc-label">{$t('dashboard.net_worth')}</span>
        <span class="sc-value">{formatCurrency(totalBalance)}</span>
        <span class="sc-meta sc-positive">↑ {formatCurrency(Math.abs(savings))} ({totalBalance > 0 ? ((savings / totalBalance) * 100).toFixed(2) : '0'}%) {$t('dashboard.this_month')}</span>
      </div>
      <span class="sc-icon blue"><Icon name="bar-chart" size={20} /></span>
    </div>
    <div class="summary-card" title={$t('dashboard.available_tooltip')}>
      <div class="sc-content">
        <span class="sc-label">{$t('dashboard.available')}</span>
        <span class="sc-value">{formatCurrency(accounts.filter(a => a.type !== 'Crédito').reduce((s, a) => s + getAccountBalance(a), 0))}</span>
        <span class="sc-meta">{$t('dashboard.checking_savings')}</span>
      </div>
      <span class="sc-icon teal"><Icon name="wallet" size={20} /></span>
    </div>
    <div class="summary-card" title={$t('dashboard.income_tooltip')}>
      <div class="sc-content">
        <span class="sc-label">{$t('dashboard.income_month')}</span>
        <span class="sc-value sc-green">{formatCurrency(totalIncome)}</span>
        <span class="sc-meta {incomeChange >= 0 ? 'sc-positive' : 'sc-negative'}">{incomeChange >= 0 ? '↑' : '↓'} {Math.abs(incomeChange)}% {$t('dashboard.vs_prev_month')}</span>
      </div>
      <span class="sc-icon green"><Icon name="trending-up" size={20} /></span>
    </div>
    <div class="summary-card" title={$t('dashboard.expenses_tooltip')}>
      <div class="sc-content">
        <span class="sc-label">{$t('dashboard.expenses_month')}</span>
        <span class="sc-value sc-red">{formatCurrency(totalExpenses)}</span>
        <span class="sc-meta {expenseChange <= 0 ? 'sc-positive' : 'sc-negative'}">{expenseChange >= 0 ? '↑' : '↓'} {Math.abs(expenseChange)}% {$t('dashboard.vs_prev_month')}</span>
      </div>
      <span class="sc-icon red"><Icon name="trending-down" size={20} /></span>
    </div>
    <div class="summary-card" title={$t('dashboard.budget_tooltip')}>
      <div class="sc-content">
        <span class="sc-label">{$t('dashboard.budget_remaining')}</span>
        <span class="sc-value">{formatCurrency(Math.max(0, budgetRemaining))}</span>
        <span class="sc-meta">{budgetPct}% {$t('dashboard.of_budget')}</span>
      </div>
      <div class="pct-ring-circle">
        <svg viewBox="0 0 36 36">
          <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="ring-fill" stroke-dasharray="{Math.max(0, Math.min(budgetPct, 100))}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span class="ring-text">{budgetPct}%</span>
      </div>
    </div>
  </section>

  <!-- MAIN 3-COLUMN GRID -->
  <div class="main-grid">

    <!-- LEFT SIDEBAR -->
    <div class="col-left">
      <!-- Acciones Rápidas -->
      <div class="card card-compact">
        <h3 class="card-title"><Icon name="zap" size={14} /> {$t('dashboard.quick_actions')}</h3>
        <div class="quick-actions">
          <button class="qa-btn qa-expense" onclick={() => openQuickModal('Gasto')} title={$t('dashboard.register_expense')}><Icon name="minus-circle" size={14} /> {$t('dashboard.add_expense')}</button>
          <button class="qa-btn qa-income" onclick={() => openQuickModal('Ingreso')} title={$t('dashboard.register_income')}><Icon name="plus-circle" size={14} /> {$t('dashboard.add_income')}</button>
          <a href="/transferencias" class="qa-btn qa-transfer" title={$t('dashboard.move_money')}><Icon name="arrow-left-right" size={14} /> {$t('dashboard.transfer')}</a>
          <a href="/metas" class="qa-btn qa-goal" title={$t('dashboard.create_goal')}><Icon name="target" size={14} /> {$t('dashboard.add_goal')}</a>
          <button class="qa-btn" onclick={openAttachModal} title={$t('dashboard.upload_receipt')}><Icon name="paperclip" size={14} /> {$t('dashboard.attach_receipt')}</button>
        </div>
      </div>

      <!-- Próximos pagos -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><Icon name="calendar" size={14} /> {$t('dashboard.upcoming_payments')}</h3>
          <a href="/suscripciones" class="card-link">{$t('dashboard.view_calendar')}</a>
        </div>
        <div class="payments-list">
          {#each calendar.slice(0, 4) as sub (sub.id)}
            <button class="payment-item" type="button" onclick={() => openSubDetail(sub)} title={$t('dashboard.view_details')}>
              <span class="pi-icon"><Icon name="repeat" size={12} /></span>
              <span class="pi-name">{sub.name}</span>
              {#if sub.categoryName}<span class="pi-cat">{sub.categoryName}</span>{/if}
              <span class="days-badge" class:days-urgent={sub.daysRemaining <= 3}>{sub.daysRemaining} días</span>
              <span class="pi-amount">{formatCurrency(sub.amount)}</span>
            </button>
          {:else}
            <p class="empty-text">{$t('dashboard.no_upcoming')}</p>
          {/each}
        </div>
        <a href="/suscripciones" class="card-link-sm">{$t('dashboard.view_all')}</a>
      </div>

      <!-- Alertas importantes -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><Icon name="alert-triangle" size={14} /> {$t('dashboard.important_alerts')}</h3>
          <a href="/alertas" class="card-link">{$t('dashboard.view_all')}</a>
        </div>
        <div class="alerts-list">
          {#each (dashboard?.accountHealth ?? []).filter(a => a.balanceLimit && a.balance < a.balanceLimit).slice(0, 3) as alert}
            <div class="alert-item">
              <span class="alert-icon"><Icon name="alert-triangle" size={14} /></span>
              <div class="alert-text">
                <span class="alert-title">{alert.name}</span>
                <span class="alert-desc">{$t('dashboard.balance_low')}</span>
              </div>
              <span class="alert-arrow">→</span>
            </div>
          {:else}
            <p class="empty-text">{$t('dashboard.no_alerts')}</p>
          {/each}
        </div>
      </div>
    </div>

    <!-- CENTER + RIGHT AREA -->
    <div class="col-main">
      <!-- Top row: Chart + Donut side by side -->
      <div class="chart-row">
        <!-- Gastos vs Ingresos Chart -->
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="bar-chart" size={14} /> {$t('dashboard.expenses_vs_income')}</h3>
            <Dropdown bind:value={chartPeriod} options={periodOptions} />
          </div>
          <div class="chart-totals">
            <span class="chart-total green">{formatCurrency(periodIncome)}</span>
            <span class="chart-total red">{formatCurrency(periodExpenses)}</span>
          </div>
          <div class="chart-legend-inline">
            <span class="legend-item"><span class="legend-dot green"></span>{$t('dashboard.income')}</span>
            <span class="legend-item"><span class="legend-dot red"></span>{$t('dashboard.expenses')}</span>
          </div>
          <ComboChart
            labels={chartLabels}
            barDataset={{ label: 'Ingresos', data: chartIncomeData, backgroundColor: 'rgba(34, 197, 94, 0.7)' }}
            lineDataset={{ label: 'Gastos', data: chartExpenseData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
            height={200}
          />
        </div>

        <!-- Gastos por categoría donut -->
        <div class="card donut-card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="pie-chart" size={14} /> {$t('dashboard.expenses_by_category')}</h3>
            <Dropdown bind:value={donutPeriod} options={periodOptions} />
          </div>
          {#if periodCatData.length > 0}
            <div class="donut-layout">
              <div class="donut-chart-area">
                <DoughnutChart
                  labels={periodCatData.map(c => c.categoryName)}
                  data={periodCatData.map(c => c.total)}
                  colors={catColors.slice(0, periodCatData.length)}
                  height={160}
                  centerText={formatCurrency(periodCatData.reduce((s, c) => s + c.total, 0))}
                />
              </div>
              <div class="cat-breakdown">
                {#each periodCatData as cat, i}
                  <div class="cat-row">
                    <span class="cat-dot" style="background: {catColors[i % catColors.length]}"></span>
                    <span class="cat-name">{cat.categoryName}</span>
                    <span class="cat-pct">{cat.percentage.toFixed(1)}%</span>
                    <span class="cat-amount">{formatCurrency(cat.total)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="empty-text">{$t('dashboard.no_cat_data')}</p>
          {/if}
          <a href="/categorias" class="card-link-bottom">{$t('dashboard.all_categories_link')}</a>
        </div>
      </div>

      <!-- Cuentas -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><Icon name="building" size={14} /> {$t('dashboard.accounts')}</h3>
          <a href="/cuentas" class="card-link">{$t('dashboard.view_all')}</a>
        </div>
        <div class="accounts-scroll">
          {#each accounts.slice(0, 5) as account (account.id)}
            <div class="account-mini">
              <div class="am-top">
                <span class="am-name">{account.name}</span>
                <div class="am-badges">
                  <span class="am-badge {account.type === 'Crédito' ? 'badge-red' : account.type === 'Inversión' ? 'badge-blue' : account.type === 'Efectivo' ? 'badge-purple' : 'badge-green'}">{account.type}</span>
                </div>
              </div>
              {#if account.bank}<span class="am-bank">{account.bank}</span>{/if}
              <span class="am-balance" class:negative={getAccountBalance(account) < 0}>
                {getAccountBalance(account) < 0 ? '-' : ''}{formatCurrency(Math.abs(getAccountBalance(account)))}
              </span>
              {#if account.type === 'Crédito' && account.creditLimit}
                <div class="am-credit-info">
                  <span class="am-meta">Límite: {formatCurrency(account.creditLimit)}</span>
                  <div class="am-util-bar">
                    <div class="am-util-fill" style="width: {Math.min((Math.abs(getAccountBalance(account)) / account.creditLimit) * 100, 100)}%; background: {(Math.abs(getAccountBalance(account)) / account.creditLimit) * 100 > 70 ? 'var(--accent-red)' : (Math.abs(getAccountBalance(account)) / account.creditLimit) * 100 > 30 ? 'var(--accent-orange)' : 'var(--accent-green)'}"></div>
                  </div>
                  <span class="am-util-pct">{((Math.abs(getAccountBalance(account)) / account.creditLimit) * 100).toFixed(0)}%</span>
                </div>
              {:else}
                <span class="am-meta">{$t('dashboard.current_balance')}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Bottom row: Transacciones | Presupuestos | Metas -->
      <div class="bottom-row">
        <!-- Últimas transacciones -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="credit-card" size={14} /> {$t('dashboard.recent_transactions')}</h3>
            <a href="/transacciones" class="card-link">{$t('dashboard.view_all')}</a>
          </div>
          <div class="tx-list">
            {#each transactions.slice(0, 4) as tx (tx.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="tx-item clickable" onclick={() => openEditTx(tx)} title={$t('dashboard.click_edit')}>
                <div class="tx-left">
                  <span class="tx-name">{tx.name}</span>
                  <span class="tx-cat">{tx.categoryName ?? '—'}</span>
                </div>
                <div class="tx-right">
                  <span class="tx-amount" class:tx-income={tx.type === 'Ingreso'} class:tx-expense={tx.type === 'Gasto'}>
                    {tx.type === 'Gasto' ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                  <span class="tx-date">{formatDateShort(tx.date)}</span>
                </div>
              </div>
            {:else}
              <p class="empty-text">{$t('dashboard.no_transactions')}</p>
            {/each}
          </div>
        </div>

        <!-- Presupuestos -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="clipboard" size={14} /> {$t('dashboard.budgets')}</h3>
            <a href="/presupuestos" class="card-link">{$t('dashboard.view_all_budgets')}</a>
          </div>
          <div class="budget-list">
            {#if budgets.length > 0}
              {@const activeBudget = budgets[0]}
              {#each (activeBudget.categories ?? []).slice(0, 4) as bc}
                {@const catName = categories.find(c => c.id === bc.categoryId)?.name ?? '—'}
                {@const pct = bc.allocated > 0 ? Math.min((bc.spent / bc.allocated) * 100, 100) : 0}
                <div class="budget-item">
                  <div class="bi-top">
                    <span class="bi-name">{catName}</span>
                    <span class="bi-values">{formatCurrency(bc.spent)} / {formatCurrency(bc.allocated)}</span>
                  </div>
                  <div class="bi-bar">
                    <div class="bi-bar-fill" style="width: {pct}%; background: {pct > 90 ? 'var(--accent-red)' : pct > 70 ? 'var(--accent-orange)' : 'var(--accent-green)'}"></div>
                  </div>
                  <span class="bi-pct">{pct.toFixed(0)}%</span>
                </div>
              {:else}
                <p class="empty-text">{$t('dashboard.no_budgets')}</p>
              {/each}
            {:else}
              <p class="empty-text">{$t('dashboard.no_budgets')}</p>
            {/if}
          </div>
        </div>

        <!-- Metas -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="target" size={14} /> {$t('dashboard.goals')}</h3>
            <a href="/metas" class="card-link">{$t('dashboard.view_all_goals')}</a>
          </div>
          <div class="goals-list">
            {#each activeGoals.slice(0, 3) as goal (goal.id)}
              <div class="goal-item">
                <div class="gi-top">
                  <span class="gi-name">{goal.name}</span>
                  <span class="gi-pct">{goal.progress.toFixed(0)}%</span>
                </div>
                <div class="gi-bar">
                  <div class="gi-bar-fill" style="width: {goal.progress}%"></div>
                </div>
                <div class="gi-meta">
                  <span>{$t('dashboard.saved')}: {formatCurrency(goal.savedAmount)}</span>
                  <span>{$t('dashboard.remaining')}: {formatCurrency(goal.targetAmount - goal.savedAmount)}</span>
                </div>
              </div>
            {:else}
              <p class="empty-text">{$t('dashboard.no_goals')}</p>
            {/each}
          </div>
        </div>

        <!-- Transferencias recientes -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><Icon name="arrow-left-right" size={14} /> {$t('dashboard.transfers')}</h3>
            <a href="/transferencias" class="card-link">{$t('dashboard.view_all_transfers')}</a>
          </div>
          <div class="transfers-list">
            {#each transfers.slice(0, 4) as tr (tr.id)}
              {@const fromAcc = accounts.find(a => a.id === tr.sourceAccountId)}
              {@const toAcc = accounts.find(a => a.id === tr.destinationAccountId)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="tf-item clickable" onclick={() => openEditTf(tr)} title={$t('dashboard.click_edit')}>
                <div class="tf-left">
                  <span class="tf-name">{tr.name}</span>
                  <span class="tf-accounts">{fromAcc?.name ?? '?'} → {toAcc?.name ?? '?'}</span>
                </div>
                <div class="tf-right">
                  <span class="tf-amount">{formatCurrency(tr.amount)}</span>
                  <span class="tf-date">{formatDateShort(tr.date)}</span>
                </div>
              </div>
            {:else}
              <p class="empty-text">{$t('dashboard.no_transfers')}</p>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
{/if}


<!-- QUICK TRANSACTION MODAL -->
{#if showQuickModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeQuickModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{quickType === 'Gasto' ? $t('dashboard.quick_add_expense') : $t('dashboard.quick_add_income')}</h3>
        <button class="modal-close" onclick={closeQuickModal}>&times;</button>
      </div>
      {#if quickSuccess}
        <div class="modal-success"><span class="success-check">✓</span> {$t('dashboard.registered_success')}</div>
      {:else}
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitQuickTransaction(); }}>
          <div class="form-field">
            <label for="qk-name">{quickType === 'Gasto' ? $t('dashboard.description') : $t('dashboard.source')}</label>
            <!-- svelte-ignore a11y_autofocus -->
            <input id="qk-name" type="text" placeholder={quickType === 'Gasto' ? $t('dashboard.expense_placeholder') : $t('dashboard.income_placeholder')} bind:value={quickName} required autofocus />
          </div>
          <div class="form-field">
            <label for="qk-amount">{$t('common.amount')}</label>
            <input id="qk-amount" type="number" step="0.01" min="0.01" placeholder="0.00" bind:value={quickAmount} required />
          </div>
          <div class="form-field">
            <label for="qk-account">{$t('common.account')}</label>
            <select id="qk-account" bind:value={quickAccountId}>{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}</select>
          </div>
          <div class="form-field">
            <label for="qk-category">{$t('common.category')}</label>
            <select id="qk-category" bind:value={quickCategoryId}>{#each filteredCategories as c}<option value={c.id}>{c.name}</option>{/each}</select>
          </div>
          {#if quickError}<p class="modal-error">{quickError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={closeQuickModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit" class:btn-red={quickType === 'Gasto'} class:btn-green={quickType === 'Ingreso'} disabled={quickSubmitting}>
              {quickSubmitting ? '...' : $t('dashboard.register_type', { type: quickType })}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- EDIT TRANSACTION MODAL -->
{#if showEditTxModal && editTx}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeEditTxModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('dashboard.edit_transaction')}</h3>
        <button class="modal-close" onclick={closeEditTxModal}>&times;</button>
      </div>
      <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitEditTx(); }}>
        <div class="form-field">
          <label for="etx-name">{$t('common.name')}</label>
          <input id="etx-name" type="text" bind:value={editTxName} required />
        </div>
        <div class="form-field">
          <label for="etx-amount">{$t('common.amount')}</label>
          <input id="etx-amount" type="number" step="0.01" min="0.01" bind:value={editTxAmount} required />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="etx-type">{$t('common.type')}</label>
            <select id="etx-type" bind:value={editTxType}>
              <option value="Gasto">Gasto</option>
              <option value="Ingreso">Ingreso</option>
            </select>
          </div>
          <div class="form-field">
            <label for="etx-account">{$t('common.account')}</label>
            <select id="etx-account" bind:value={editTxAccountId}>{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}</select>
          </div>
        </div>
        <div class="form-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label>{$t('common.date')}</label>
          <DatePicker bind:value={editTxDate} showTime={true} />
        </div>
        <div class="form-field">
          <label for="etx-category">{$t('common.category')}</label>
          <select id="etx-category" bind:value={editTxCategoryId}>{#each categories as c}<option value={c.id}>{c.name}</option>{/each}</select>
        </div>
        {#if editTxError}<p class="modal-error">{editTxError}</p>{/if}
        {#if editTxAttachments.length > 0}
          <div class="attachments-section">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>{$t('dashboard.attached_receipts')}</label>
            {#each editTxAttachments as att (att.id)}
              <div class="attachment-row">
                <span class="att-name">{att.originalName ?? att.filename}</span>
                <button class="att-download" onclick={() => downloadAttachment(att.id, att.originalName ?? att.filename)} title="Descargar">↓</button>
              </div>
            {/each}
          </div>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-danger-sm" onclick={deleteEditTx} disabled={editTxSubmitting}>{$t('common.delete')}</button>
          <div class="actions-right">
            <button type="button" class="btn-cancel" onclick={closeEditTxModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit btn-green" disabled={editTxSubmitting}>
              {editTxSubmitting ? '...' : $t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- EDIT TRANSFER MODAL -->
{#if showEditTfModal && editTf}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeEditTfModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('dashboard.edit_transfer')}</h3>
        <button class="modal-close" onclick={closeEditTfModal}>&times;</button>
      </div>
      <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitEditTf(); }}>
        <div class="form-field">
          <label for="etf-name">{$t('common.name')}</label>
          <input id="etf-name" type="text" bind:value={editTfName} required />
        </div>
        <div class="form-field">
          <label for="etf-amount">{$t('common.amount')}</label>
          <input id="etf-amount" type="number" step="0.01" min="0.01" bind:value={editTfAmount} required />
        </div>
        <div class="form-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label>{$t('common.date')}</label>
          <DatePicker bind:value={editTfDate} showTime={true} />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="etf-source">{$t('dashboard.source_account')}</label>
            <select id="etf-source" bind:value={editTfSourceId}>{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}</select>
          </div>
          <div class="form-field">
            <label for="etf-dest">{$t('dashboard.dest_account')}</label>
            <select id="etf-dest" bind:value={editTfDestId}>{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}</select>
          </div>
        </div>
        {#if editTfError}<p class="modal-error">{editTfError}</p>{/if}
        {#if editTfAttachments.length > 0}
          <div class="attachments-section">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label>{$t('dashboard.attached_receipts')}</label>
            {#each editTfAttachments as att (att.id)}
              <div class="attachment-row">
                <span class="att-name">{att.originalName ?? att.filename}</span>
                <button class="att-download" onclick={() => downloadAttachment(att.id, att.originalName ?? att.filename)} title="Descargar">↓</button>
              </div>
            {/each}
          </div>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-danger-sm" onclick={deleteEditTf} disabled={editTfSubmitting}>{$t('common.delete')}</button>
          <div class="actions-right">
            <button type="button" class="btn-cancel" onclick={closeEditTfModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit btn-blue" disabled={editTfSubmitting}>
              {editTfSubmitting ? '...' : $t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ATTACH RECEIPT MODAL -->
{#if showAttachModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeAttachModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('dashboard.attach_title')}</h3>
        <button class="modal-close" onclick={closeAttachModal}>&times;</button>
      </div>
      {#if attachSuccess}
        <div class="modal-success"><span class="success-check">✓</span> {$t('dashboard.upload_success')}</div>
      {:else}
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitAttachment(); }}>
          <div class="form-field">
            <label for="attach-file">{$t('dashboard.file_label')}</label>
            <input id="attach-file" type="file" accept="image/*,.pdf" onchange={handleAttachFile} />
            {#if attachFile}<span class="attach-filename">{attachFile.name} ({(attachFile.size / 1024).toFixed(0)} KB)</span>{/if}
          </div>
          <div class="form-field">
            <label for="attach-tx">{$t('dashboard.attach_to_tx')}</label>
            <select id="attach-tx" bind:value={attachTxId}>
              <option value={null}>{$t('dashboard.none_option')}</option>
              {#each transactions as tx}<option value={tx.id}>{tx.name} ({tx.type === 'Gasto' ? '-' : '+'}{formatCurrency(tx.amount)})</option>{/each}
            </select>
          </div>
          <div class="form-field">
            <label for="attach-tf">{$t('dashboard.attach_to_tf')}</label>
            <select id="attach-tf" bind:value={attachTfId}>
              <option value={null}>— Ninguna —</option>
              {#each transfers as tf}<option value={tf.id}>{tf.name} ({formatCurrency(tf.amount)})</option>{/each}
            </select>
          </div>
          {#if attachError}<p class="modal-error">{attachError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={closeAttachModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit btn-green" disabled={attachSubmitting || !attachFile}>
              {attachSubmitting ? $t('dashboard.uploading') : $t('dashboard.upload_receipt_btn')}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- SUBSCRIPTION EDIT POPUP -->
{#if showSubEdit}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeSubEdit} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('dashboard.edit_subscription')}</h3>
        <button class="modal-close" onclick={closeSubEdit}>&times;</button>
      </div>
      <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitSubEdit(); }}>
        <div class="form-field">
          <label for="esub-name">{$t('common.name')}</label>
          <input id="esub-name" type="text" bind:value={editSubName} required />
        </div>
        <div class="form-field">
          <label for="esub-amount">{$t('common.amount')}</label>
          <input id="esub-amount" type="number" step="0.01" min="0.01" bind:value={editSubAmount} required />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="esub-cycle">{$t('subscriptions.cycle')}</label>
            <select id="esub-cycle" bind:value={editSubCycle}>
              <option value="Mensual">Mensual</option>
              <option value="Semanal">Semanal</option>
            </select>
          </div>
          <div class="form-field">
            <label for="esub-account">{$t('common.account')}</label>
            <select id="esub-account" bind:value={editSubAccountId}>{#each accounts as a}<option value={a.id}>{a.name}</option>{/each}</select>
          </div>
        </div>
        <div class="form-field">
          <label for="esub-date">{$t('dashboard.charge_date')}</label>
          <input id="esub-date" type="date" bind:value={editSubDate} required />
        </div>
        <div class="form-field">
          <label for="esub-category">{$t('common.category')}</label>
          <select id="esub-category" bind:value={editSubCategoryId}>{#each categories as c}<option value={c.id}>{c.name}</option>{/each}</select>
        </div>
        <div class="form-field">
          <label class="toggle-label">
            <input type="checkbox" bind:checked={editSubAutoCharge} />
            <span>{$t('dashboard.auto_charge')}</span>
          </label>
        </div>
        {#if editSubError}<p class="modal-error">{editSubError}</p>{/if}
        <div class="modal-actions">
          <button type="button" class="btn-danger-sm" onclick={deleteSubFromDashboard} disabled={subDeleting}>{$t('common.delete')}</button>
          <div class="actions-right">
            <button type="button" class="btn-cancel" onclick={closeSubEdit}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit btn-green" disabled={editSubSubmitting}>
              {editSubSubmitting ? '...' : $t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* ═══════════ PANEL PRINCIPAL ═══════════ */
  .panel { display: flex; flex-direction: column; gap: 1.25rem; }

  .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; color: var(--text-muted); gap: 0.5rem; }
  .spinner { width: 24px; height: 24px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* HEADER */
  .panel-header { display: flex; align-items: flex-start; justify-content: space-between; }
  .greeting { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .greeting-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }
  .header-right { display: flex; align-items: center; gap: 0.5rem; }
  .date-range { font-size: 0.72rem; color: var(--text-secondary); background: var(--bg-elevated); padding: 0.35rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); }
  .header-btn { font-size: 0.72rem; color: var(--text-secondary); background: var(--bg-elevated); padding: 0.35rem 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); cursor: pointer; }
  .header-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .theme-toggle { display: flex; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
  .theme-icon { padding: 0.3rem 0.5rem; font-size: 0.8rem; cursor: pointer; opacity: 0.5; }
  .theme-icon.active { opacity: 1; background: var(--bg-hover); }

  /* SUMMARY CARDS */
  .summary-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; }
  .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .sc-content { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .sc-label { font-size: 0.65rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .sc-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sc-icon.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
  .sc-icon.teal { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }
  .sc-icon.green { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
  .sc-icon.red { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
  .sc-value { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
  .sc-value.sc-green { color: var(--accent-green); }
  .sc-value.sc-red { color: var(--accent-red); }
  .sc-meta { font-size: 0.6rem; color: var(--text-muted); }
  .sc-positive { color: var(--accent-green); }
  .sc-negative { color: var(--accent-red); }
  .pct-ring-circle { width: 44px; height: 44px; position: relative; flex-shrink: 0; }
  .pct-ring-circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: var(--bg-hover); stroke-width: 3; }
  .ring-fill { fill: none; stroke: var(--accent-green); stroke-width: 3; stroke-linecap: round; }
  .ring-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; font-weight: 700; color: var(--accent-green); }

  /* MAIN 2-COLUMN GRID: sidebar + content */
  .main-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1rem; }

  /* CARDS */
  .card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; }
  .card-compact { padding: 0.75rem; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .card-title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.35rem; }
  .card-link { font-size: 0.65rem; color: var(--text-link); text-decoration: none; }
  .card-link:hover { text-decoration: underline; }
  .card-link-bottom { display: block; text-align: right; margin-top: 0.75rem; padding-top: 0.6rem; margin-bottom: -0.25rem; border-top: 1px solid var(--border-default); font-size: 0.7rem; color: var(--text-link); text-decoration: none; }
  .empty-text { font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 1rem 0; }

  /* COLUMNS */
  .col-left { display: flex; flex-direction: column; gap: 0.75rem; }
  .col-main { display: flex; flex-direction: column; gap: 0.75rem; }

  /* CHART ROW: line chart + donut side by side 50/50 */
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .chart-card { min-width: 0; }
  .donut-card { min-width: 0; display: flex; flex-direction: column; }
  .donut-card .card-link-bottom { margin-top: auto; }

  /* QUICK ACTIONS */
  .quick-actions { display: flex; flex-direction: column; gap: 0.3rem; }
  .qa-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.5rem; font-size: 0.72rem; font-weight: 500; color: var(--text-primary); background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); text-decoration: none; cursor: pointer; transition: background 0.15s; }
  .qa-btn:hover { background: var(--bg-hover); }

  /* PAYMENTS */
  .payments-list { display: flex; flex-direction: column; gap: 0; }
  .payment-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.3rem; border-bottom: 1px solid var(--border-subtle); text-decoration: none; cursor: pointer; border-radius: var(--radius-sm); background: none; border-left: none; border-right: none; border-top: none; width: 100%; text-align: left; color: inherit; font: inherit; }
  .payment-item:last-child { border-bottom: none; }
  .payment-item:hover { background: var(--bg-hover); }
  .pi-icon { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; flex-shrink: 0; }
  .pi-name { font-size: 0.72rem; font-weight: 500; color: var(--text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pi-cat { font-size: 0.58rem; color: var(--text-muted); flex-shrink: 0; }
  .days-badge { font-size: 0.55rem; font-weight: 600; padding: 0.1rem 0.3rem; border-radius: var(--radius-full); background: var(--tag-blue-bg); color: var(--accent-blue); flex-shrink: 0; }
  .days-badge.days-urgent { background: var(--tag-red-bg); color: var(--accent-red); }
  .pi-amount { font-size: 0.72rem; font-weight: 600; color: var(--text-primary); flex-shrink: 0; white-space: nowrap; }
  .card-link-sm { display: block; text-align: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-default); font-size: 0.62rem; color: var(--text-link); text-decoration: none; }

  /* ALERTS */
  .alerts-list { display: flex; flex-direction: column; gap: 0.35rem; }
  .alert-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem; background: var(--bg-elevated); border-radius: var(--radius-md); cursor: pointer; }
  .alert-item:hover { background: var(--bg-hover); }
  .alert-icon { font-size: 0.85rem; }
  .alert-text { flex: 1; display: flex; flex-direction: column; }
  .alert-title { font-size: 0.68rem; font-weight: 500; color: var(--text-primary); }
  .alert-desc { font-size: 0.58rem; color: var(--text-muted); }
  .alert-arrow { color: var(--text-muted); font-size: 0.65rem; }

  /* CHART */
  .chart-totals { display: flex; gap: 1.25rem; margin-bottom: 0.25rem; }
  .chart-total { font-size: 1.1rem; font-weight: 700; }
  .chart-total.green { color: var(--accent-green); }
  .chart-total.red { color: var(--accent-red); }
  .chart-legend-inline { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; }
  .legend-item { font-size: 0.62rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.2rem; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .legend-dot.green { background: var(--accent-green); }
  .legend-dot.red { background: var(--accent-red); }

  /* DONUT LAYOUT */
  .donut-layout { display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex: 1; }
  .donut-chart-area { flex-shrink: 0; width: 160px; }

  /* CATEGORY BREAKDOWN */
  .cat-breakdown { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; min-width: 0; }
  .cat-row { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 0.5rem; }
  .cat-dot { width: 12px; height: 12px; border-radius: 50%; }
  .cat-name { font-size: 0.78rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-pct { font-size: 0.7rem; color: var(--text-muted); text-align: right; }
  .cat-amount { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); text-align: right; white-space: nowrap; }

  /* ACCOUNTS */
  .accounts-scroll { display: flex; gap: 0.6rem; overflow-x: auto; padding-bottom: 0.25rem; }
  .account-mini { flex: 1 0 220px; max-width: 300px; padding: 0.7rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 0.15rem; }
  .am-top { display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; }
  .am-name { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); }
  .am-badges { display: flex; gap: 0.2rem; }
  .am-badge { font-size: 0.5rem; padding: 0.08rem 0.25rem; border-radius: var(--radius-full); font-weight: 600; }
  .badge-green { background: var(--color-success-subtle); color: var(--accent-green); }
  .badge-red { background: var(--tag-red-bg); color: var(--accent-red); }
  .badge-blue { background: var(--tag-blue-bg, rgba(59,130,246,0.15)); color: var(--accent-blue); }
  .badge-purple { background: var(--tag-purple-bg, rgba(139,92,246,0.15)); color: var(--accent-purple); }
  .am-bank { font-size: 0.6rem; color: var(--text-muted); }
  .am-balance { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.1rem; }
  .am-balance.negative { color: var(--accent-red); }
  .am-meta { font-size: 0.58rem; color: var(--text-muted); }
  .am-credit-info { display: flex; flex-direction: column; gap: 0.1rem; margin-top: 0.1rem; }
  .am-util-bar { height: 3px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; }
  .am-util-fill { height: 100%; border-radius: 2px; }
  .am-util-pct { font-size: 0.55rem; font-weight: 600; color: var(--text-muted); }

  /* BOTTOM ROW */
  .bottom-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }

  /* TRANSACTIONS */
  .tx-list { display: flex; flex-direction: column; }
  .tx-item { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); }
  .tx-item:last-child { border-bottom: none; }
  .tx-left { display: flex; flex-direction: column; gap: 0.05rem; }
  .tx-name { font-size: 0.72rem; font-weight: 500; color: var(--text-primary); }
  .tx-cat { font-size: 0.58rem; color: var(--text-muted); }
  .tx-right { display: flex; align-items: center; gap: 0.5rem; }
  .tx-amount { font-size: 0.75rem; font-weight: 600; }
  .tx-income { color: var(--accent-green); }
  .tx-expense { color: var(--accent-red); }
  .tx-date { font-size: 0.58rem; color: var(--text-muted); }

  /* BUDGETS */
  .budget-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .budget-item { display: flex; flex-direction: column; gap: 0.15rem; }
  .bi-top { display: flex; justify-content: space-between; }
  .bi-name { font-size: 0.7rem; font-weight: 500; color: var(--text-primary); }
  .bi-values { font-size: 0.58rem; color: var(--text-muted); }
  .bi-bar { height: 4px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; }
  .bi-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .bi-pct { font-size: 0.55rem; color: var(--text-muted); }

  /* GOALS */
  .goals-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .goal-item { display: flex; flex-direction: column; gap: 0.15rem; }
  .gi-top { display: flex; justify-content: space-between; align-items: center; }
  .gi-name { font-size: 0.72rem; font-weight: 600; color: var(--text-primary); }
  .gi-pct { font-size: 0.68rem; font-weight: 700; color: var(--accent-purple); }
  .gi-bar { height: 4px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; }
  .gi-bar-fill { height: 100%; background: var(--accent-purple); border-radius: 2px; transition: width 0.3s; }
  .gi-meta { display: flex; justify-content: space-between; font-size: 0.58rem; color: var(--text-muted); }

  /* TRANSFERS */
  .transfers-list { display: flex; flex-direction: column; }
  .tf-item { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); }
  .tf-item:last-child { border-bottom: none; }
  .tf-left { display: flex; flex-direction: column; gap: 0.05rem; }
  .tf-name { font-size: 0.72rem; font-weight: 500; color: var(--text-primary); }
  .tf-accounts { font-size: 0.58rem; color: var(--text-muted); }
  .tf-right { display: flex; align-items: center; gap: 0.5rem; }
  .tf-amount { font-size: 0.75rem; font-weight: 600; color: var(--accent-blue); }
  .tf-date { font-size: 0.58rem; color: var(--text-muted); }

  /* RESPONSIVE */
  @media (max-width: 1200px) {
    .main-grid { grid-template-columns: 180px 1fr; }
    .chart-row { grid-template-columns: 1fr 1fr; }
    .summary-row { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 900px) {
    .main-grid { grid-template-columns: 1fr; }
    .col-left { display: none; }
    .chart-row { grid-template-columns: 1fr; }
    .summary-row { grid-template-columns: repeat(2, 1fr); }
    .bottom-row { grid-template-columns: repeat(2, 1fr); }
  }

  /* MODAL */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(3px); }
  .modal-content { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.2rem; border-bottom: 1px solid var(--border-subtle); }
  .modal-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; }
  .modal-form { padding: 1.2rem; display: flex; flex-direction: column; gap: 0.85rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.25rem; }
  .form-field label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .modal-error { font-size: 0.7rem; color: var(--accent-red); background: var(--tag-red-bg); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); margin: 0; }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .btn-cancel { padding: 0.4rem 0.75rem; font-size: 0.75rem; background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; }
  .btn-submit { padding: 0.4rem 0.85rem; font-size: 0.75rem; font-weight: 600; border: none; border-radius: var(--radius-sm); color: #fff; cursor: pointer; }
  .btn-submit:disabled { opacity: 0.5; }
  .btn-red { background: var(--accent-red); }
  .btn-green { background: var(--accent-green); }
  .btn-blue { background: var(--accent-blue); }
  .modal-success { padding: 2rem; text-align: center; color: var(--accent-green); font-weight: 500; font-size: 0.85rem; }
  .success-check { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
  .clickable { cursor: pointer; transition: background 0.1s; }
  .clickable:hover { background: var(--bg-hover); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
  .btn-danger-sm { padding: 0.35rem 0.6rem; font-size: 0.7rem; background: var(--tag-red-bg); color: var(--accent-red); border: 1px solid var(--accent-red); border-radius: var(--radius-sm); cursor: pointer; }
  .btn-danger-sm:hover { background: var(--accent-red); color: #fff; }
  .actions-right { display: flex; gap: 0.4rem; margin-left: auto; }
  .attach-filename { font-size: 0.65rem; color: var(--text-muted); margin-top: 0.2rem; display: block; }
  .toggle-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-primary); cursor: pointer; }
  .toggle-label input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--accent-purple); }

  /* Attachments in edit modal */
  .attachments-section { margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-elevated); border-radius: var(--radius-sm); }
  .attachments-section label { font-size: 0.65rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.3rem; }
  .attachment-row { display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0; }
  .att-name { font-size: 0.7rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .att-download { font-size: 0.8rem; color: var(--accent-blue); text-decoration: none; padding: 0.15rem 0.4rem; background: var(--tag-blue-bg); border-radius: var(--radius-sm); font-weight: 600; border: none; cursor: pointer; }
</style>
