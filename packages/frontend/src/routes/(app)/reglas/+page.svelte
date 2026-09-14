<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listRules,
    createRule,
    updateRule,
    deleteRule,
    testRule,
    applyRules,
    type Rule,
    type RuleCondition,
    type RuleAction,
    type RuleField,
    type RuleOperator,
    type RuleActionType,
    type CreateRulePayload,
  } from '$lib/api/rules';
  import { listCategories, type Category } from '$lib/api/categories';
  import { ApiError } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';

  // ─── State ───
  let rules = $state<Rule[]>([]);
  let categories = $state<Category[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Apply-to-uncategorized
  let applying = $state(false);
  let applyMessage = $state<string | null>(null);

  // Form (create/edit) — editable rows use looser types the UI can build up.
  interface ConditionRow { field: RuleField; operator: RuleOperator; value: string; valueMax: string; caseSensitive: boolean }
  interface ActionRow { type: RuleActionType; value: string }

  let showForm = $state(false);
  let editing = $state<Rule | null>(null);
  let formError = $state('');
  let submitting = $state(false);
  let formName = $state('');
  let formPriority = $state('1');
  let formEnabled = $state(true);
  let formConditions = $state<ConditionRow[]>([]);
  let formActions = $state<ActionRow[]>([]);
  let testMessage = $state<string | null>(null);
  let testing = $state(false);

  // Delete confirm
  let deleteTarget = $state<Rule | null>(null);
  let deleteSubmitting = $state(false);

  // Close open dialogs on Escape (keyboard accessibility for the modals).
  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (deleteTarget) deleteTarget = null;
    else if (showForm) closeForm();
  }

  // ─── Option lists ───
  const FIELDS: RuleField[] = ['name', 'merchant', 'amount', 'account', 'description'];
  const OPERATORS: RuleOperator[] = ['contains', 'equals', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'between', 'regex'];
  const ACTION_TYPES: RuleActionType[] = ['setCategory', 'setType', 'addTag', 'flagReview', 'markRecurring', 'ignore'];
  // Actions that act on the whole transaction and take no value input.
  const VALUELESS: RuleActionType[] = ['flagReview', 'markRecurring', 'ignore'];

  const isNumericOp = (op: RuleOperator) => op === 'greaterThan' || op === 'lessThan' || op === 'between';

  // ─── Load ───
  async function load() {
    loading = true;
    error = null;
    try {
      const [r, cats] = await Promise.all([listRules(), listCategories()]);
      rules = r;
      categories = cats;
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Error';
    } finally {
      loading = false;
    }
  }
  onMount(load);

  // ─── Summaries for the list ───
  function categoryName(id: number): string {
    return categories.find((c) => c.id === id)?.name ?? `#${id}`;
  }
  function conditionSummary(c: RuleCondition): string {
    const field = $t(`rules.field.${c.field}`);
    const op = $t(`rules.op.${c.operator}`);
    const val = Array.isArray(c.value) ? `${c.value[0]}–${c.value[1]}` : String(c.value);
    return `${field} ${op} ${val}`;
  }
  function actionSummary(a: RuleAction): string {
    if (a.type === 'setCategory') return `${$t('rules.action.setCategory')}: ${categoryName(Number(a.value))}`;
    if (a.type === 'setType') return `${$t('rules.action.setType')}: ${a.value === 'Ingreso' ? $t('rules.type_ingreso') : $t('rules.type_gasto')}`;
    // Valueless actions (flagReview / markRecurring / ignore) show just the label.
    if (VALUELESS.includes(a.type)) return $t(`rules.action.${a.type}`);
    return `${$t(`rules.action.${a.type}`)}: ${a.value}`;
  }

  // ─── Form open/close ───
  function openCreate() {
    editing = null;
    formName = '';
    formPriority = '1';
    formEnabled = true;
    formConditions = [{ field: 'name', operator: 'contains', value: '', valueMax: '', caseSensitive: false }];
    formActions = [{ type: 'setCategory', value: '' }];
    formError = '';
    testMessage = null;
    showForm = true;
  }

  function openEdit(rule: Rule) {
    editing = rule;
    formName = rule.name;
    formPriority = String(rule.priority);
    formEnabled = rule.enabled;
    formConditions = rule.conditions.map((c) => ({
      field: c.field,
      operator: c.operator,
      value: Array.isArray(c.value) ? String(c.value[0]) : String(c.value),
      valueMax: Array.isArray(c.value) ? String(c.value[1]) : '',
      caseSensitive: c.caseSensitive ?? false,
    }));
    formActions = rule.actions.map((a) => ({ type: a.type, value: a.value == null ? '' : String(a.value) }));
    formError = '';
    testMessage = null;
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editing = null;
  }

  function addCondition() {
    formConditions = [...formConditions, { field: 'name', operator: 'contains', value: '', valueMax: '', caseSensitive: false }];
  }
  function removeCondition(i: number) {
    formConditions = formConditions.filter((_, idx) => idx !== i);
  }
  function addAction() {
    formActions = [...formActions, { type: 'setCategory', value: '' }];
  }
  function removeAction(i: number) {
    formActions = formActions.filter((_, idx) => idx !== i);
  }

  // ─── Build payload from the editable rows ───
  function buildPayload(): CreateRulePayload | null {
    const name = formName.trim();
    const priority = parseInt(formPriority, 10);
    if (!name) { formError = $t('rules.form_name'); return null; }
    if (!Number.isFinite(priority) || priority < 1) { formError = $t('rules.form_priority'); return null; }
    if (formConditions.length === 0) { formError = $t('rules.conditions_hint'); return null; }
    if (formActions.length === 0) { formError = $t('rules.actions'); return null; }

    const conditions: RuleCondition[] = [];
    for (const c of formConditions) {
      let value: string | number | [number, number];
      if (c.operator === 'between') {
        value = [Number(c.value), Number(c.valueMax)];
      } else if (isNumericOp(c.operator) || c.field === 'amount') {
        value = c.value === '' ? c.value : Number(c.value);
      } else {
        value = c.value;
      }
      const cond: RuleCondition = { field: c.field, operator: c.operator, value };
      if (c.caseSensitive) cond.caseSensitive = true;
      conditions.push(cond);
    }

    const actions: RuleAction[] = formActions.map((a) => {
      if (VALUELESS.includes(a.type)) return { type: a.type };
      return { type: a.type, value: a.type === 'setCategory' ? Number(a.value) : a.value };
    });

    return { name, priority, conditions, actions, enabled: formEnabled };
  }

  async function submit(e: Event) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    submitting = true;
    formError = '';
    try {
      if (editing) {
        await updateRule(editing.id, payload);
      } else {
        await createRule(payload);
      }
      closeForm();
      await load();
    } catch (err) {
      formError = err instanceof ApiError ? err.message : 'Error';
    } finally {
      submitting = false;
    }
  }

  async function runTest() {
    const payload = buildPayload();
    if (!payload) return;
    testing = true;
    testMessage = null;
    try {
      const res = await testRule(payload);
      testMessage = $t('rules.test_result', { matched: res.totalMatched, tested: res.totalTested });
    } catch (err) {
      formError = err instanceof ApiError ? err.message : 'Error';
    } finally {
      testing = false;
    }
  }

  // ─── Toggle enabled inline ───
  async function toggleEnabled(rule: Rule) {
    try {
      await updateRule(rule.id, { enabled: !rule.enabled });
      rule.enabled = !rule.enabled;
      rules = [...rules];
    } catch {
      /* revert on failure by reloading */
      await load();
    }
  }

  // ─── Apply ───
  async function apply() {
    applying = true;
    applyMessage = null;
    try {
      const res = await applyRules();
      applyMessage = $t('rules.apply_result', { matched: res.matched, processed: res.processed });
      await load();
    } catch (err) {
      applyMessage = err instanceof ApiError ? err.message : 'Error';
    } finally {
      applying = false;
    }
  }

  // ─── Delete ───
  async function confirmDelete() {
    if (!deleteTarget) return;
    deleteSubmitting = true;
    try {
      await deleteRule(deleteTarget.id);
      deleteTarget = null;
      await load();
    } catch {
      /* keep dialog open on failure */
    } finally {
      deleteSubmitting = false;
    }
  }
