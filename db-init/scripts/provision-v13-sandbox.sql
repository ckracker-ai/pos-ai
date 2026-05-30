-- Provisiona erp_core_db_v13 en un MySQL que YA tiene datos v1.2.
-- No modifica erp_core_db. Ejecutar con scripts/provision-v13-sandbox.ps1|.sh

/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;

CREATE DATABASE IF NOT EXISTS `erp_core_db_v13`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `erp_core_db_v13`.* TO 'usr_erp'@'%';
FLUSH PRIVILEGES;

USE `erp_core_db_v13`;

SOURCE /docker-entrypoint-initdb.d/schema/v1.3-core.sql;
SOURCE /docker-entrypoint-initdb.d/schema/v1.3-seed.sql;
