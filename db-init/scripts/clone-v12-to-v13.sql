-- Copia datos v1.2 -> sandbox v1.3 PARA PROBAR MIGRACIÓN (schema v1.2 en v13).
-- Flujo: provision-v12-sandbox.sql + clone + run-migration-v13.ps1
-- NO usar si v13 ya tiene schema v1.3 (provision-v13-sandbox.ps1).

SET FOREIGN_KEY_CHECKS = 0;

USE `erp_core_db_v13`;

TRUNCATE TABLE `sale_details`;
TRUNCATE TABLE `sales`;
TRUNCATE TABLE `shrinkages`;
TRUNCATE TABLE `inventory_stock`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `products`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `branches`;
TRUNCATE TABLE `roles`;
TRUNCATE TABLE `audit_logs`;

INSERT INTO `erp_core_db_v13`.`roles`
SELECT * FROM `erp_core_db`.`roles`;

INSERT INTO `erp_core_db_v13`.`branches`
SELECT * FROM `erp_core_db`.`branches`;

INSERT INTO `erp_core_db_v13`.`categories`
SELECT * FROM `erp_core_db`.`categories`;

INSERT INTO `erp_core_db_v13`.`suppliers`
SELECT * FROM `erp_core_db`.`suppliers`;

INSERT INTO `erp_core_db_v13`.`products`
SELECT * FROM `erp_core_db`.`products`;

INSERT INTO `erp_core_db_v13`.`users`
SELECT * FROM `erp_core_db`.`users`;

INSERT INTO `erp_core_db_v13`.`inventory_stock`
SELECT * FROM `erp_core_db`.`inventory_stock`;

INSERT INTO `erp_core_db_v13`.`sales`
SELECT * FROM `erp_core_db`.`sales`;

INSERT INTO `erp_core_db_v13`.`sale_details`
SELECT * FROM `erp_core_db`.`sale_details`;

INSERT INTO `erp_core_db_v13`.`shrinkages`
SELECT * FROM `erp_core_db`.`shrinkages`;

INSERT INTO `erp_core_db_v13`.`audit_logs`
SELECT * FROM `erp_core_db`.`audit_logs`;

SET FOREIGN_KEY_CHECKS = 1;
