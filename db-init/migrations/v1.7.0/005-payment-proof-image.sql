-- v1.7.0 — Imagen comprobante en POS (referencia visual al validar)

USE `pos-ai-db`;

ALTER TABLE `assistant_payment_proofs`
  ADD COLUMN `proof_image_mime` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `vision_summary`,
  ADD COLUMN `proof_image_data` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'Base64 sin prefijo data-URL' AFTER `proof_image_mime`;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.7.0-005-payment-proof-image', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
