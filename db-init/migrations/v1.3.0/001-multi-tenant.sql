-- Migración v1.2 -> v1.3 multi-tenant
-- Idempotente: aborta si ya fue aplicada (schema_migrations).
--
-- Sandbox v1.3:
--   .\db-init\scripts\run-migration-v13.ps1 erp_core_db_v13
--
-- Producción (backup obligatorio antes):
--   mysqldump -u root -p erp_core_db > backup_pre_v13.sql
--   .\db-init\scripts\run-migration-v13.ps1 erp_core_db

SET @migration_version := 'v1.3.0-multi-tenant';
SET @demo_empresa_id := '11111111-1111-4111-8111-111111111111';

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` datetime NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @already_applied := (
  SELECT COUNT(*) FROM `schema_migrations` WHERE `version` = @migration_version
);

SET @skip := IF(@already_applied > 0, 1, 0);

-- ---------------------------------------------------------------------------
-- 1. Tabla empresas + empresa legacy
-- ---------------------------------------------------------------------------
SET @sql := IF(@skip = 0,
  'CREATE TABLE IF NOT EXISTS `empresas` (
    `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    `rut_empresa` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `rut_numero` int NOT NULL,
    `rut_dv` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
    `razon_social` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `nombre_fantasia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `giro_sii` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `direccion_comercial` text COLLATE utf8mb4_unicode_ci,
    `correo_facturacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `url_logo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
    `estado` enum(''ACTIVO'',''SUSPENDIDO'',''PENDIENTE_ONBOARDING'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''PENDIENTE_ONBOARDING'',
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_empresas_rut` (`rut_numero`,`rut_dv`),
    UNIQUE KEY `uq_empresas_slug` (`slug`),
    KEY `idx_empresas_estado` (`estado`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0,
  CONCAT('INSERT INTO `empresas` (
    `id`, `rut_empresa`, `rut_numero`, `rut_dv`, `razon_social`, `nombre_fantasia`,
    `giro_sii`, `direccion_comercial`, `correo_facturacion`, `url_logo`, `slug`, `estado`,
    `created_at`, `updated_at`
  ) SELECT ''', @demo_empresa_id, ''', ''76.123.456-7'', 76123456, ''7'',
    ''Empanadas Costa Azul SpA'', ''Costa Azul'',
    ''Elaboración de productos de panadería y pastelería'',
    ''Por definir'', ''facturacion@empanadascostaazul.cl'', NULL, ''costa-azul'', ''ACTIVO'',
    NOW(), NOW()
  FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `empresas` WHERE `id` = ''', @demo_empresa_id, ''')'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 2. Columnas empresa_id (nullable -> backfill -> NOT NULL)
-- ---------------------------------------------------------------------------
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'branches' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `branches` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0, CONCAT('UPDATE `branches` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0, 'ALTER TABLE `branches` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- categories
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `categories` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `categories` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `categories` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- suppliers
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'suppliers' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `suppliers` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `suppliers` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `suppliers` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `products` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `products` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `products` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `users` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `users` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `users` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inventory_stock
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'inventory_stock' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `inventory_stock` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `inventory_stock` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `inventory_stock` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sales
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `sales` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `sales` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `sales` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- shrinkages
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'shrinkages' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `shrinkages` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `shrinkages` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `shrinkages` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audit_logs
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'empresa_id') = 0,
  'ALTER TABLE `audit_logs` ADD COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `id`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, CONCAT('UPDATE `audit_logs` SET `empresa_id` = ''', @demo_empresa_id, ''' WHERE `empresa_id` IS NULL'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@skip = 0, 'ALTER TABLE `audit_logs` MODIFY COLUMN `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3. Índices UNIQUE compuestos (drop globales v1.2)
-- ---------------------------------------------------------------------------
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_user_email') > 0,
  'ALTER TABLE `users` DROP INDEX `uq_user_email`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'uq_users_empresa_email') = 0,
  'ALTER TABLE `users` ADD UNIQUE KEY `uq_users_empresa_email` (`empresa_id`,`email`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'categories' AND index_name = 'uq_category_name') > 0,
  'ALTER TABLE `categories` DROP INDEX `uq_category_name`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'categories' AND index_name = 'uq_categories_empresa_name') = 0,
  'ALTER TABLE `categories` ADD UNIQUE KEY `uq_categories_empresa_name` (`empresa_id`,`name`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'products' AND index_name = 'uq_product_sku') > 0,
  'ALTER TABLE `products` DROP INDEX `uq_product_sku`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'products' AND index_name = 'uq_products_empresa_sku') = 0,
  'ALTER TABLE `products` ADD UNIQUE KEY `uq_products_empresa_sku` (`empresa_id`,`sku`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'inventory_stock' AND index_name = 'uq_stock_product_branch') > 0,
  'ALTER TABLE `inventory_stock` DROP INDEX `uq_stock_product_branch`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'inventory_stock' AND index_name = 'uq_stock_empresa_product_branch') = 0,
  'ALTER TABLE `inventory_stock` ADD UNIQUE KEY `uq_stock_empresa_product_branch` (`empresa_id`,`product_id`,`branch_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 4. Foreign keys tenant
