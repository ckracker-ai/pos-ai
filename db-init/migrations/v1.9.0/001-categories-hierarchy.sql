-- v1.9.0 — Categorías jerárquicas (parent_id + slug)
SET @db := DATABASE();

-- parent_id
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'categories' AND column_name = 'parent_id') = 0,
  'ALTER TABLE `categories` ADD COLUMN `parent_id` char(36) COLLATE utf8mb4_unicode_ci NULL AFTER `empresa_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- slug (nullable first for backfill)
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'categories' AND column_name = 'slug') = 0,
  'ALTER TABLE `categories` ADD COLUMN `slug` varchar(150) COLLATE utf8mb4_unicode_ci NULL AFTER `name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `categories`
SET `slug` = CONCAT('categoria-', LOWER(SUBSTRING(`id`, 1, 8)))
WHERE `slug` IS NULL OR TRIM(`slug`) = '';

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'categories' AND column_name = 'slug' AND is_nullable = 'YES') > 0,
  'ALTER TABLE `categories` MODIFY COLUMN `slug` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FK parent
SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = @db AND table_name = 'categories' AND constraint_name = 'fk_categories_parent') = 0,
  'ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'categories' AND index_name = 'idx_categories_empresa_parent') = 0,
  'ALTER TABLE `categories` ADD KEY `idx_categories_empresa_parent` (`empresa_id`, `parent_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'categories' AND index_name = 'uq_categories_empresa_slug') = 0,
  'ALTER TABLE `categories` ADD UNIQUE KEY `uq_categories_empresa_slug` (`empresa_id`, `slug`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
