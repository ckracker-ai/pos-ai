-- v1.17.0 — Webpay producción: sesiones de pago (máquina de estados)

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `payment_sessions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SAAS_SUB | SALE_WSP',
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CLP',
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tbk_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock_reserved` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `committed_at` datetime DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_sessions_provider_external` (`provider`, `external_id`),
  KEY `idx_payment_sessions_status_expires` (`status`, `expires_at`),
  KEY `idx_payment_sessions_empresa` (`empresa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.17.0-001-payment-sessions', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
