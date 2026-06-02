-- v1.7.0 — Catálogo demo Costa Azul (asistente WhatsApp: buscar / pedido)

USE `pos-ai-db`;

SET @empresa_id := '11111111-1111-4111-8111-111111111111';
SET @branch_id := '48d4ee18-5349-11f1-a915-00ff541b88ad';
SET @cat_id := 'c0a00000-0000-4000-8000-000000000001';
SET @sup_id := 's0a00000-0000-4000-8000-000000000001';

INSERT INTO `categories` (`id`, `empresa_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT @cat_id, @empresa_id, 'Empanadas', 'Catálogo demo asistente WSP', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = @cat_id);

INSERT INTO `suppliers` (
  `id`, `empresa_id`, `name`, `contact_email`, `contact_phone`, `address`, `is_active`, `created_at`, `updated_at`
)
SELECT @sup_id, @empresa_id, 'Proveedor demo', NULL, NULL, NULL, 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `suppliers` WHERE `id` = @sup_id);

INSERT INTO `products` (
  `id`, `empresa_id`, `category_id`, `supplier_id`, `sku`, `name`, `description`, `price`, `unit`, `is_active`, `created_at`, `updated_at`
)
SELECT 'd0a00000-0000-4000-8000-000000000001', @empresa_id, @cat_id, @sup_id,
  'EMP-QUESO', 'Empanada de queso', 'Demo WSP', 2500.00, 'unit', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE `id` = 'd0a00000-0000-4000-8000-000000000001');

INSERT INTO `products` (
  `id`, `empresa_id`, `category_id`, `supplier_id`, `sku`, `name`, `description`, `price`, `unit`, `is_active`, `created_at`, `updated_at`
)
SELECT 'd0a00000-0000-4000-8000-000000000002', @empresa_id, @cat_id, @sup_id,
  'EMP-PINO', 'Empanada de pino', 'Demo WSP', 2800.00, 'unit', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE `id` = 'd0a00000-0000-4000-8000-000000000002');

INSERT INTO `products` (
  `id`, `empresa_id`, `category_id`, `supplier_id`, `sku`, `name`, `description`, `price`, `unit`, `is_active`, `created_at`, `updated_at`
)
SELECT 'd0a00000-0000-4000-8000-000000000003', @empresa_id, @cat_id, @sup_id,
  'EMP-NAPO', 'Empanada napolitana', 'Demo WSP', 3000.00, 'unit', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `products` WHERE `id` = 'd0a00000-0000-4000-8000-000000000003');

INSERT INTO `inventory_stock` (
  `id`, `empresa_id`, `product_id`, `branch_id`, `quantity`, `min_stock`, `created_at`, `updated_at`
)
SELECT UUID(), @empresa_id, p.id, @branch_id, 50, 5, NOW(), NOW()
FROM `products` p
WHERE p.empresa_id = @empresa_id
  AND p.id IN (
    'd0a00000-0000-4000-8000-000000000001',
    'd0a00000-0000-4000-8000-000000000002',
    'd0a00000-0000-4000-8000-000000000003'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `inventory_stock` s
    WHERE s.empresa_id = @empresa_id AND s.product_id = p.id AND s.branch_id = @branch_id
  );

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.7.0-002-demo-catalog-costa-azul', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
