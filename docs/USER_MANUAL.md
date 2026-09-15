# HomeLedger — User Manual

> 🌐 **Español:** [USER_MANUAL.es.md](USER_MANUAL.es.md)

A complete guide to every feature in HomeLedger. This manual covers the web
interface (the same UI whether you run Docker, the Home Assistant add-on, or the
desktop app). All screenshots use demo data; no real financial information is
shown.

**Language note.** HomeLedger is bilingual (English / Spanish). Every label
adapts to your chosen language in Settings. This manual uses the English labels;
the Spanish equivalents appear on-screen when Spanish is selected.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Accounts](#3-accounts)
4. [Transactions](#4-transactions)
5. [Transfers](#5-transfers)
6. [Subscriptions](#6-subscriptions)
7. [Goals](#7-goals)
8. [Budgets](#8-budgets)
9. [Loans](#9-loans)
10. [Categories](#10-categories)
11. [Rules (Auto-Categorization)](#11-rules-auto-categorization)
12. [Reports](#12-reports)
13. [Net Worth](#13-net-worth)
14. [Receipts & Invoices](#14-receipts--invoices)
15. [Bank Import](#15-bank-import)
16. [Search](#16-search)
17. [Alerts](#17-alerts)
18. [Calendar](#18-calendar)
19. [Quick Register](#19-quick-register)
20. [Backup & Restore](#20-backup--restore)
21. [Settings](#21-settings)
22. [Security (2FA, Sessions, App Lock)](#22-security)
23. [API Keys & Webhooks (Developer)](#23-api-keys--webhooks)
24. [Admin Panel](#24-admin-panel)
25. [PWA / Offline Mode](#25-pwa--offline-mode)
26. [Home Assistant Integration](#26-home-assistant-integration)

---

## 1. Getting Started

### First Login

1. Open HomeLedger in your browser (default `http://localhost:3000`).
2. **The first user to register becomes the admin.** Use the Register page to
   create your account (name, email, password).
3. After registration you are logged in automatically and land on the Dashboard.

### Navigation

The **sidebar** on the left groups all pages into four sections:

| Section | Pages |
|---|---|
| **Navigation** | Dashboard, Search, Accounts, Transactions, Transfers, Subscriptions |
| **Planning** | Goals, Budgets, Loans |
| **Analysis** | Categories, Rules, Reports, Net Worth, Receipts, Alerts |
| **Configuration** | Settings, Data & Import |

On **mobile**, the sidebar collapses behind a hamburger (☰) button. A **floating
"+" button** (bottom-right) is always visible and opens the [Quick Register](#19-quick-register)
screen for fast expense entry.

### Currency & Language

HomeLedger uses a **single currency per install** (e.g. MXN, USD, EUR). The
admin sets it during setup or in Settings. Individual accounts can optionally
carry a different currency with an exchange rate (see [Accounts](#3-accounts)),
and cross-account aggregations convert to the base currency.

Language (English / Spanish) is per-user — switch it any time in Settings.

---

## 2. Dashboard

Your financial home. Everything updates in real time as you add data.

### Summary Cards

| Card | What it shows |
|---|---|
| **Net Worth** | Total debit/cash/investment balances minus credit-card debt |
| **Available** | Total across checking and savings accounts |
| **Monthly Income** | Sum of income transactions this month (% change vs. last month) |
| **Monthly Expenses** | Sum of expense transactions this month (% change vs. last month) |
| **Budget Remaining** | Allocated minus spent across active budgets; or income minus expenses if no budgets exist |

### Charts

- **Income vs. Expenses** — bar/combo chart. Use the period selector
  (Today / Week / Month) to zoom in. "Today" groups by hour, "week" by weekday,
  "month" by day.
- **Expenses by Category** — doughnut chart with its own period selector.

### Quick Actions

Buttons at the top of the dashboard open modal dialogs for common tasks without
leaving the page:

- **Add Expense / Add Income** — name, amount, account, category.
- **Transfer** — move money between accounts.
- **Add Goal** — create a savings goal.
- **Attach Receipt** — upload a file and link it to a transaction or transfer.

### Inline Editing

Click any recent **transaction**, **transfer**, or upcoming **subscription** in
the dashboard cards to open an edit modal where you can modify or delete it
directly.

---

## 3. Accounts

Manage all your financial accounts in one place.

### Account Types

| Type | Description |
|---|---|
| Debit (Débito) | Checking and debit-card accounts |
| Credit (Crédito) | Credit cards — tracks utilization and statement info |
| Investment (Inversión) | Investment/brokerage accounts |
| Vouchers (Vales) | Meal vouchers, gift cards |
| Cash (Efectivo) | Cash on hand |

### Creating an Account

1. Click **New Account**.
2. Fill in: **name**, **type**, **bank** (optional), **initial balance**.
3. **Currency & exchange rate** (optional): if this account uses a different
   currency than the install's base currency, select it and enter the exchange
   rate. Aggregations (dashboard, reports, net worth) will convert using this
   rate; per-account views stay in the native currency.

### Credit-Card Fields (for Crédito accounts)

| Field | Purpose |
|---|---|
| Credit Limit | Maximum credit line |
| Statement Day | Day of month the statement closes |
| Payment Due Day | Day of month the payment is due |
| APR | Annual percentage rate (informational) |
| Minimum Payment | Current minimum payment amount |

The card detail view shows **credit utilization** (owed / limit), **health
status** (healthy / moderate / critical), linked subscriptions, and a
**statement summary** with payments made.

### Deactivating

Deactivate an account to hide it from active lists without deleting its history.

---

## 4. Transactions

The core of your ledger. Every income and expense lives here.

### Creating a Transaction

1. Click **New Transaction** (or use [Quick Register](#19-quick-register)).
2. Fill in:
   - **Name** — what the transaction is for.
   - **Amount** — the monetary value.
   - **Type** — Income or Expense.
   - **Account** — which account it belongs to.
   - **Category** — the spending/income category.
   - **Date** — defaults to now.
3. Optional fields: **merchant** (the payee/store), **subcategory**, **notes**,
   **subtype** (refund / reimbursement / adjustment), **status** (pending or
   posted), **reconciled** flag.

### Tags

Tags are a flexible, per-user labeling system independent of categories.

- Create tags from the transaction form or the Tags page.
- A transaction can have **multiple tags** (e.g. "vacation", "shared").
- Tags can have a color for visual grouping.
- You can filter transactions by tag and build [budgets by tag](#8-budgets).

### Splitting a Transaction

Split one transaction across multiple categories (e.g. a grocery receipt with
food + household items):

1. Open a transaction and click **Split**.
2. Add rows: category + amount + optional note. The amounts must sum to the
   transaction total.
3. Save. The splits replace any previous split.

### Audit History

Every transaction keeps a history of changes: who created it, when it was
edited, and what fields changed (old → new values). View it from the transaction
detail.

### Filters & Views

- Filter by: account, category, type, date range, reconciled, status, subtype,
  tag.
- Toggle between **card view** (grouped by month) and **table view**.
- **CSV Export**: download the full filtered dataset as a CSV file (UTF-8 with
  BOM for Excel compatibility).

---

## 5. Transfers

Move money between your own accounts without creating income or expense
transactions.

### Creating a Transfer

1. Click **New Transfer**.
2. Fill in: **name**, **amount**, **date**, **source account**, **destination
   account** (must differ from source).
3. **Cross-currency transfers**: if the source and destination have different
   currencies, an additional **destination amount** field appears — enter the
   amount that arrives in the destination's currency. The source amount leaves in
   the source currency; each side is tracked natively.

Deleting a transfer reverses the movement on both accounts.

---

## 6. Subscriptions

Track recurring payments and never miss a due date.

### Creating a Subscription

- **Name**, **amount**, **start date** (= first charge), **cycle** (weekly /
  monthly), **account**, **category**.
- **Auto-charge**: when enabled, the system automatically creates an expense
  transaction on each due date. If the app was offline or stopped, it **catches
  up** on all missed cycles when it restarts (one transaction per missed period).

### Calendar & Insights

- **Calendar** (sidebar → Subscriptions → Calendar): a monthly grid showing
  which days have subscription payments due, with an "upcoming" list sorted by
  urgency.
- **Insights** (P4.7): each subscription shows its annualized cost, total spent
  in the last 12 months, charge count, and detected price changes.

### Statuses

- **Active** — running, will charge if auto-charge is on.
- **Inactive** — paused, no charges.

---

## 7. Goals

Turn savings objectives into visible progress.

### Creating a Goal

- **Name**, **target amount**, **type** (Wishlist or Debt), optional
  **deadline**.

### Funding & Withdrawing

- **Fund**: add money toward the goal. The system caps the amount at the
  remaining target so you can't overshoot.
- **Withdraw**: pull money back. Capped at the current saved amount.
- When progress hits 100%, the goal is marked **Completed**.

### Forecast

Each goal shows a **completion forecast**: given your recent contribution rate,
how many months to completion, the estimated date, and whether you're on track
for the deadline.

---

## 8. Budgets

Control spending with category and tag budgets.

### Creating a Budget

1. Click **New Budget**.
2. **Name**, **period** (monthly / weekly), **start date**.
3. Allocate amounts per **category** and/or per **tag**.
4. **Rollover**: enable to carry unused amounts into the next period
   automatically.
5. **Alert threshold** (default 80%): the % at which a warning alert is
   generated.

### Progress

Each budget line shows:
- **Allocated** + **Rollover** = total available.
- **Spent** = actual expenses in the period.
- **Remaining** = available − spent.
- A progress bar that turns orange/red when approaching/exceeding the threshold.

### Available to Spend

The budget summary shows **total income** for the period vs. total allocated,
and the **unassigned** remainder — how much income isn't budgeted yet.

### Overspend Alerts

When spending exceeds the allocation, the system generates a **budget_exceeded**
alert (critical) and fires a webhook if configured. When it crosses the warning
threshold (but stays under 100%), a **budget_threshold** alert (warning) is
generated. Both auto-clear if spending drops back below the threshold.

---

## 9. Loans

Track loans with amortization and payment recording.

### Creating a Loan

- **Name**, **principal** (original amount), **interest rate** (annual %),
  **term** (months), **start date**.

### Amortization Schedule

A table showing each month's payment breakdown: total payment, principal
portion, interest portion, and remaining balance.

### Recording Payments

Click **Record Payment**: enter amount, principal, interest, and date. The
loan's remaining balance updates, and payment history is visible on the loan
detail.

---

## 10. Categories

Organize your finances with categories and subcategories.

- Each user gets their own editable set of default categories at sign-up (in the
  instance's language). You can rename, recolor, add, or delete them freely.
- **Type**: Expense, Income, or Both — controls which category appears in
  expense vs. income forms.
- **Subcategories**: nest finer breakdowns under a parent category.
- **Expense Analysis**: a date-filtered breakdown showing per-category totals and
  percentages.
- A category can only be deleted if no transactions reference it.

---

## 11. Rules (Auto-Categorization)

Automate transaction categorization with an if-this-then-that rule engine.

### Creating a Rule

1. **Conditions**: match on fields like `name`, `merchant`, `amount`,
   `account`, `description`. Operators: contains, equals, startsWith,
   endsWith, greaterThan, lessThan, between, regex. Optional case-sensitivity.
2. **Actions**: what happens when a transaction matches:
   - `setCategory` / `setSubcategory` / `setType` — assign a category, subcategory, or change the type.
   - `addTag` — add a tag.
   - `flagReview` — mark for manual review.
   - `markRecurring` — flag as a recurring transaction.
   - `ignore` — skip the transaction.
3. Rules have a **priority** (lower = runs first) and an **enabled** toggle.

### Testing & Applying

- **Test** (dry-run): see which existing transactions would match and what
  actions would apply — without changing anything.
- **Apply to uncategorized**: run all enabled rules against transactions that
  haven't been categorized yet.

### Learning Suggestions

After you manually categorize a transaction, the system can **suggest a rule**
based on the merchant or name pattern. Accept the suggestion to auto-categorize
similar transactions in the future.

---

## 12. Reports

Analytics and visualizations for your finances.

### Available Reports

| Report | What it shows |
|---|---|
| **Dashboard** | Consolidated balance, monthly income/expenses, category breakdown, account health |
| **Cash Flow** | Income vs. expenses by month (6-month trends) |
| **Savings Rate** | How much of your income you're saving (savings / income) |
| **Debt Report** | Credit-card debt overview |
| **Credit Utilization** | Per-card and overall utilization (owed / limit) |
| **Merchant Report** | Spending grouped by merchant/payee, ranked by total |
| **Month Comparison** | Side-by-side bars comparing consecutive months |

### Custom Saved Reports

Create and save custom report configurations with a name and type so you can
return to them later without reconfiguring filters.

---

## 13. Net Worth

Track your total financial picture over time.

### Current Net Worth

Shows:
- **Total Assets** — account balances + manually-entered asset values.
- **Total Liabilities** — credit-card debt + manually-entered liabilities.
- **Net Worth** = assets − liabilities.

### Assets & Liabilities

Add items that aren't bank accounts (e.g. a car, a mortgage, property):
- **Name**, **value/balance**, **type** (property, vehicle, other…), **notes**.

### History Chart

A line chart of net-worth snapshots over time. Period selector: 1 month, 6
months, 1 year, 5 years, or all time.

---

## 14. Receipts & Invoices

Upload receipts, run OCR, and turn them into transactions.

### Uploading

- **Choose file**: pick an image (JPG, PNG, WEBP, GIF), PDF, or XML (CFDI).
- **Take photo** 📷: on mobile, opens the rear camera directly. The photo flows
  through the same upload → server-side OCR pipeline.

### Analysis

After uploading, click **Analyze**:
- **Images**: server-side OCR (Tesseract, Spanish + English) extracts text.
- **PDFs**: text extraction (or OCR if scanned).
- **XML (CFDI)**: parses the Mexican digital invoice structure — extracts UUID,
  issuer RFC/name, IVA/tax, line items, and totals.

Extracted fields: merchant, date, subtotal, tax, total, currency, RFC, UUID.
All are editable if the OCR got something wrong.

### Item-Level Categorization

For receipts with line items (common in CFDI), you can assign a category to each
item individually.

### Creating a Transaction from a Receipt

Click **Create Transaction**: pick an account and category. If ≥2 line items are
categorized and their totals match the receipt total, the transaction is
automatically **split** by those categories. The CFDI UUID is stored as the
transaction's external ID, so re-importing the same invoice is caught by
duplicate detection.

---

## 15. Bank Import

Import bank statements to bulk-add transactions.

### Supported Formats

CSV, XLSX, OFX, QIF, JSON — with built-in parsers for **BBVA**, **Santander**,
and **Nu Mexico**. A generic parser handles standard CSV layouts.

### Import Flow

1. **Upload**: select a file and optionally pick a bank parser and target
   account.
2. **Preview**: the system normalizes merchants, dates, and currencies, then
   shows each row tagged as:
   - **New** — will be imported.
   - **Duplicate** — matches an existing transaction (by external ID or
     date+amount+name heuristic) — skipped.
   - **Pending Match** — matches an existing "pending" transaction that will be
     updated to "posted".
3. **Confirm**: choose the account (auto-detected if possible) and an optional
   default category. Selected rows are imported; duplicates are skipped.

### Import History & Undo

- **History**: view past imports with counts.
- **Undo**: reverse an import, removing all transactions it created.

---

## 16. Search

A **global search** across transactions, receipts, and subscriptions.

- Type a query in the search box to find matches by name, merchant, notes,
  RFC, UUID, or description.
- **Filters**: narrow by type (transaction / receipt / subscription), account,
  category, merchant, tag, amount range (min/max), transaction type
  (income/expense), and date range.
- Results are grouped by entity type with a total count.

---

## 17. Alerts

Automatic notifications about important financial events.

### Alert Types

| Type | Severity | When it triggers |
|---|---|---|
| **Low Balance** | Warning | An account balance drops below a threshold |
| **High Credit Utilization** | Warning | Credit-card utilization exceeds a threshold |
| **Payment Due** | Warning | A subscription payment is due within 3 days |
| **Payment Overdue** | Critical | A subscription payment date has passed |
| **Goal Completed** | Info | A savings goal reaches 100% |
| **Budget Threshold** | Warning | Spending crosses the budget's alert threshold |
| **Budget Exceeded** | Critical | Spending exceeds the budget allocation |

### Managing Alerts

- **Mark read** / **Mark all read**.
- **Delete** individual alerts.
- **Evaluate now**: manually trigger alert evaluation (normally runs hourly).
- **Settings**: toggle each alert type on/off.

---

## 18. Calendar

A monthly calendar view of **subscription payment dates**.

- Navigate between months with ◀ / ▶ or jump to **Today**.
- Days with payments show colored dots (up to 2 visible + a "+N" overflow).
- The side panel lists the next 8 upcoming payments sorted by urgency, with
  special styling for payments due within 3 days.

---

## 19. Quick Register

A mobile-first, 3-step keypad for recording a transaction in under 5 seconds.

### Step 1 — Amount

- Toggle **Expense** / **Income**.
- Type the amount on the on-screen numeric keypad. Supports decimals (up to 2
  places).
- Tap **Next**.

### Step 2 — Account & Category

- Pick an account and a category from a grid. **Recently used** items float to
  the top (remembered per device).
- Tap **Next**.

### Step 3 — Confirm

- Review the summary. Optionally type a **name** (if left blank, the category
  name is used).
- Tap **Register**. A confirmation toast appears, and the form resets to step 1
  for rapid repeat entry.

**Tip.** Access Quick Register from the **"+" floating button** visible on every
page, or bookmark `/registro-rapido`.

---

## 20. Backup & Restore

### JSON Export / Import (per user)

- **Export**: download your full data as a JSON file (accounts, transactions,
  transfers, categories, subcategories, tags, subscriptions, goals, budgets,
  loans, attachments, receipts).
- **Import** (destructive replace):
  1. Upload a JSON backup file.
  2. **Preview** (dry-run): see per-entity counts and warnings before any
     changes. Rows with broken references are flagged.
  3. **Confirm**: replaces your current data. IDs are remapped safely — a backup
     from one instance never collides with another user's data.

### Admin: Whole-Database Snapshots

Admins can manage gzip snapshots of the entire SQLite database:
- **Create Snapshot** — takes one now (also runs retention cleanup).
- **List** — see available snapshots.
- **Restore** — replaces the database for ALL users (destructive). Use with
  care.
- Automated daily snapshots run at 03:00 by default (configurable via
  `BACKUP_CRON` and `BACKUP_RETENTION`).

---

## 21. Settings

Open **Settings** from the sidebar (gear icon).

### Profile Tab

- Edit your **name**. Email and role are read-only.
- **Language**: switch between English and Spanish (takes effect immediately).
- **Theme**: Dark or Light.

### Data Tab

- Links to the [Import](#15-bank-import) page and shows database info (SQLite,
  version).

---

## 22. Security

All security features live in the **Security** tab of Settings.

### Change Password

Enter your current password, then a new one (minimum 6 characters) with
confirmation.

### Two-Factor Authentication (2FA)

HomeLedger supports **offline TOTP** (Time-based One-Time Password) — works
with any authenticator app (Google Authenticator, Aegis, etc.) and requires no
internet connection.

**To enable:**
1. Click **Enable** in the 2FA section.
2. Add the displayed secret key to your authenticator app (or scan the
   `otpauth://` URI).
3. Enter the 6-digit code from your app to **confirm** — this activates 2FA.
4. **Save your backup codes** — 10 one-time codes are shown (each works once).
   Store them somewhere safe; they won't be shown again.

**At login**, after entering your email and password, a second step asks for the
6-digit code from your authenticator (or a backup code).

**To disable**, enter a valid code or backup code.

### Active Sessions

View all devices/browsers where you're logged in:
- Each session shows IP address, user agent, last used time, and whether it's
  the current session.
- **Revoke** any individual session (revoking the current one logs you out).
- **Close All Sessions** logs out everywhere.

### App Lock (Optional)

A local, opt-in lock that gates the app on this device:
- **Biometric** (WebAuthn): uses your device's fingerprint or face recognition.
- **PIN** (4–8 digits): fallback when biometrics aren't available.

This is a convenience lock (like a phone app-lock). It does **not** replace your
login session or affect the server — if someone bypasses it in dev tools, they
still can't call the API without your JWT token.

---

## 23. API Keys & Webhooks

The **API** tab in Settings lets you integrate HomeLedger with other tools.

### API Keys

Create keys to access the REST API programmatically (via the `X-API-Key`
header).

1. Click **Create Key**, give it a name.
2. **Scopes** (optional): select which permissions the key has (e.g.
   `read:transactions`, `write:accounts`). If you select none, the key has
   **full access**.
3. The raw key is shown **once** — copy it. After closing, only metadata (name,
   scopes, last used) is visible.
4. **Revoke** a key to permanently invalidate it.

**API documentation** is available at `/api/docs` (Swagger UI) — a link is shown
in the API tab.

### Webhooks

Send real-time event notifications to your own endpoints (e.g. Home Assistant, a
local script, or any HTTP server).

1. Click **Add Webhook**.
2. **URL**: the HTTP(S) endpoint to POST to.
3. **Secret** (optional): when set, each delivery includes an
   `X-HomeLedger-Signature: sha256=<hex>` header (HMAC-SHA256 of the body) so
   you can verify authenticity.
4. **Events**: pick which events trigger a delivery:
   - `transaction.created` — a new transaction was created.
   - `budget.exceeded` — a budget line exceeded its allocation.
   - `goal.completed` — a savings goal reached 100%.
   - `subscription.upcoming` — a subscription payment is due soon (≤3 days).
5. **Enabled** toggle.
6. **Test** button sends a test event to verify connectivity.

Deliveries are **fire-and-forget** (non-blocking, best-effort) with a 5-second
timeout. The last delivery status is shown next to each webhook.

---

## 24. Admin Panel

Visible only to users with the **admin** role (the first registered user).

### User Management

- **List** all users with their role and status.
- **Enable / Disable** a user account (disabled users can't log in).
- **Reset Password** for any user (generates a strong one or set your own).
- **Delete** a user and all their data.

### Registration Policy

Control who can create an account:

| Mode | Behavior |
|---|---|
| **First user only** (default, safe) | Only the first user can register (bootstraps the admin), then registration is closed |
| **Open** | Anyone can register (optionally restricted by an email allowlist) |
| **Closed** | Nobody can register; the admin creates accounts |

### Instance Currency

Change the install's display currency (MXN, USD, EUR, COP, ARS, CLP, PEN, BRL).
This affects all amounts and symbols app-wide.

---

## 25. PWA / Offline Mode

HomeLedger is an **installable Progressive Web App**.

### Installing

On supported browsers (Chrome, Edge, Safari), use the browser's "Install" or
"Add to Home Screen" option. The app gets its own window, icon, and Start-menu
(or home-screen) entry.

### Offline Mode

When you lose internet connectivity:
- A small **"You are offline"** banner appears at the top.
- Cached pages and data continue to work (the service worker uses a
  network-first strategy with cache fallback).
- If a page hasn't been cached yet, a dedicated **offline page** is shown with a
  Retry button.
- When connectivity returns, the banner disappears automatically.

---

## 26. Home Assistant Integration

HomeLedger offers two independent Home Assistant pieces.

### Add-on (run HomeLedger inside HA)

Install the add-on from the repository
(`https://github.com/TastingRogue/HomeLedger`). It runs the full app inside Home
Assistant with Ingress (sidebar access). See the README for configuration
options.

### Custom Integration via HACS (sensors in HA)

Connect a running HomeLedger instance to Home Assistant to expose finances as HA
entities.

**Sensors created:**
- Monthly expenses, monthly income, monthly savings.
- Remaining budget, net worth, total balance.
- Credit-card utilization.

**Binary sensors:**
- Over budget, high credit utilization, payment due soon, low balance.

**Services (callable from automations):**
- `homeledger.create_transaction` — create an income/expense.
- `homeledger.create_quick_expense` — quick expense.
- `homeledger.refresh_data` — force a data refresh.

**Example automations:** notify when a subscription payment is due soon (using
the `payment_due_soon` binary sensor), or when credit utilization crosses a
threshold.

---

## Tips & Shortcuts

- **Escape** closes any open modal or panel.
- The **Quick Register** keypad remembers your recently-used accounts and
  categories for faster repeat entries.
- Use **tags** for cross-cutting labels (e.g. "vacation", "tax-deductible")
  that don't fit neatly into a single category.
- **Budget rollover** carries unused amounts to the next period automatically —
  you don't lose unspent allocation.
- **CFDI UUID deduplication**: importing the same Mexican digital invoice twice
  won't create a duplicate transaction.
- **Backup before upgrading**: always export a JSON backup before updating
  HomeLedger. Imports remap IDs safely, so a restore never collides with
  existing data.

---

*HomeLedger is free, open-source software under the MIT license. Contributions,
bug reports, and feature requests are welcome at
[github.com/TastingRogue/HomeLedger](https://github.com/TastingRogue/HomeLedger).*
