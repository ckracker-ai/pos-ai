#!/usr/bin/env bash
# Certificados autofirmados para probar HTTPS en local/VPS sin dominio real.
# Uso: APP_DOMAIN=app.localhost API_DOMAIN=api.localhost ./scripts/generate-self-signed-certs.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DOMAIN="${APP_DOMAIN:-app.localhost}"
API_DOMAIN="${API_DOMAIN:-api.localhost}"
CERTS_ROOT="$ROOT/nginx/certs/live"

gen() {
  local domain="$1"
  local dir="$CERTS_ROOT/$domain"
  mkdir -p "$dir"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$dir/privkey.pem" \
    -out "$dir/fullchain.pem" \
    -subj "/CN=$domain/O=SVM-ERP/C=CL"
  echo "OK: $dir"
}

command -v openssl >/dev/null || { echo "Instala openssl"; exit 1; }

gen "$APP_DOMAIN"
gen "$API_DOMAIN"

echo ""
echo "Listo. Levanta con SSL_MODE=on o auto:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build"
