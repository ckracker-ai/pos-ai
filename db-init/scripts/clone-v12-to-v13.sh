#!/usr/bin/env bash
# Copia datos de erp_core_db a erp_core_db_v13 para probar migraciones.
set -euo pipefail

CONTAINER="${MYSQL_CONTAINER:-erp_db_mysql}"
ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-S3d4f5g6_}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> Clonando erp_core_db -> erp_core_db_v13 en: ${CONTAINER}"

docker exec -i "${CONTAINER}" mysql -uroot -p"${ROOT_PASSWORD}" \
  < "${SCRIPT_DIR}/clone-v12-to-v13.sql"

echo ">> Clon completado."
