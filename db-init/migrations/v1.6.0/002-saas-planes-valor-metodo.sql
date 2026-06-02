-- v1.6.0 — valor, metodo_pago en saas_planes (reemplaza precio_referencia_clp).

USE `pos-ai-db`;

SET @has_valor = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'saas_planes'
    AND COLUMN_NAME = 'valor'
);

SET @sql_valor = IF(
  @has_valor = 0,
  'ALTER TABLE `saas_planes`
    ADD COLUMN `valor` int NOT NULL DEFAULT 0 COMMENT ''Precio mensual CLP'' AFTER `descripcion`,
    ADD COLUMN `metodo_pago` enum(''TRANSFERENCIA'',''WEBPAY'',''MERCADO_PAGO'',''FLOW'',''MIXTO'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''TRANSFERENCIA'' AFTER `valor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_valor;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_precio = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'saas_planes'
    AND COLUMN_NAME = 'precio_referencia_clp'
);

SET @sql_migrate_precio = IF(
  @has_precio > 0,
  'UPDATE `saas_planes` SET `valor` = COALESCE(`precio_referencia_clp`, `valor`) WHERE `valor` = 0 OR `valor` IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_migrate_precio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `saas_planes` SET `metodo_pago` = 'TRANSFERENCIA' WHERE `codigo` IN ('BASICO', 'ESTANDAR');
UPDATE `saas_planes` SET `metodo_pago` = 'MIXTO' WHERE `codigo` = 'FULL';

SET @sql_drop_precio = IF(
  @has_precio > 0,
  'ALTER TABLE `saas_planes` DROP COLUMN `precio_referencia_clp`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_drop_precio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.6.0-002-saas-planes-valor-metodo', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
