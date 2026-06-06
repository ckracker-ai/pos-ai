-- v1.10.0 — S5 Pasarela: bitácora idempotente de webhooks de pago

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SAAS_SUB | SALE_WSP',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'APPROVED | REJECTED | PENDING',
  `amount` int NOT NULL DEFAULT 0,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CLP',
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_code` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_json` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_events_provider_external` (`provider`, `external_id`),
  KEY `idx_payment_events_empresa` (`empresa_id`),
  KEY `idx_payment_events_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.10.0-001-payment-events', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
