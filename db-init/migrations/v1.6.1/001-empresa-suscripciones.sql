-- v1.6.1 — Suscripción SaaS por empresa + admins plataforma en BD

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `platform_users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_platform_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `empresa_suscripciones` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('ACTIVA','GRACIA','VENCIDA','CANCELADA','PILOTO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PILOTO',
  `origen` enum('PLATAFORMA','CHECKOUT','COMERCIAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLATAFORMA',
  `periodo` enum('MENSUAL','ANUAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MENSUAL',
  `inicio_en` datetime NOT NULL,
  `proximo_cobro_en` datetime DEFAULT NULL,
  `vence_en` datetime DEFAULT NULL,
  `grace_hasta` datetime DEFAULT NULL,
  `notas` text COLLATE utf8mb4_unicode_ci,
  `external_customer_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_subscription_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_empresa_suscripcion_empresa` (`empresa_id`),
  KEY `idx_suscripcion_estado_vence` (`estado`,`vence_en`),
  CONSTRAINT `fk_suscripcion_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_suscripcion_plan` FOREIGN KEY (`plan_id`) REFERENCES `saas_planes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `empresa_suscripciones` (
  `id`, `empresa_id`, `plan_id`, `estado`, `origen`, `periodo`,
  `inicio_en`, `proximo_cobro_en`, `vence_en`, `grace_hasta`, `notas`,
  `created_at`, `updated_at`
)
SELECT
  UUID(),
  e.`id`,
  e.`plan_id`,
  IF(e.`estado` = 'ACTIVO', 'PILOTO', 'VENCIDA'),
  'PLATAFORMA',
  'MENSUAL',
  e.`created_at`,
  DATE_ADD(NOW(), INTERVAL 1 MONTH),
  DATE_ADD(NOW(), INTERVAL 90 DAY),
  NULL,
  'Migración v1.6.1 — suscripción inicial',
  NOW(),
  NOW()
FROM `empresas` e
WHERE NOT EXISTS (
  SELECT 1 FROM `empresa_suscripciones` s WHERE s.`empresa_id` = e.`id`
);

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.6.1-001-empresa-suscripciones', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
