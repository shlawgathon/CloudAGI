#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-3001}"

echo "Stopping any existing Cloudflare tunnel"
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true

echo "Starting Cloudflare tunnel for backend :${BACKEND_PORT}"
cd "${ROOT_DIR}"
exec cloudflared tunnel --url "http://localhost:${BACKEND_PORT}"
