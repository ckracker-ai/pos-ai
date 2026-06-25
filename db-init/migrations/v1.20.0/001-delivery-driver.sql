-- v1.20.0 — Repartidor asignado a venta con delivery

USE `pos-ai-db`;

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'pos-ai-db'
    AND TABLE_NAME = 'sales'
    AND COLUMN_NAME = 'assigned_driver_id'
);

SET @add_col := IF(
  @col_exists = 0,
  'ALTER TABLE `sales`
     ADD COLUMN `assigned_driver_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL
       COMMENT ''Usuario repartidor (rol DELIVERY)'' AFTER `delivery_status`,
     ADD KEY `idx_sales_assigned_driver` (`assigned_driver_id`),
     ADD CONSTRAINT `fk_sales_assigned_driver` FOREIGN KEY (`assigned_driver_id`)
       REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT ''assigned_driver_id already exists'' AS info'
);
PREPARE stmt FROM @add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `roles`
  MODIFY COLUMN `name` enum('ADMIN','AUDITOR','SELLER','COMANDA','DELIVERY') COLLATE utf8mb4_unicode_ci NOT NULL;

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`)
SELECT UUID(), 'DELIVERY', 'Repartidor / envíos a domicilio', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'DELIVERY');

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.20.0-001-delivery-driver', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
