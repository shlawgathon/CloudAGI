# Changelog — Arya Teja

All notable contributions by Arya Teja Rudraraju to the CloudAGI project, in reverse chronological order.

---

## 2026-03-05

### `4c7f5af` — docs(readme): add CORS_ORIGIN var and production deployment section

- Document `CORS_ORIGIN` env var in the backend variables list
- Add production deployment instructions for Vercel frontend and Docker backend
- Add `.env.production` to the important files list
- Files changed: `README.md` (+35)
- Co-authored with: Claude Opus 4.6

### `ec743f3` — fix: production deployment readiness

- Remove broken `COPY public/` from Dockerfile (directory doesn't exist)
- Fix hardcoded `/Users/xiao/` paths in README to relative paths
- Add `CORS_ORIGIN` env var (defaults to `https://cloudagi.org` in prod, `*` for local dev)
- Use config-driven CORS origin instead of wildcard in `src/index.ts`
- Add `.env.production` template with all required VPS deployment vars
- Document production API URL in `web/.env.example`
- Files changed: `.env.example`, `.env.production` (new), `Dockerfile`, `README.md`, `bun.lock`, `src/config.ts`, `src/index.ts`, `web/.env.example`, `web/bun.lock` (9 files, +41 -19)
- Co-authored with: Claude Opus 4.6

---

## Team Activity

Commits by other contributors, listed for full project context.

### 2026-03-05

- **`f27945d`** — chore: standardize local ports and tunnel helpers *(Jerry Xiao)*
  - 7 files changed — README, scripts, web config
- **`615a651`** — feat: foundation with Nevermined payment rail, Dockerfile, and web frontend *(Jerry Xiao)*
  - 34 files changed, 3228 insertions — full backend (`src/`), frontend (`web/`), Dockerfile, config, payments, Modal integration
- **`8bd371d`** — Initial commit *(Jerry Xiao)*
  - 3 files changed, 238 insertions — `.gitignore`, `LICENSE`, `README.md`
