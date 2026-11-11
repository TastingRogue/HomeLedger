# Home Assistant

[← HomeLedger](../README.md) · [Docker installation](INSTALLATION.md)

HomeLedger ships with two independent Home Assistant pieces. You can use either
or both:

- **Add-on** (`ha-addon/`) — runs the whole HomeLedger app *inside* Home
  Assistant, with the web UI embedded in the HA sidebar via Ingress.
- **Custom integration** (`ha-integration/`, HACS) — connects to a running
  HomeLedger instance and exposes your finances as HA **sensors, binary
  sensors and services** for dashboards and automations.

## Option A — Add-on (run the app inside Home Assistant)

Requires Home Assistant OS or Supervised (the Supervisor must be available).

1. **Add the add-on repository**
   - Go to **Settings → Add-ons → Add-on Store**.
   - Open the **⋮** menu (top-right) → **Repositories**.
   - Add the repository URL:
     ```
     https://github.com/TastingRogue/HomeLedger
     ```
   - Click **Add**, then close the dialog.
2. **Install** — find **HomeLedger** in the store and click **Install** (the
   image is multi-arch: `amd64` and `aarch64`/arm64, so it runs on x86 servers
   and 64-bit Raspberry Pi).
3. **Configure** — open the add-on's **Configuration** tab and set at least:

   | Option | Required | Notes |
   |--------|----------|-------|
   | `JWT_SECRET` | **Yes** | Min 32 chars; use a strong random value |
   | `ADMIN_PASSWORD` | **Yes** | Password for the initial admin user |
   | `ADMIN_EMAIL` | No | Defaults to `admin@homeledger.local` |
   | `TZ` | No | Defaults to `America/Mexico_City` |

4. **Start** — go to the **Info** tab and click **Start**. Enable **Show in
   sidebar** for one-click access.
5. **Open** — launch it from the HA sidebar (Ingress), or directly at
   `http://<HA_IP>:3000`, and log in with the admin credentials you set.

Data is stored under `/data` (SQLite DB + attachments) and is included in Home
Assistant backups.

## Option B — Custom integration via HACS (finance sensors in HA)

Use this to pull HomeLedger data into HA. It works with **any** running
HomeLedger instance — the add-on above, a Docker deployment, etc. It polls
locally every 5 minutes (no cloud).

**Prerequisites:** a running HomeLedger instance reachable from HA, and an
**API key** generated in HomeLedger (sent with the `X-API-Key` header).

1. **Add the repository to HACS**
   - In HACS, open the **⋮** menu → **Custom repositories**.
   - Repository: `https://github.com/TastingRogue/HomeLedger`
   - Category: **Integration** → **Add**.
2. **Install** the *HomeLedger* integration from HACS, then **restart Home
   Assistant**.
3. **Add the integration** — go to **Settings → Devices & Services → Add
   Integration**, search for **HomeLedger**, and fill in:
   - **API URL** — e.g. `http://<HA_IP>:3000` (add-on) or your instance URL.
   - **API key** — the key generated in HomeLedger.
   - **Name** *(optional)* — a friendly label.

   The setup validates the connection against `/api/v1/ha/status`, so a wrong
   URL or key is reported immediately.

**Entities created:**

- **Sensors:** monthly expenses, monthly income, monthly savings, remaining
  budget, net worth, total balance, credit card utilization.
- **Binary sensors:** over budget, high credit utilization, payment due soon,
  low balance.

**Services** (callable from automations/scripts):

| Service | Purpose |
|---------|---------|
| `homeledger.create_transaction` | Create an income/expense (name, amount, type, account_id, category_id) |
| `homeledger.create_quick_expense` | Quick expense (amount, account_id, category_id) |
| `homeledger.refresh_data` | Force a data refresh |

Example: notify when a subscription payment is due soon, or when credit
utilization is high, using the binary sensors as automation triggers.
