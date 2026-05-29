#!/usr/bin/env bash
# Smoke tests Sprint 4 — ejecutar con el stack levantado
# Uso: ./scripts/qa-smoke.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
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
  curl -sf -X POST "$BASE_URL/api/auth/login" \
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
echo "=== SVM QA Smoke (Sprint 4) ==="
echo "BFF: $BASE_URL | Frontend: $FRONTEND_URL"
echo ""

run "BFF health (/api/health)" bash -c \
  "curl -sf '$BASE_URL/api/health' | grep -q '\"status\":\"ok\"'"

run "Frontend responde (HTTP 200)" bash -c \
  "curl -sf -o /dev/null -w '%{http_code}' '$FRONTEND_URL' | grep -q '^200$'"

ADMIN_JSON=""
run "Login ADMIN" bash -c "
  ADMIN_JSON=\$(login '$ADMIN_EMAIL' '$ADMIN_PASSWORD')
  echo \"\$ADMIN_JSON\" | grep -q '\"success\":true'
"

COMANDA_JSON=""
run "Login COMANDA" bash -c "
  COMANDA_JSON=\$(login '$COMANDA_EMAIL' '$COMANDA_PASSWORD')
  echo \"\$COMANDA_JSON\" | grep -q '\"success\":true'
  echo \"\$COMANDA_JSON\" | grep -q 'branchId'
"

if [[ "$FAILED" -eq 0 ]]; then
  ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  COMANDA_JSON=$(login "$COMANDA_EMAIL" "$COMANDA_PASSWORD")
  COMANDA_TOKEN=$(echo "$COMANDA_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  COMANDA_BRANCH=$(echo "$COMANDA_JSON" | sed -n 's/.*"branchId":"\([^"]*\)".*/\1/p')

  run "ADMIN — listar categorías" bash -c \
    "api_get '$ADMIN_TOKEN' '/api/catalog/categories' | grep -q '\"success\":true'"

  run "ADMIN — listar usuarios" bash -c \
    "api_get '$ADMIN_TOKEN' '/api/auth/users' | grep -q '\"success\":true'"

  run "COMANDA — listar ventas/comandas" bash -c \
    "api_get '$COMANDA_TOKEN' '/api/sales/sales' '$COMANDA_BRANCH' | grep -q '\"success\":true'"

  run "Soft delete + restore categoría (ciclo QA)" bash -c "
    suffix=\$(date +%Y%m%d%H%M%S)
    created=\$(curl -sf -X POST '$BASE_URL/api/catalog/categories' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $BRANCH_ID' \
      -d \"{\\\"name\\\":\\\"QA-Smoke-\$suffix\\\",\\\"description\\\":\\\"auto\\\"}\")
    id=\$(echo \"\$created\" | sed -n 's/.*\"id\":\"\\([^\"]*\\)\".*/\\1/p' | head -1)
    test -n \"\$id\"
    curl -sf -X PATCH '$BASE_URL/api/catalog/categories/'\"\$id\" \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $BRANCH_ID' \
      -d '{\"isActive\":false}' | grep -q '\"success\":true'
    curl -sf -X POST '$BASE_URL/api/catalog/categories/'\"\$id\"'/restore' \
      -H 'Content-Type: application/json' \
      -H \"Authorization: Bearer $ADMIN_TOKEN\" \
      -H 'x-internal-key: $INTERNAL_KEY' \
      -H 'x-branch-id: $BRANCH_ID' \
      -d '{}' | grep -q '\"success\":true'
  "
fi

echo ""
echo "Resultado: $PASSED OK, $FAILED FAIL"
echo ""

[[ "$FAILED" -eq 0 ]] || exit 1
