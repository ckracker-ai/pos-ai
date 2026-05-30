-- Provisiona erp_core_db_v13 con schema v1.2 (solo para probar migración v1.2->v1.3).
-- Flujo: provision-v12-sandbox.ps1 -> clone-v12-to-v13.ps1 -> run-migration-v13.ps1

/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;

CREATE DATABASE IF NOT EXISTS `erp_core_db_v13`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `erp_core_db_v13`.* TO 'usr_erp'@'%';
FLUSH PRIVILEGES;

USE `erp_core_db_v13`;

SOURCE /docker-entrypoint-initdb.d/schema/v1.2-core.sql;
SOURCE /docker-entrypoint-initdb.d/schema/v1.2-seed.sql;
