#!/bin/sh
set -eu

if ! command -v envsubst >/dev/null 2>&1; then
  apk add --no-cache gettext >/dev/null
fi

APP_DOMAIN="${APP_DOMAIN:-app.localhost}"
API_DOMAIN="${API_DOMAIN:-api.localhost}"
FRONTEND_UPSTREAM="${FRONTEND_UPSTREAM:-pos-frontend:80}"
BFF_UPSTREAM="${BFF_UPSTREAM:-pos-api-bff:2020}"
SSL_MODE="${SSL_MODE:-auto}"

export APP_DOMAIN API_DOMAIN FRONTEND_UPSTREAM BFF_UPSTREAM

CERT_APP="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
CERT_API="/etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem"

# Despliegue por IP: API_DOMAIN=api-unused.local → solo cert de APP_DOMAIN basta.
api_ssl_optional() {
  case "$API_DOMAIN" in
    "" | "$APP_DOMAIN" | *unused* | *.localhost) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_ssl_mode() {
  if [ "$SSL_MODE" = "on" ]; then
    echo "on"
    return
  fi
  if [ "$SSL_MODE" = "off" ]; then
    echo "off"
    return
  fi
  if [ ! -f "$CERT_APP" ]; then
    echo "off"
    return
  fi
  if api_ssl_optional || [ -f "$CERT_API" ]; then
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
  if api_ssl_optional; then
    echo "[nginx] API_DOMAIN opcional ($API_DOMAIN) — solo vhost app en HTTPS"
    envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
      < /etc/nginx/templates/api.http.conf.template > /etc/nginx/conf.d/api.conf
  else
    envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
      < /etc/nginx/templates/api.https.conf.template > /etc/nginx/conf.d/api.conf
  fi
else
  echo "[nginx] Modo HTTP (sin certificados). Coloca certs en nginx/certs o usa SSL_MODE=auto"
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/app.http.conf.template > /etc/nginx/conf.d/app.conf
  envsubst '${APP_DOMAIN} ${API_DOMAIN} ${FRONTEND_UPSTREAM} ${BFF_UPSTREAM}' \
    < /etc/nginx/templates/api.http.conf.template > /etc/nginx/conf.d/api.conf
fi

nginx -t
exec nginx -g 'daemon off;'
