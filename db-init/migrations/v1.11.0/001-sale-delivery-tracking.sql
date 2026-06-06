-- v1.11.0 — S4 Delivery tracking: estado + timeline auditado

USE `pos-ai-db`;

ALTER TABLE `sales`
  ADD COLUMN `delivery_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT 'CREATED|ASSIGNED|ON_ROUTE|DELIVERED|FAILED' AFTER `delivery_amount`;

CREATE TABLE IF NOT EXISTS `sale_delivery_events` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_delivery_events_sale` (`sale_id`),
  KEY `idx_sale_delivery_events_branch_status` (`branch_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `sales`
SET `delivery_status` = 'CREATED'
WHERE `requires_delivery` = 1 AND (`delivery_status` IS NULL OR `delivery_status` = '');

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.11.0-001-sale-delivery-tracking', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
