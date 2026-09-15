#!/bin/bash
# Least privilege for POS-AI app users. Runs on first MySQL volume init.
# Existing volumes: docker exec pos-ai-db-mysql bash /docker-entrypoint-initdb.d/zz-least-privilege.sh
set -euo pipefail

APP_USER="${MYSQL_USER:-usr_pos_core}"
APP_PASS="${MYSQL_PASSWORD:-Usr@12345}"
RO_USER="${MYSQL_READONLY_USER:-usr_pos_readonly}"
RO_PASS="${MYSQL_READONLY_PASSWORD:-UsrRead@12345}"
DB_NAME="${MYSQL_DATABASE:-pos-ai-db}"
ROOT_PASS="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

APP_USER_SQL=$(sql_escape "$APP_USER")
APP_PASS_SQL=$(sql_escape "$APP_PASS")
RO_USER_SQL=$(sql_escape "$RO_USER")
RO_PASS_SQL=$(sql_escape "$RO_PASS")
DB_NAME_SQL=$(sql_escape "$DB_NAME")

DROP_LEGACY=""
if [ "$APP_USER" != "usr_pos_ai" ]; then
  DROP_LEGACY="${DROP_LEGACY}DROP USER IF EXISTS 'usr_pos_ai'@'%';
"
fi
if [ "$APP_USER" != "usr_erp" ]; then
  DROP_LEGACY="${DROP_LEGACY}DROP USER IF EXISTS 'usr_erp'@'%';
"
fi

export MYSQL_PWD="${ROOT_PASS}"
mysql --protocol=socket -uroot <<EOSQL
CREATE USER IF NOT EXISTS '${APP_USER_SQL}'@'%' IDENTIFIED BY '${APP_PASS_SQL}';
ALTER USER '${APP_USER_SQL}'@'%' IDENTIFIED BY '${APP_PASS_SQL}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${APP_USER_SQL}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${DB_NAME_SQL}\`.* TO '${APP_USER_SQL}'@'%';

CREATE USER IF NOT EXISTS '${RO_USER_SQL}'@'%' IDENTIFIED BY '${RO_PASS_SQL}';
ALTER USER '${RO_USER_SQL}'@'%' IDENTIFIED BY '${RO_PASS_SQL}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${RO_USER_SQL}'@'%';
GRANT SELECT ON \`${DB_NAME_SQL}\`.* TO '${RO_USER_SQL}'@'%';

${DROP_LEGACY}
FLUSH PRIVILEGES;
EOSQL
unset MYSQL_PWD