-- ---------------------------------------------------------------------------
SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'branches' AND constraint_name = 'fk_branches_empresa') = 0,
  CONCAT('ALTER TABLE `branches` ADD CONSTRAINT `fk_branches_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD KEY `idx_branches_empresa_active` (`empresa_id`,`is_active`)'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'categories' AND constraint_name = 'fk_categories_empresa') = 0,
  'ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_categories_empresa` (`empresa_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'suppliers' AND constraint_name = 'fk_suppliers_empresa') = 0,
  'ALTER TABLE `suppliers` ADD CONSTRAINT `fk_suppliers_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_suppliers_empresa` (`empresa_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'products' AND constraint_name = 'fk_products_empresa') = 0,
  'ALTER TABLE `products` ADD CONSTRAINT `fk_products_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_products_empresa_active` (`empresa_id`,`is_active`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'users' AND constraint_name = 'fk_users_empresa') = 0,
  'ALTER TABLE `users` ADD CONSTRAINT `fk_users_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'users' AND constraint_name = 'fk_users_branch') = 0,
  'ALTER TABLE `users` ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_users_empresa_branch_active` (`empresa_id`,`branch_id`,`is_active`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'inventory_stock' AND constraint_name = 'fk_inventory_stock_empresa') = 0,
  'ALTER TABLE `inventory_stock` ADD CONSTRAINT `fk_inventory_stock_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_inventory_stock_empresa_branch` (`empresa_id`,`branch_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'sales' AND index_name = 'idx_sales_branch') > 0,
  'ALTER TABLE `sales` DROP INDEX `idx_sales_branch`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'sales' AND constraint_name = 'fk_sales_empresa') = 0,
  'ALTER TABLE `sales` ADD CONSTRAINT `fk_sales_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_sales_empresa_branch_created` (`empresa_id`,`branch_id`,`created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'shrinkages' AND index_name = 'idx_shrinkages_branch') > 0,
  'ALTER TABLE `shrinkages` DROP INDEX `idx_shrinkages_branch`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'shrinkages' AND constraint_name = 'fk_shrinkages_empresa') = 0,
  'ALTER TABLE `shrinkages` ADD CONSTRAINT `fk_shrinkages_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_shrinkages_empresa_branch_status` (`empresa_id`,`branch_id`,`status`,`created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@skip = 0 AND (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND constraint_name = 'fk_audit_logs_empresa') = 0,
  'ALTER TABLE `audit_logs` ADD CONSTRAINT `fk_audit_logs_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD KEY `idx_audit_logs_empresa_created` (`empresa_id`,`created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 5. Triggers de coherencia tenant (v1.3)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_users_branch_empresa`;
DROP TRIGGER IF EXISTS `trg_users_branch_empresa_upd`;
DROP TRIGGER IF EXISTS `trg_inventory_stock_tenant`;
DROP TRIGGER IF EXISTS `trg_inventory_stock_tenant_upd`;
DROP TRIGGER IF EXISTS `trg_sales_tenant`;
DROP TRIGGER IF EXISTS `trg_sales_tenant_upd`;
DROP TRIGGER IF EXISTS `trg_shrinkages_tenant`;
DROP TRIGGER IF EXISTS `trg_shrinkages_tenant_upd`;

