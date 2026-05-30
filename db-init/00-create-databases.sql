-- Bootstrap MySQL (solo primer arranque con volumen vacío).
-- erp_core_db: v1.2 estable (producción / stack por defecto).
-- erp_core_db_v13: sandbox v1.3 multi-tenant (no afecta v1.2).

CREATE DATABASE IF NOT EXISTS `erp_core_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `erp_core_db_v13`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `erp_core_db`.* TO 'usr_erp'@'%';
GRANT ALL PRIVILEGES ON `erp_core_db_v13`.* TO 'usr_erp'@'%';
FLUSH PRIVILEGES;
