-- v1.24.0 — S12: diccionario IA del tenant (encima del pack de rubro).

USE `pos-ai-db`;

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = @db AND table_name = 'empresas' AND column_name = 'ai_glossary') = 0,
  'ALTER TABLE `empresas` ADD COLUMN `ai_glossary` json DEFAULT NULL AFTER `rubro_negocio`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.24.0-001-empresa-ai-glossary', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
