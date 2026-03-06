# Contributions — Arya Teja

This documents exactly what Arya Teja built on CloudAGI, with file-level detail.

---

## Commits

### 1. `ec743f3` — fix: production deployment readiness (2026-03-05)

- **`Dockerfile`** — Removed broken `COPY public/ public/` line that referenced a nonexistent directory, fixing Docker builds
- **`README.md`** — Replaced 12 occurrences of hardcoded `/Users/xiao/CloudAGI/` paths with relative `./` paths
- **`src/config.ts`** — Added `corsOrigin` config field reading from `CORS_ORIGIN` env var (defaults to `https://cloudagi.org`)
- **`src/index.ts`** — Changed CORS `Access-Control-Allow-Origin` from hardcoded `*` to `config.corsOrigin` for security
- **`.env.example`** — Added `CORS_ORIGIN=*` for local development
- **`.env.production`** — Created production env template with all required deployment variables (PORT, HOST, APP_BASE_URL, ADMIN_KEY, CORS_ORIGIN, Nevermined vars, Modal vars)
- **`web/.env.example`** — Added production API URL documentation

### 2. `4c7f5af` — docs(readme): add CORS_ORIGIN var and production deployment section (2026-03-05)

- **`README.md`** — Added `CORS_ORIGIN` to backend env vars documentation
- **`README.md`** — Added full "Production Deployment" section with Vercel frontend and Docker backend instructions
- **`README.md`** — Added `.env.production` to Important Files list

### 3. Backend Deployment — VPS + Cloudflare Tunnel (2026-03-06)

- **Infrastructure** — Set up Cloudflare Tunnel (`cloudagi`) for NAT-safe deployment, no open ports
- **DNS** — Configured `api.cloudagi.org` as CNAME pointing to tunnel
- **Services** — Stopped Apache2, configured Caddy (backup), deployed Bun server via `nohup`
- **`.env`** — Configured all production environment variables on the host machine
- **`.arya/DEPLOYMENT.md`** — Created full deployment runbook: start/stop/restart, log inspection, update workflow, troubleshooting table
- **`.arya/STATUS.md`** — Updated with live deployment status
- **`.arya/CHANGELOG.md`** — Logged deployment work

---

## Summary Stats

- 3 sessions, 10+ files touched
- Focus area: deployment, infrastructure, security, documentation
- Tools used: Claude Opus 4.6 (AI pair programming)

## Areas of Ownership

- Production deployment pipeline (Dockerfile, .env.production, deployment docs)
- VPS infrastructure and Cloudflare Tunnel management
- CORS and security configuration
- README documentation
