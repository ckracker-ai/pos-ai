#!/usr/bin/env bash
# Provisiona erp_core_db_v13 en MySQL existente (volumen ya inicializado con v1.2).
set -euo pipefail

CONTAINER="${MYSQL_CONTAINER:-erp_db_mysql}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-S3d4f5g6_}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> Provisionando sandbox v1.3 en contenedor: ${CONTAINER}"

docker exec -i "${CONTAINER}" mysql -uroot -p"${ROOT_PASSWORD}" \
  < "${SCRIPT_DIR}/provision-v13-sandbox.sql"

echo ">> Listo. Apunta api-core a DB_NAME=erp_core_db_v13"
