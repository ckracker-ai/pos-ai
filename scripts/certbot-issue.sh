#!/usr/bin/env bash
# Emite certificados Let's Encrypt con webroot (Nginx debe estar arriba en HTTP).
# Uso (desde la raíz del repo node/):
#   cp .env.prod.example .env.prod   # y editar dominios + CERTBOT_EMAIL
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d nginx
#   ./scripts/certbot-issue.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.prod}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE — copia .env.prod.example"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN requerido}"
API_DOMAIN="${API_DOMAIN:?API_DOMAIN requerido}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:?CERTBOT_EMAIL requerido}"
STAGING_ARGS=""
[[ "${CERTBOT_STAGING:-false}" == "true" ]] && STAGING_ARGS="--staging"

cd "$ROOT"

issue() {
  local domain="$1"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file "$ENV_FILE" \
    --profile certbot run --rm certbot certonly --webroot \
    -w /usr/share/nginx/html \
    --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email \
    $STAGING_ARGS \
    -d "$domain"
}

issue "$APP_DOMAIN"
issue "$API_DOMAIN"

echo "Certificados emitidos. Reinicia Nginx para activar HTTPS:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart nginx"
