-- v1.8.0 — ampliar campos transferencia para payload cifrado

USE `pos-ai-db`;

ALTER TABLE `empresas`
  MODIFY COLUMN `transfer_bank_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY COLUMN `transfer_account_type` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY COLUMN `transfer_account` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY COLUMN `transfer_holder_name` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY COLUMN `transfer_rut` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.8.0-003-transfer-fields-encrypted-size', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();

