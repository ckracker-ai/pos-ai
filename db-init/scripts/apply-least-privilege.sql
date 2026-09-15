-- Apply on an already-initialized MySQL volume (init scripts will not re-run).
-- Prefer zz-least-privilege.sh inside the container so passwords come from env:
--   docker exec pos-ai-db-mysql bash /docker-entrypoint-initdb.d/zz-least-privilege.sh
--
-- Manual equivalent (replace passwords before running as root).
-- Do not DROP usr_pos_ai / usr_erp if that is still MYSQL_USER / DB_USER.

CREATE USER IF NOT EXISTS 'usr_pos_core'@'%' IDENTIFIED BY 'Usr@12345';
ALTER USER 'usr_pos_core'@'%' IDENTIFIED BY 'Usr@12345';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'usr_pos_core'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `pos-ai-db`.* TO 'usr_pos_core'@'%';

CREATE USER IF NOT EXISTS 'usr_pos_readonly'@'%' IDENTIFIED BY 'UsrRead@12345';
ALTER USER 'usr_pos_readonly'@'%' IDENTIFIED BY 'UsrRead@12345';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'usr_pos_readonly'@'%';
GRANT SELECT ON `pos-ai-db`.* TO 'usr_pos_readonly'@'%';

DROP USER IF EXISTS 'usr_pos_ai'@'%';
DROP USER IF EXISTS 'usr_erp'@'%';

FLUSH PRIVILEGES;
