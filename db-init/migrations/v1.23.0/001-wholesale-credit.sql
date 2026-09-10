-- v1.23.0 — S11: clientes mayoristas, tramos de precio y crédito.

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `trade_customers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `credit_used` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_overdue` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trade_customers_empresa` (`empresa_id`,`is_active`),
  CONSTRAINT `fk_trade_customers_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_price_tiers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_qty` decimal(12,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_price_tiers_product` (`empresa_id`,`product_id`,`min_qty`),
  CONSTRAINT `fk_price_tiers_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_price_tiers_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'sales' AND column_name = 'trade_customer_id') = 0,
  'ALTER TABLE `sales` ADD COLUMN `trade_customer_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `seller_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'sales' AND column_name = 'on_credit') = 0,
  'ALTER TABLE `sales` ADD COLUMN `on_credit` tinyint(1) NOT NULL DEFAULT 0 AFTER `trade_customer_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'sales' AND index_name = 'idx_sales_trade_customer') = 0,
  'ALTER TABLE `sales` ADD KEY `idx_sales_trade_customer` (`trade_customer_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = @db AND table_name = 'sales' AND constraint_name = 'fk_sales_trade_customer') = 0,
  'ALTER TABLE `sales` ADD CONSTRAINT `fk_sales_trade_customer` FOREIGN KEY (`trade_customer_id`) REFERENCES `trade_customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.23.0-001-wholesale-credit', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
