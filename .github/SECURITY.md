# Security Policy

HomeLedger is a self-hosted, local-first personal finance app. Because it
handles sensitive financial data, we take security reports seriously and
appreciate responsible disclosure.

## Supported Versions

Security fixes are applied to the latest released version. We recommend always
running the most recent release (and, for Docker, pulling the latest image).

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report them privately through one of these channels:

1. **GitHub Security Advisories (preferred).** Open a private report at
   [Security → Report a vulnerability](https://github.com/TastingRogue/HomeLedger/security/advisories/new).
   This keeps the details confidential until a fix is released.
2. **Maintainer contact.** If you cannot use advisories, reach the maintainer
   via their GitHub profile: [@TastingRogue](https://github.com/TastingRogue).

Please include as much of the following as you can:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept, affected endpoints, or config)
- The affected version and your deploy method (Docker image, Compose, or the
  Home Assistant add-on)
- Any suggested remediation, if you have one

## What to Expect

- **Acknowledgment** of your report within 72 hours.
- An initial assessment and severity triage shortly after.
- Regular updates on remediation progress.
- Public disclosure (with credit to you, if you wish) once a fix is available.

We ask that you give us a reasonable amount of time to release a fix before any
public disclosure.

## Scope

This policy covers the HomeLedger application code in this repository: the
backend API, the frontend, the shared package, the Docker image, and the Home
Assistant add-on/integration.

Because HomeLedger is self-hosted, the security of a given deployment also
depends on how it is configured. Please review the hardening notes below.

## Deployment Hardening

To keep your instance secure:

- **Set a strong `JWT_SECRET`** (min 32 random chars). Never run production on
  the insecure demo default.
- **Change `ADMIN_PASSWORD`** from the demo value and do not set
  `ALLOW_INSECURE_DEFAULTS` in production.
- **Restrict `CORS_ORIGIN`** to your known origins rather than reflecting any
  request origin.
- **Use `REGISTRATION_MODE=first_user_only` or `closed`** once your admin
  account exists, and optionally an email allowlist for `open` mode.
- **Run behind HTTPS** (a reverse proxy such as Caddy, Traefik, or nginx).
- **Back up and protect `DATA_DIR`**, which holds the SQLite database and
  attachments.

Thank you for helping keep HomeLedger and its users safe.
