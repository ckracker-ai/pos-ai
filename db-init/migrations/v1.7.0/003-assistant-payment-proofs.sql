-- v1.7.0 — Comprobantes transferencia WSP + teléfono admin notificaciones

USE `pos-ai-db`;

ALTER TABLE `empresas`
  ADD COLUMN `assistant_admin_phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'WSP admin validación comprobantes E.164 sin +' AFTER `plan_id`,
  ADD COLUMN `transfer_bank_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `assistant_admin_phone`,
  ADD COLUMN `transfer_account` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `transfer_bank_name`,
  ADD COLUMN `transfer_rut` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `transfer_account`;

ALTER TABLE `users`
  ADD COLUMN `whatsapp_phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'WSP vendedor sucursal — alertas comprobante' AFTER `is_active`;

CREATE TABLE IF NOT EXISTS `assistant_payment_proofs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expected_total` decimal(10,2) NOT NULL,
  `detected_amount` decimal(10,2) DEFAULT NULL,
  `ai_match` tinyint(1) NOT NULL DEFAULT 0,
  `vision_summary` text COLLATE utf8mb4_unicode_ci,
  `status` enum('RECEIVED','NOTIFIED_ADMIN','ADMIN_CONFIRMED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RECEIVED',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proof_empresa_sale` (`empresa_id`,`sale_id`),
  KEY `idx_proof_client` (`empresa_id`,`client_phone`),
  CONSTRAINT `fk_proof_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_proof_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `empresas`
SET `assistant_admin_phone` = '56900000002'
WHERE `slug` = 'costa-azul' AND `assistant_admin_phone` IS NULL;

UPDATE `users` SET `whatsapp_phone` = '56900000002'
WHERE `email` = 'admin@empanadascostaazul.cl' AND `whatsapp_phone` IS NULL;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.7.0-003-assistant-payment-proofs', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