</script>

<svelte:head><title>{$t('page_title.rules')} · HomeLedger</title></svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="page">
  <header class="header">
    <div>
      <p class="eyebrow">{$t('rules.page_eyebrow')}</p>
      <h1>{$t('rules.page_title')}</h1>
      <p class="subtitle">{$t('rules.page_subtitle')}</p>
    </div>
    <div class="header-actions">
      <button class="btn-secondary" onclick={apply} disabled={applying || rules.length === 0}>
        {applying ? $t('rules.applying') : $t('rules.apply')}
      </button>
      <button class="btn-new" onclick={openCreate}>{$t('rules.new')}</button>
    </div>
  </header>

  {#if applyMessage}
    <p class="banner" role="status">{applyMessage}</p>
  {/if}

  {#if loading}
    <div class="state-msg">…</div>
  {:else if error}
    <div class="state-msg">{error}</div>
  {:else if rules.length === 0}
    <div class="state-msg">{$t('rules.empty')}</div>
  {:else}
    <div class="table-wrap">
      <table class="data-table" aria-label={$t('rules.page_title')}>
        <thead>
          <tr>
            <th>{$t('rules.col_priority')}</th>
            <th>{$t('rules.col_name')}</th>
            <th>{$t('rules.col_conditions')}</th>
            <th>{$t('rules.col_actions')}</th>
            <th class="num">{$t('rules.col_matches')}</th>
            <th>{$t('rules.col_enabled')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each rules as rule (rule.id)}
            <tr class:disabled-row={!rule.enabled}>
              <td class="num">{rule.priority}</td>
              <td class="name-cell">{rule.name}</td>
              <td class="summary-cell">
                {#each rule.conditions as c}<span class="chip">{conditionSummary(c)}</span>{/each}
              </td>
              <td class="summary-cell">
                {#each rule.actions as a}<span class="chip chip-action">{actionSummary(a)}</span>{/each}
              </td>
              <td class="num">{rule.matchCount}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" checked={rule.enabled} onchange={() => toggleEnabled(rule)} aria-label={$t('rules.col_enabled')} />
                  <span class="switch-track"></span>
                </label>
              </td>
              <td class="row-actions">
                <button class="icon-btn" onclick={() => openEdit(rule)} aria-label={$t('common.edit')}>✎</button>
                <button class="icon-btn danger" onclick={() => (deleteTarget = rule)} aria-label={$t('common.delete')}>🗑</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Create / Edit modal -->
{#if showForm}
  <div class="overlay" role="presentation" onclick={closeForm} transition:scrim>
    <!-- Inner onclick only stops backdrop dismiss; Escape (window) + backdrop click cover keyboard. -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-wide" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{editing ? $t('rules.edit_title') : $t('rules.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label={$t('common.close')}>&times;</button>
      </header>
      <form class="modal-form" onsubmit={submit}>
        {#if formError}<p class="modal-error" role="alert">{formError}</p>{/if}

        <div class="form-row">
          <div class="field">
            <label for="r-name">{$t('rules.form_name')}</label>
            <input id="r-name" bind:value={formName} maxlength="100" />
          </div>
          <div class="field">
            <label for="r-priority">{$t('rules.form_priority')}</label>
            <input id="r-priority" type="number" min="1" step="1" bind:value={formPriority} />
            <span class="field-hint">{$t('rules.form_priority_hint')}</span>
          </div>
        </div>

        <!-- Conditions -->
        <div class="builder">
          <div class="builder-head">
            <span class="builder-title">{$t('rules.conditions')}</span>
            <button type="button" class="btn-add" onclick={addCondition}>+ {$t('rules.add_condition')}</button>
          </div>
          <p class="field-hint">{$t('rules.conditions_hint')}</p>
          {#each formConditions as cond, i}
            <div class="builder-row">
              <select bind:value={cond.field} aria-label={$t('rules.col_conditions')}>
                {#each FIELDS as f}<option value={f}>{$t(`rules.field.${f}`)}</option>{/each}
              </select>
              <select bind:value={cond.operator}>
                {#each OPERATORS as op}<option value={op}>{$t(`rules.op.${op}`)}</option>{/each}
              </select>
              {#if cond.operator === 'between'}
                <input class="val" type="number" step="0.01" placeholder={$t('rules.value_min')} bind:value={cond.value} />
                <input class="val" type="number" step="0.01" placeholder={$t('rules.value_max')} bind:value={cond.valueMax} />
              {:else}
                <input class="val" type={isNumericOp(cond.operator) || cond.field === 'amount' ? 'number' : 'text'} step="0.01" placeholder={$t('rules.value')} bind:value={cond.value} />
              {/if}
              {#if formConditions.length > 1}
                <button type="button" class="btn-remove" onclick={() => removeCondition(i)} aria-label={$t('rules.remove')}>&times;</button>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Actions -->
        <div class="builder">
          <div class="builder-head">
            <span class="builder-title">{$t('rules.actions')}</span>
            <button type="button" class="btn-add" onclick={addAction}>+ {$t('rules.add_action')}</button>
          </div>
          {#each formActions as act, i}
            <div class="builder-row">
              <select bind:value={act.type} aria-label={$t('rules.col_actions')}>
                {#each ACTION_TYPES as at}<option value={at}>{$t(`rules.action.${at}`)}</option>{/each}
              </select>
              {#if act.type === 'setCategory'}
                <select class="val" bind:value={act.value}>
                  <option value="" disabled>—</option>
                  {#each categories as c (c.id)}<option value={String(c.id)}>{c.name}</option>{/each}
                </select>
              {:else if act.type === 'setType'}
                <select class="val" bind:value={act.value}>
                  <option value="Gasto">{$t('rules.type_gasto')}</option>
                  <option value="Ingreso">{$t('rules.type_ingreso')}</option>
                </select>
              {:else if VALUELESS.includes(act.type)}
                <span class="val val-note">{$t(`rules.action_note.${act.type}`)}</span>
              {:else}
                <input class="val" bind:value={act.value} placeholder={$t('rules.value')} />
              {/if}
              {#if formActions.length > 1}
                <button type="button" class="btn-remove" onclick={() => removeAction(i)} aria-label={$t('rules.remove')}>&times;</button>
              {/if}
            </div>
          {/each}
        </div>

        <label class="check-row">
          <input type="checkbox" bind:checked={formEnabled} />
          <span>{$t('rules.form_enabled')}</span>
        </label>

        {#if testMessage}<p class="test-msg" role="status">{testMessage}</p>{/if}

        <div class="modal-actions-split">
          <button type="button" class="btn-cancel" onclick={runTest} disabled={testing}>
            {testing ? $t('rules.testing') : $t('rules.test')}
          </button>
          <div class="actions-right">
            <button type="button" class="btn-cancel" onclick={closeForm}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit" disabled={submitting}>{$t('common.save')}</button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete confirm -->
{#if deleteTarget}
  <div class="overlay" role="presentation" onclick={() => (deleteTarget = null)} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{$t('rules.delete_title')}</h2>
        <button class="close-btn" onclick={() => (deleteTarget = null)} aria-label={$t('common.close')}>&times;</button>
      </header>
      <div class="modal-form">
        <p class="confirm-text">{$t('rules.delete_confirm')}</p>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => (deleteTarget = null)}>{$t('common.cancel')}</button>
          <button class="btn-danger-solid" onclick={confirmDelete} disabled={deleteSubmitting}>{$t('common.delete')}</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
  .eyebrow { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-orange); font-weight: 600; }
  .header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.01em; margin: 0.1rem 0; }
  .subtitle { font-size: 0.85rem; color: var(--text-secondary); max-width: 46ch; }
  .header-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

  .btn-new {
    padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 600; color: #fff;
    background: var(--accent-blue); border: none; border-radius: var(--radius-md); cursor: pointer;
    transition: background var(--transition-fast), transform var(--transition-fast);
  }
  .btn-new:hover { background: var(--color-primary-hover); }
  .btn-secondary {
    padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 500; color: var(--text-secondary);
    background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
  /* Instant press feedback (apple-design §1) */
  .btn-new:active, .btn-secondary:active { transform: scale(0.97); }

  .banner {
    background: var(--tag-blue-bg); color: var(--text-primary); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); padding: 0.5rem 0.75rem; font-size: 0.82rem; margin-bottom: 1rem;
  }

  .state-msg { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); font-size: 0.9rem; }

  .table-wrap { overflow-x: auto; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .data-table th {
    text-align: left; padding: 0.6rem 0.85rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border-subtle); white-space: nowrap;
  }
  .data-table td { padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-subtle); vertical-align: top; }
  .data-table tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .name-cell { font-weight: 600; color: var(--text-primary); }
  .disabled-row { opacity: 0.5; }
  .summary-cell { display: flex; flex-wrap: wrap; gap: 0.25rem; max-width: 22rem; }
  .chip {
    display: inline-block; font-size: 0.72rem; padding: 0.12rem 0.45rem; border-radius: var(--radius-full);
    background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-subtle);
  }
  .chip-action { background: var(--tag-purple-bg); color: var(--accent-purple); border-color: transparent; }

  .row-actions { display: flex; gap: 0.3rem; white-space: nowrap; }
  .icon-btn {
    background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; padding: 0.2rem 0.35rem;
    border-radius: var(--radius-sm); transition: background var(--transition-fast), color var(--transition-fast);
  }
  .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .icon-btn.danger:hover { color: var(--accent-red); }
  .icon-btn:active { transform: scale(0.9); }

  /* Toggle switch */
  .switch { position: relative; display: inline-flex; cursor: pointer; }
  .switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .switch-track {
    width: 32px; height: 18px; background: var(--border-default); border-radius: 9px;
    transition: background var(--transition-base); position: relative;
  }
  .switch-track::after {
    content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
    background: #fff; transition: transform var(--transition-base);
  }
  .switch input:checked + .switch-track { background: var(--accent-green); }
  .switch input:checked + .switch-track::after { transform: translateX(14px); }
  .switch input:focus-visible + .switch-track { box-shadow: 0 0 0 2px var(--color-primary-glow); }

  /* Modal builder */
  .modal-wide { max-width: 680px; }
  .field-hint { font-size: 0.7rem; color: var(--text-muted); }
  .builder { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.65rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .builder-head { display: flex; align-items: center; justify-content: space-between; }
  .builder-title { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
  .btn-add {
    font-size: 0.72rem; color: var(--accent-blue); background: none; border: none; cursor: pointer; padding: 0.15rem 0.3rem;
    border-radius: var(--radius-sm); transition: background var(--transition-fast);
  }
  .btn-add:hover { background: var(--tag-blue-bg); }
  .builder-row { display: flex; gap: 0.4rem; align-items: center; }
  /* Give each control a fair, legible share of the row instead of letting the
     selects size to their content and squeeze the value field to nothing.
     min-width keeps every control wide enough to read the selection/typed text. */
  .builder-row > select { flex: 1 1 0; min-width: 96px; }
  .builder-row .val { flex: 1.2 1 0; min-width: 110px; }
  .builder-row select, .builder-row input { width: 100%; }
  .btn-remove {
    background: none; border: none; color: var(--text-muted); font-size: 1.1rem; line-height: 1; cursor: pointer;
    padding: 0 0.3rem; border-radius: var(--radius-sm); transition: color var(--transition-fast);
  }
  .btn-remove:hover { color: var(--accent-red); }

  .check-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; }
  .check-row input { width: auto; }

  .test-msg { font-size: 0.8rem; color: var(--accent-green); background: var(--color-success-subtle); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm); margin: 0; }

  .actions-right { display: flex; gap: 0.5rem; }

  /* Respect reduced-motion (apple-design §14): drop press-scale + toggle slide */
  @media (prefers-reduced-motion: reduce) {
    .btn-new, .btn-secondary, .icon-btn { transition: background var(--transition-fast), color var(--transition-fast); }
    .btn-new:active, .btn-secondary:active, .icon-btn:active { transform: none; }
    .switch-track, .switch-track::after { transition: none; }
  }

  @media (max-width: 640px) {
    .header { flex-direction: column; }
    .builder-row { flex-wrap: wrap; }
  }
</style>
