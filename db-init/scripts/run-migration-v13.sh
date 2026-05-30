#!/usr/bin/env bash
# Aplica migración v1.3 sobre la base indicada (sandbox o producción).
set -euo pipefail

DB_NAME="${1:-erp_core_db_v13}"
CONTAINER="${MYSQL_CONTAINER:-erp_db_mysql}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-S3d4f5g6_}"
MIGRATION="${2:-$(dirname "$0")/../migrations/v1.3.0/001-multi-tenant.sql}"

echo ">> Migración v1.3 en base: ${DB_NAME}"
echo ">> Archivo: ${MIGRATION}"

docker exec -i "${CONTAINER}" mysql -uroot -p"${ROOT_PASSWORD}" "${DB_NAME}" \
  < "${MIGRATION}"

echo ">> Migración aplicada."
