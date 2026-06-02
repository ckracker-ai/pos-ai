-- v1.7.0 — Perfil transferencia completo por empresa (validación comprobantes WSP)

USE `pos-ai-db`;

ALTER TABLE `empresas`
  ADD COLUMN `transfer_account_type` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'Cuenta vista, corriente, RUT, etc.' AFTER `transfer_bank_name`,
  ADD COLUMN `transfer_holder_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'Titular cuenta destino' AFTER `transfer_account`;

UPDATE `empresas`
SET
  `transfer_bank_name` = COALESCE(`transfer_bank_name`, 'BancoEstado'),
  `transfer_account_type` = COALESCE(`transfer_account_type`, 'Cuenta vista'),
  `transfer_account` = COALESCE(`transfer_account`, '12345678'),
  `transfer_holder_name` = COALESCE(`transfer_holder_name`, 'Empanadas Costa Azul SpA'),
  `transfer_rut` = COALESCE(`transfer_rut`, '76.123.456-7')
WHERE `slug` = 'costa-azul';

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.7.0-004-transfer-profile', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
