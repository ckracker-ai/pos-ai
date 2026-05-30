-- ERP Core v1.3 — multi-tenant (shared DB + empresa_id).
-- Invocado desde 02-init-v13-sandbox.sql y provision-v13-sandbox.sql.

DROP TABLE IF EXISTS `schema_migrations`;

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `sale_details`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `shrinkages`;
DROP TABLE IF EXISTS `inventory_stock`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `empresas`;

CREATE TABLE `schema_migrations` (
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` datetime NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `empresas` (
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
  `estado` enum('ACTIVO','SUSPENDIDO','PENDIENTE_ONBOARDING') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE_ONBOARDING',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresas_rut` (`rut_numero`,`rut_dv`),
  UNIQUE KEY `uq_empresas_slug` (`slug`),
  KEY `idx_empresas_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` enum('ADMIN','AUDITOR','SELLER','COMANDA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `branches` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_branches_empresa_active` (`empresa_id`,`is_active`),
  CONSTRAINT `fk_branches_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_empresa_name` (`empresa_id`,`name`),
  KEY `idx_categories_empresa` (`empresa_id`),
  CONSTRAINT `fk_categories_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `suppliers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_empresa` (`empresa_id`),
  CONSTRAINT `fk_suppliers_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unit',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_empresa_sku` (`empresa_id`,`sku`),
  KEY `idx_products_empresa_active` (`empresa_id`,`is_active`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_supplier` (`supplier_id`),
  CONSTRAINT `fk_products_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_empresa_email` (`empresa_id`,`email`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_empresa_branch_active` (`empresa_id`,`branch_id`,`is_active`),
  CONSTRAINT `fk_users_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_stock` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `min_stock` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_empresa_product_branch` (`empresa_id`,`product_id`,`branch_id`),
  KEY `idx_inventory_stock_empresa_branch` (`empresa_id`,`branch_id`),
  CONSTRAINT `fk_inventory_stock_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sales` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seller_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('PENDING','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMPLETED',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sales_empresa_branch_created` (`empresa_id`,`branch_id`,`created_at`),
  KEY `idx_sales_seller` (`seller_id`),
  CONSTRAINT `fk_sales_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_details` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sale_details_sale` (`sale_id`),
  KEY `idx_sale_details_product` (`product_id`),
  CONSTRAINT `fk_sale_details_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_details_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shrinkages` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'FK -> users.id (SELLER)',
  `approved_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'FK -> users.id (AUDITOR)',
  `quantity` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `rejection_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_shrinkages_empresa_branch_status` (`empresa_id`,`branch_id`,`status`,`created_at`),
  KEY `idx_shrinkages_product` (`product_id`),
  KEY `idx_shrinkages_reported_by` (`reported_by`),
  KEY `idx_shrinkages_approved_by` (`approved_by`),
  CONSTRAINT `fk_shrinkages_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shrinkages_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shrinkages_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shrinkages_reported_by` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shrinkages_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_empresa_created` (`empresa_id`,`created_at`),
  CONSTRAINT `fk_audit_logs_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER ;;

CREATE TRIGGER `trg_prevent_negative_stock`
BEFORE UPDATE ON `inventory_stock`
FOR EACH ROW
BEGIN
  IF NEW.quantity < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_NEGATIVE_STOCK: quantity cannot be negative';
  END IF;
END;;

CREATE TRIGGER `trg_validate_sale_total`
BEFORE INSERT ON `sales`
FOR EACH ROW
BEGIN
  IF NEW.total < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_SALE_TOTAL: total cannot be negative';
  END IF;
END;;

CREATE TRIGGER `trg_validate_sale_detail`
BEFORE INSERT ON `sale_details`
FOR EACH ROW
BEGIN
  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_DETAIL_QTY: quantity must be greater than zero';
  END IF;
  IF NEW.unit_price < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_DETAIL_PRICE: unit_price cannot be negative';
  END IF;
END;;

CREATE TRIGGER `trg_validate_shrinkage_qty`
BEFORE INSERT ON `shrinkages`
FOR EACH ROW
BEGIN
  IF NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ERR_SHRINKAGE_QTY: quantity must be greater than zero';
  END IF;
END;;

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

INSERT INTO `schema_migrations` (`version`, `applied_at`) VALUES
('v1.3.0-multi-tenant', NOW());
