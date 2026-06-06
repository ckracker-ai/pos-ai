-- v1.8.0 — Ventas con datos de delivery

USE `pos-ai-db`;

ALTER TABLE `sales`
  ADD COLUMN `requires_delivery` tinyint(1) NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN `delivery_customer_name` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `requires_delivery`,
  ADD COLUMN `delivery_phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `delivery_customer_name`,
  ADD COLUMN `delivery_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `delivery_phone`,
  ADD COLUMN `delivery_amount` decimal(10,2) NOT NULL DEFAULT '0.00' AFTER `delivery_address`;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.8.0-002-sales-delivery', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();

