#!/usr/bin/env bash
# Smoke tests Sprint 4 — ejecutar con el stack levantado
# Uso: ./scripts/qa-smoke.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:2020}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8010}"
PROXY_PREFIX="${PROXY_PREFIX:-/pos/proxy}"
INTERNAL_KEY="${INTERNAL_KEY:-supersecretkey}"
BRANCH_ID="${BRANCH_ID:-48d4ee18-5349-11f1-a915-00ff541b88ad}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@empanadascostaazul.cl}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-@dmin123_}"
COMANDA_EMAIL="${COMANDA_EMAIL:-comanda@empanadacostaazul.cl}"
COMANDA_PASSWORD="${COMANDA_PASSWORD:-Comanda2026}"

PASSED=0
FAILED=0

pass() { echo "[OK]   $1"; PASSED=$((PASSED + 1)); }
fail() { echo "[FAIL] $1"; [[ -n "${2:-}" ]] && echo "       $2"; FAILED=$((FAILED + 1)); }

run() {
  local name="$1"
  shift
  if "$@"; then pass "$name"; else fail "$name"; fi
}

login() {
  local email="$1" password="$2"
  curl -sf -X POST "$BASE_URL${PROXY_PREFIX}/auth/login" \
    -H "Content-Type: application/json" \
    -H "x-internal-key: $INTERNAL_KEY" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}"
}

api_get() {
  local token="$1" path="$2" branch="${3:-$BRANCH_ID}"
  curl -sf "$BASE_URL$path" \
    -H "Authorization: Bearer $token" \
    -H "x-internal-key: $INTERNAL_KEY" \
    -H "x-branch-id: $branch"
}

echo ""
echo "=== POS-AI QA Smoke (v1.4) ==="
echo "BFF: $BASE_URL | Frontend: $FRONTEND_URL"
echo ""

run "BFF health (${PROXY_PREFIX}/health)" bash -c \
  "curl -sf '$BASE_URL${PROXY_PREFIX}/health' | grep -q '\"status\":\"ok\"'"

run "Frontend responde (HTTP 200)" bash -c \
  "curl -sf -o /dev/null -w '%{http_code}' '$FRONTEND_URL' | grep -q '^200$'"

ADMIN_JSON=""
run "Login ADMIN" bash -c "
  ADMIN_JSON=\$(login '$ADMIN_EMAIL' '$ADMIN_PASSWORD')
  echo \"\$ADMIN_JSON\" | grep -q '\"success\":true'
"

COMANDA_JSON=$(login "$COMANDA_EMAIL" "$COMANDA_PASSWORD" 2>/dev/null || true)
if echo "$COMANDA_JSON" | grep -q '"success":true'; then
  pass "Login COMANDA"
else
  echo "[WARN] COMANDA omitido (usuario no disponible en BD)"
fi

if [[ "$FAILED" -eq 0 ]]; then
  ADMIN_JSON=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
  ADMIN_TOKEN=$(echo "$ADMIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  ADMIN_EMPRESA_ID=$(echo "$ADMIN_JSON" | sed -n 's/.*"empresaId":"\([^"]*\)".*/\1/p' | head -1)
  ADMIN_BRANCH=$(echo "$ADMIN_JSON" | sed -n 's/.*"branchId":"\([^"]*\)".*/\1/p' | head -1)
  ADMIN_BRANCH="${ADMIN_BRANCH:-$BRANCH_ID}"
  COMANDA_TOKEN=""
  COMANDA_BRANCH=""
  if echo "$COMANDA_JSON" | grep -q '"success":true'; then
    COMANDA_TOKEN=$(echo "$COMANDA_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    COMANDA_BRANCH=$(echo "$COMANDA_JSON" | sed -n 's/.*"branchId":"\([^"]*\)".*/\1/p')
  fi

  run "ADMIN — GET /empresas/me (BFF)" bash -c \
    "api_get '$ADMIN_TOKEN' '${PROXY_PREFIX}/empresas/me' '$ADMIN_BRANCH' | grep -q '\"empresa\"'"

  run "ADMIN — listar categorías" bash -c \
    "api_get '$ADMIN_TOKEN' '${PROXY_PREFIX}/catalog/categories' '$ADMIN_BRANCH' | grep -q '\"success\":true'"

  run "ADMIN — listar usuarios" bash -c \
    "api_get '$ADMIN_TOKEN' '${PROXY_PREFIX}/auth/users' '$ADMIN_BRANCH' | grep -q '\"success\":true'"

  run "ADMIN — PATCH /empresas/:id (reversible)" bash -c "
    test -n '$ADMIN_EMPRESA_ID'
    curl -sf -X PATCH '$BASE_URL${PROXY_PREFIX}/empresas/$ADMIN_EMPRESA_ID' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $ADMIN_BRANCH' \
      -d '{\"nombreFantasia\":\"QA Smoke Test\"}' | grep -q '\"success\":true'
    curl -sf -X PATCH '$BASE_URL${PROXY_PREFIX}/empresas/$ADMIN_EMPRESA_ID' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $ADMIN_BRANCH' \
      -d '{\"nombreFantasia\":\"Costa Azul\"}' | grep -q '\"success\":true'
  "

  if [[ -n "$COMANDA_TOKEN" ]]; then
    run "COMANDA — listar ventas/comandas" bash -c \
      "api_get '$COMANDA_TOKEN' '${PROXY_PREFIX}/sales/sales' '$COMANDA_BRANCH' | grep -q '\"success\":true'"
  else
    echo "[WARN] COMANDA ventas omitido"
  fi

  run "Soft delete + restore categoría (ciclo QA)" bash -c "
    suffix=\$(date +%Y%m%d%H%M%S)
    created=\$(curl -sf -X POST '$BASE_URL${PROXY_PREFIX}/catalog/categories' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $ADMIN_BRANCH' \
      -d \"{\\\"name\\\":\\\"QA-Smoke-\$suffix\\\",\\\"description\\\":\\\"auto\\\"}\")
    id=\$(echo \"\$created\" | sed -n 's/.*\"id\":\"\\([^\"]*\\)\".*/\\1/p' | head -1)
    test -n \"\$id\"
    curl -sf -X PATCH '$BASE_URL${PROXY_PREFIX}/catalog/categories/'\"\$id\" \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $ADMIN_BRANCH' \
      -d '{\"isActive\":false}' | grep -q '\"success\":true'
    curl -sf -X POST '$BASE_URL${PROXY_PREFIX}/catalog/categories/'\"\$id\"'/restore' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $ADMIN_BRANCH' \
      -d '{}' | grep -q '\"success\":true'
  "
fi

echo ""
echo "Resultado: $PASSED OK, $FAILED FAIL"
echo ""

[[ "$FAILED" -eq 0 ]] || exit 1
