-- v1.21.0 — Cantidades decimales para granel / peso (stock y líneas de venta).

ALTER TABLE `inventory_stock`
  MODIFY `quantity` decimal(12,3) NOT NULL DEFAULT '0.000';

ALTER TABLE `sale_details`
  MODIFY `quantity` decimal(12,3) NOT NULL;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.21.0-001-decimal-qty', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
