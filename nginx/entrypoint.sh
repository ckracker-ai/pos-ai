#!/bin/sh
set -eu

if ! command -v envsubst >/dev/null 2>&1; then
  apk add --no-cache gettext >/dev/null
fi

APP_DOMAIN="${APP_DOMAIN:-app.localhost}"
API_DOMAIN="${API_DOMAIN:-api.localhost}"
FRONTEND_UPSTREAM="${FRONTEND_UPSTREAM:-pos-frontend:80}"
BFF_UPSTREAM="${BFF_UPSTREAM:-pos-api-bff:3000}"
SSL_MODE="${SSL_MODE:-auto}"

export APP_DOMAIN API_DOMAIN FRONTEND_UPSTREAM BFF_UPSTREAM

CERT_APP="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
CERT_API="/etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem"

resolve_ssl_mode() {
  if [ "$SSL_MODE" = "on" ]; then
    echo "on"
    return
  fi
  if [ "$SSL_MODE" = "off" ]; then
    echo "off"
    return
  fi
  if [ -f "$CERT_APP" ] && [ -f "$CERT_API" ]; then
    echo "on"
    return
  fi
  echo "off"
}

EFFECTIVE_SSL="$(resolve_ssl_mode)"

rm -f /etc/nginx/conf.d/app.conf /etc/nginx/conf.d/api.conf

if [ "$EFFECTIVE_SSL" = "on" ]; then
  echo "[nginx] SSL activo (certificados encontrados o SSL_MODE=on)"
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/app.https.conf.template > /etc/nginx/conf.d/app.conf
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/api.https.conf.template > /etc/nginx/conf.d/api.conf
else
  echo "[nginx] Modo HTTP (sin certificados). Coloca certs en nginx/certs o usa SSL_MODE=on"
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/app.http.conf.template > /etc/nginx/conf.d/app.conf
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/api.http.conf.template > /etc/nginx/conf.d/api.conf
fi

nginx -t
exec nginx -g 'daemon off;'
