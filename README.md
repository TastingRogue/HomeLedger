<div align="center">

# 💰 HomeLedger

**Your finances. Your data. Your control.**

An open-source personal finance app for tracking spending, planning budgets,
and keeping your accounts in one place. Run it on your own server or try the
Windows desktop preview.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-22c55e.svg)](CHANGELOG.md)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/irving1flores/homeledger)

[Get started](#quick-start) · [Features](#features) · [Themes](#interface-themes) · [User manual](docs/USER_MANUAL.md)

</div>

## Quick start

Choose how you want to use HomeLedger:

| Where | Get started | Status |
| --- | --- | --- |
| **Your server, NAS or homelab** | [Install with Docker](docs/INSTALLATION.md#docker-recommended-for-production) | Recommended for production |
| **Your Windows PC** | [Download the Windows x64 installer](https://github.com/TastingRogue/HomeLedger/releases/tag/v1.2.0) | Unsigned preview; use synthetic data for testing |
| **Home Assistant** | [Install the add-on or connect an existing instance](docs/HOME_ASSISTANT.md) | Add-on + HACS integration |

The desktop preview needs no separate server or Docker. See its
[guide and limitations](docs/desktop.md); macOS/Linux installer validation is pending.

### ❤️ Help keep HomeLedger free and open source

<div align="center">

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor_on_GitHub-%E2%99%A5-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/TastingRogue)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/TastingRogue)
[![Star the project](https://img.shields.io/badge/Star_the_project-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/TastingRogue/HomeLedger)

</div>

Your support helps sustain development and maintenance.

<a href="docs/screenshots/dashboard.jpg"><img src="docs/screenshots/dashboard.jpg" alt="HomeLedger Normal dashboard showing account balances, cash flow and spending categories with demo data" width="100%" /></a>

## Features

- **See your finances together.** Track bank accounts, credit cards, cash, investments and net worth.
- **Keep spending organized.** Record income and expenses, transfer money between accounts, import bank files and categorize transactions with rules.
- **Plan ahead.** Set budgets and savings goals, manage loans, and track subscriptions and upcoming payments.
- **Understand your money.** Explore cash flow, spending categories and trends through reports and alerts.
- **Keep the paperwork.** Attach receipts and invoices, extract their details, and export or back up your data.
- **Connect your tools.** Use Home Assistant, the REST API, or the optional MCP integration for AI assistants.

Accounts can use different currencies with manually maintained exchange rates.
MCP is off by default and requires user confirmation before enabling.

[Explore the user manual](docs/USER_MANUAL.md) · [Full feature and technical reference](docs/REFERENCE.md)

## Interface themes

**Normal**, shown above, offers light and dark modes. **Cyberpunk 2077**, shown
below, uses a burgundy background, electric yellow headers and cyan accents.
Both themes use the same data and financial workflows, with responsive layouts.

<a href="docs/screenshots/dashboard-cyberpunk.jpg"><img src="docs/screenshots/dashboard-cyberpunk.jpg" alt="HomeLedger Cyberpunk dashboard with demo accounts, charts and financial summaries" width="100%" /></a>

Switch in **Settings → Profile → Interface design**. Your choice is saved in your
browser, and your Normal light/dark preference is preserved when switching themes.

[View the screenshot gallery](docs/SCREENSHOTS.md) · [Create a theme](docs/THEMES.md)

Screenshots use synthetic demo data. The Cyberpunk theme is an unofficial visual
inspiration; HomeLedger is not affiliated with CD PROJEKT RED.

## Supported languages and translation credits

Choose your language in **Settings → Profile**.

| Language | Locale | Credit |
| --- | --- | --- |
| English | `en` | Original project language |
| Spanish (Español) | `es` | Original project language |
| Brazilian Portuguese (Português do Brasil) | `pt-BR` | [Thiago Alves (@ThiaAlves)](https://github.com/ThiaAlves), [PR #20](https://github.com/TastingRogue/HomeLedger/pull/20) |

Languages are modular packs shared across web, backend and desktop.
[Contribute a translation](CONTRIBUTING.md#adding-a-language).

## Help and documentation

| I want to… | Go to |
| --- | --- |
| Install or configure HomeLedger | [Installation](docs/INSTALLATION.md) · [Environment variables](docs/INSTALLATION.md#environment-variables) |
| Learn the app | [User manual](docs/USER_MANUAL.md) · [Manual en español](docs/USER_MANUAL.es.md) |
| Upgrade or recover access | [Upgrading](docs/INSTALLATION.md#upgrading) · [Account recovery](docs/INSTALLATION.md#account-recovery-locked-out) |
| Configure HTTPS or backups | [Deployment and operations](docs/DEPLOYMENT.md) |
| Connect Home Assistant | [Add-on and integration guide](docs/HOME_ASSISTANT.md) |
| Build an integration | [API reference](docs/REFERENCE.md#api-endpoints) · [MCP guide](docs/USER_MANUAL.md#mcp-ai-assistants) |
| Report a problem or suggest a feature | [Open an issue](https://github.com/TastingRogue/HomeLedger/issues/new/choose) |

## Contribute

Bug reports, translations, documentation and code contributions are welcome.
Start with the [contributing guide](CONTRIBUTING.md), explore the
[roadmap](ROADMAP.md), or read the [changelog](CHANGELOG.md).

HomeLedger is built with SvelteKit, Fastify, TypeScript and SQLite.
[Development setup](CONTRIBUTING.md#setup) · [Theme contributions](docs/THEMES.md)

Please follow our [Code of Conduct](.github/CODE_OF_CONDUCT.md).
Report vulnerabilities through the [Security Policy](.github/SECURITY.md).

## Support HomeLedger

HomeLedger is built and maintained in spare time and will remain free.
[Sponsoring](https://github.com/sponsors/TastingRogue) or
[buying a coffee](https://buymeacoffee.com/TastingRogue) helps keep the project going.
Starring the repository, reporting bugs and helping other users also make a difference.

## License

[MIT](LICENSE)
