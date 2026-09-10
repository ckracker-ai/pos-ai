-- v1.22.0 — S10: variantes talla/color, pack UoM y medida mm para equivalencias.

USE `pos-ai-db`;

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'barcode') = 0,
  'ALTER TABLE `products` ADD COLUMN `barcode` varchar(64) COLLATE utf8mb4_unicode_ci NULL AFTER `sku`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'parent_product_id') = 0,
  'ALTER TABLE `products` ADD COLUMN `parent_product_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `supplier_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'variant_size') = 0,
  'ALTER TABLE `products` ADD COLUMN `variant_size` varchar(32) COLLATE utf8mb4_unicode_ci NULL AFTER `unit`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'variant_color') = 0,
  'ALTER TABLE `products` ADD COLUMN `variant_color` varchar(32) COLLATE utf8mb4_unicode_ci NULL AFTER `variant_size`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'pack_qty') = 0,
  'ALTER TABLE `products` ADD COLUMN `pack_qty` decimal(12,3) NOT NULL DEFAULT ''1.000'' AFTER `variant_color`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'products' AND column_name = 'size_mm') = 0,
  'ALTER TABLE `products` ADD COLUMN `size_mm` decimal(12,3) NULL AFTER `pack_qty`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @db AND table_name = 'products' AND index_name = 'idx_products_parent') = 0,
  'ALTER TABLE `products` ADD KEY `idx_products_parent` (`empresa_id`, `parent_product_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.22.0-001-product-variants-uom', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