DELIMITER ;;

CREATE TRIGGER `trg_users_branch_empresa`
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: user.empresa_id must match branch.empresa_id';
  END IF;
END;;

CREATE TRIGGER `trg_users_branch_empresa_upd`
BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: user.empresa_id must match branch.empresa_id';
  END IF;
END;;

CREATE TRIGGER `trg_inventory_stock_tenant`
BEFORE INSERT ON `inventory_stock`
FOR EACH ROW
BEGIN
  DECLARE product_empresa_id char(36);
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO product_empresa_id FROM `products` WHERE `id` = NEW.product_id LIMIT 1;
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF product_empresa_id IS NULL OR product_empresa_id <> NEW.empresa_id
     OR branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: stock empresa_id must match product and branch';
  END IF;
END;;

CREATE TRIGGER `trg_inventory_stock_tenant_upd`
BEFORE UPDATE ON `inventory_stock`
FOR EACH ROW
BEGIN
  DECLARE product_empresa_id char(36);
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO product_empresa_id FROM `products` WHERE `id` = NEW.product_id LIMIT 1;
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF product_empresa_id IS NULL OR product_empresa_id <> NEW.empresa_id
     OR branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: stock empresa_id must match product and branch';
  END IF;
END;;

CREATE TRIGGER `trg_sales_tenant`
BEFORE INSERT ON `sales`
FOR EACH ROW
BEGIN
  DECLARE branch_empresa_id char(36);
  DECLARE seller_empresa_id char(36);
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  SELECT `empresa_id` INTO seller_empresa_id FROM `users` WHERE `id` = NEW.seller_id LIMIT 1;
  IF branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id
     OR seller_empresa_id IS NULL OR seller_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: sale empresa_id must match branch and seller';
  END IF;
END;;

CREATE TRIGGER `trg_sales_tenant_upd`
BEFORE UPDATE ON `sales`
FOR EACH ROW
BEGIN
  DECLARE branch_empresa_id char(36);
  DECLARE seller_empresa_id char(36);
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  SELECT `empresa_id` INTO seller_empresa_id FROM `users` WHERE `id` = NEW.seller_id LIMIT 1;
  IF branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id
     OR seller_empresa_id IS NULL OR seller_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: sale empresa_id must match branch and seller';
  END IF;
END;;

CREATE TRIGGER `trg_shrinkages_tenant`
BEFORE INSERT ON `shrinkages`
FOR EACH ROW
BEGIN
  DECLARE product_empresa_id char(36);
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO product_empresa_id FROM `products` WHERE `id` = NEW.product_id LIMIT 1;
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF product_empresa_id IS NULL OR product_empresa_id <> NEW.empresa_id
     OR branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: shrinkage empresa_id must match product and branch';
  END IF;
END;;

CREATE TRIGGER `trg_shrinkages_tenant_upd`
BEFORE UPDATE ON `shrinkages`
FOR EACH ROW
BEGIN
  DECLARE product_empresa_id char(36);
  DECLARE branch_empresa_id char(36);
  SELECT `empresa_id` INTO product_empresa_id FROM `products` WHERE `id` = NEW.product_id LIMIT 1;
  SELECT `empresa_id` INTO branch_empresa_id FROM `branches` WHERE `id` = NEW.branch_id LIMIT 1;
  IF product_empresa_id IS NULL OR product_empresa_id <> NEW.empresa_id
     OR branch_empresa_id IS NULL OR branch_empresa_id <> NEW.empresa_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_TENANT: shrinkage empresa_id must match product and branch';
  END IF;
END;;

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 6. Registrar migración
-- ---------------------------------------------------------------------------
INSERT INTO `schema_migrations` (`version`, `applied_at`)
SELECT @migration_version, NOW()
FROM DUAL
WHERE @skip = 0
  AND NOT EXISTS (SELECT 1 FROM `schema_migrations` WHERE `version` = @migration_version);

SELECT IF(@skip = 0, 'v1.3.0 multi-tenant applied', 'v1.3.0 multi-tenant skipped (already applied or fresh v1.3)') AS status;
