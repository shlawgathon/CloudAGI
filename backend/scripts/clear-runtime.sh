#!/usr/bin/env bash
set -euo pipefail

ports=(3000 3001 3002)

echo "Clearing existing Cloudflare tunnels"
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true

for port in "${ports[@]}"; do
  pids="$(lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    continue
  fi

  echo "Clearing listeners on :${port}"
  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    kill -9 "${pid}" 2>/dev/null || true
  done <<< "${pids}"
done

echo "Runtime ports are clear"
