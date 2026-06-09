-- v1.17.0 — Permitir mismo nombre de subcategoría bajo distintas categorías padre
-- (ej. «Carne» bajo Hamburguesas y bajo Sandwich).

SET @db = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'categories' AND index_name = 'uq_categories_empresa_name') > 0,
  'ALTER TABLE `categories` DROP INDEX `uq_categories_empresa_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 'categories' AND index_name = 'uq_categories_empresa_parent_name') = 0,
  'ALTER TABLE `categories` ADD UNIQUE KEY `uq_categories_empresa_parent_name` (`empresa_id`, `parent_id`, `name`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.17.0-001-category-name-per-parent', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
