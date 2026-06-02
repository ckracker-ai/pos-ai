-- v1.7.0 — Canal asistente (WhatsApp / voz) por empresa.

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `assistant_channel_bindings` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` enum('WHATSAPP','VOZ') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WHATSAPP',
  `external_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Teléfono E.164 sin +',
  `default_branch_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_branch_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assistant_channel` (`channel`,`external_id`),
  KEY `idx_assistant_empresa` (`empresa_id`),
  CONSTRAINT `fk_assistant_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assistant_default_branch` FOREIGN KEY (`default_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assistant_session_branch` FOREIGN KEY (`session_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Demo Costa Azul — plan Estándar para probar WSP (teléfono de prueba)
UPDATE `empresas` SET `plan_id` = 'a0000000-0000-4000-8000-000000000002'
WHERE `slug` = 'costa-azul';

INSERT INTO `assistant_channel_bindings` (
  `id`, `empresa_id`, `channel`, `external_id`, `default_branch_id`,
  `session_branch_id`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'b0000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'WHATSAPP',
  '56900000001',
  '48d4ee18-5349-11f1-a915-00ff541b88ad',
  NULL,
  1,
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `assistant_channel_bindings` WHERE `external_id` = '56900000001'
);

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.7.0-001-assistant-channel', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
