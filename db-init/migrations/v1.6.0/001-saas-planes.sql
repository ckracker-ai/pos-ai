-- v1.6.0 — Catálogo de planes SaaS y enlace con empresas (BD existente).

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `saas_planes` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `max_sucursales` int NOT NULL DEFAULT 1,
  `max_usuarios` int NOT NULL DEFAULT 5,
  `precio_referencia_clp` int DEFAULT NULL,
  `features` json NOT NULL,
  `orden` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saas_planes_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `saas_planes` (
  `id`, `codigo`, `nombre`, `descripcion`, `max_sucursales`, `max_usuarios`,
  `precio_referencia_clp`, `features`, `orden`, `is_active`, `created_at`, `updated_at`
) VALUES
(
  'a0000000-0000-4000-8000-000000000001', 'BASICO', 'POS-AI Básico',
  'ERP operativo para PYME: POS, catálogo, comandas, reportes y mantenedores.',
  1, 5, 24990,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', false, 'assistantVoz', false, 'pagosOnline', false),
  1, 1, NOW(), NOW()
),
(
  'a0000000-0000-4000-8000-000000000002', 'ESTANDAR', 'POS-AI Estándar',
  'Básico + asistente IA WhatsApp conectado al inventario y ventas.',
  3, 10, 44990,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', true, 'assistantVoz', false, 'pagosOnline', false),
  2, 1, NOW(), NOW()
),
(
  'a0000000-0000-4000-8000-000000000003', 'FULL', 'POS-AI Full',
  'Estándar + asistente voz/teléfono + cobro con medios de pago online.',
  5, 15, 69990,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', true, 'assistantVoz', true, 'pagosOnline', true),
  3, 1, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
  `nombre` = VALUES(`nombre`),
  `descripcion` = VALUES(`descripcion`),
  `max_sucursales` = VALUES(`max_sucursales`),
  `max_usuarios` = VALUES(`max_usuarios`),
  `precio_referencia_clp` = VALUES(`precio_referencia_clp`),
  `features` = VALUES(`features`),
  `orden` = VALUES(`orden`),
  `updated_at` = NOW();

SET @plan_basico_id = 'a0000000-0000-4000-8000-000000000001';

SET @has_plan_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'empresas'
    AND COLUMN_NAME = 'plan_id'
);

SET @sql_add_col = IF(
  @has_plan_col = 0,
  'ALTER TABLE `empresas` ADD COLUMN `plan_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `estado`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `empresas` SET `plan_id` = @plan_basico_id WHERE `plan_id` IS NULL;

SET @sql_fk = IF(
  @has_plan_col = 0,
  CONCAT(
    'ALTER TABLE `empresas` ',
    'MODIFY COLUMN `plan_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL, ',
    'ADD KEY `idx_empresas_plan` (`plan_id`), ',
    'ADD CONSTRAINT `fk_empresas_plan` FOREIGN KEY (`plan_id`) REFERENCES `saas_planes` (`id`) ',
    'ON UPDATE CASCADE ON DELETE RESTRICT'
  ),
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.6.0-001-saas-planes', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
