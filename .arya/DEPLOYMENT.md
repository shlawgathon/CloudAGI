# Deployment Guide — CloudAGI Backend

Last updated: 2026-03-06

---

## Architecture

```
User -> cloudflare proxy -> Cloudflare Tunnel -> localhost:3000 (Bun server)
```

- **Backend:** Bun server on `localhost:3000`
- **Tunnel:** `cloudflared` connects outbound to Cloudflare (no open ports needed)
- **Domain:** `api.cloudagi.org` (CNAME -> Cloudflare Tunnel)
- **Frontend:** `cloudagi.org` (not yet deployed)

## Quick Reference

| Service | URL |
|---------|-----|
| Health check | `https://api.cloudagi.org/v1/health` |
| Agent discovery | `https://api.cloudagi.org/.well-known/agent.json` |
| Create order | `POST https://api.cloudagi.org/v1/orders` |
| List orders | `GET https://api.cloudagi.org/v1/orders` (requires admin key) |

## Starting Services (after reboot)

Run from the project directory:

```bash
# 1. Start the backend
cd ~/CloudAGI
nohup bun run start > cloudagi.log 2>&1 &

# 2. Start the Cloudflare Tunnel
nohup cloudflared tunnel --url http://localhost:3000 run cloudagi > ~/cloudflared.log 2>&1 &

# 3. Verify
sleep 3
curl -s http://localhost:3000/v1/health
curl -s https://api.cloudagi.org/v1/health
```

## Stopping Services

```bash
# Stop backend
pkill -f "bun run start" || pkill -f "src/index.ts"

# Stop tunnel
pkill -f "cloudflared tunnel"
```

## Restarting (full cycle)

```bash
pkill -f "bun run start" || true
pkill -f "cloudflared tunnel" || true
sleep 1
cd ~/CloudAGI
nohup bun run start > cloudagi.log 2>&1 &
nohup cloudflared tunnel --url http://localhost:3000 run cloudagi > ~/cloudflared.log 2>&1 &
sleep 3
curl -s https://api.cloudagi.org/v1/health
```

## Checking Logs

```bash
# Backend logs
tail -50 ~/CloudAGI/cloudagi.log

# Tunnel logs
tail -50 ~/cloudflared.log

# What's running
ps aux | grep -E "bun|cloudflared" | grep -v grep
```

## Pulling Updates from GitHub

```bash
cd ~/CloudAGI
git pull origin main
pkill -f "bun run start" || true
bun install
nohup bun run start > cloudagi.log 2>&1 &
sleep 2
curl -s https://api.cloudagi.org/v1/health
```

## Environment Variables

The `.env` file at `~/CloudAGI/.env` contains all config. Key variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (3000) |
| `HOST` | Bind address (0.0.0.0) |
| `APP_BASE_URL` | Public URL for the API |
| `ADMIN_KEY` | Key for admin endpoints (set in .env, do not commit) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `MODAL_*` | Modal GPU job configuration |
| `NVM_*` | Nevermined payment credentials |
| `CLOUDAGI_*` | Offer/pricing config |

**Important:** Never commit `.env` to git. It contains API keys and secrets.

## Cloudflare Tunnel Info

- Tunnel name: `cloudagi`
- Tunnel credentials: `~/.cloudflared/` (do not share)
- DNS: `api.cloudagi.org` CNAME -> tunnel
- Manages its own connection — no port forwarding or firewall rules needed

## Testing Endpoints

```bash
# Health
curl -s https://api.cloudagi.org/v1/health

# Agent discovery
curl -s https://api.cloudagi.org/.well-known/agent.json

# Create a test order
curl -s -X POST https://api.cloudagi.org/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "contact": "test@example.com",
    "jobType": "gpu",
    "command": ["python", "-c", "print(1+1)"],
    "expectedOutput": "2",
    "inputNotes": "Simple test"
  }'

# List orders (requires admin key header)
curl -s https://api.cloudagi.org/v1/orders \
  -H "x-admin-key: <ADMIN_KEY_FROM_ENV>"
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Health check fails locally | Check if bun is running: `ps aux \| grep bun` |
| Public URL times out | Check tunnel: `ps aux \| grep cloudflared` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` then restart |
| Tunnel auth expired | Run `cloudflared tunnel login` again |
| Orders return "Forbidden" | Include `x-admin-key` header |
