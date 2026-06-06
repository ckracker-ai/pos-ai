-- v1.9.0 — Árbol demo Costa Azul: subcategoría bajo Empanadas + familias de ejemplo
USE `pos-ai-db`;

SET @empresa_id := '11111111-1111-4111-8111-111111111111';
SET @cat_root := 'c0a00000-0000-4000-8000-000000000001';
SET @cat_sub := 'c0a00000-0000-4000-8000-000000000002';

-- Subcategoría para productos demo existentes
INSERT INTO `categories` (`id`, `empresa_id`, `parent_id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT @cat_sub, @empresa_id, @cat_root, 'Empanadas clásicas', 'empanadas-clasicas', 'Subcategoría demo WSP', 1, NOW(), NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `categories` WHERE `id` = @cat_root)
  AND NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = @cat_sub);

UPDATE `categories`
SET `slug` = 'empanadas', `parent_id` = NULL
WHERE `id` = @cat_root AND (`slug` IS NULL OR `slug` = '' OR `slug` LIKE 'categoria-%');

UPDATE `products`
SET `category_id` = @cat_sub
WHERE `empresa_id` = @empresa_id
  AND `category_id` = @cat_root
  AND EXISTS (SELECT 1 FROM `categories` WHERE `id` = @cat_sub);

-- Familias de ejemplo (sin productos aún)
INSERT INTO `categories` (`id`, `empresa_id`, `parent_id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT 'c0a00000-0000-4000-8000-000000000010', @empresa_id, NULL, 'Pizzas', 'pizzas', 'Demo jerárquico', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = 'c0a00000-0000-4000-8000-000000000010');

INSERT INTO `categories` (`id`, `empresa_id`, `parent_id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT 'c0a00000-0000-4000-8000-000000000011', @empresa_id, 'c0a00000-0000-4000-8000-000000000010', 'Pizzas Tradicionales', 'pizzas-tradicionales', 'Demo', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = 'c0a00000-0000-4000-8000-000000000011');

INSERT INTO `categories` (`id`, `empresa_id`, `parent_id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT 'c0a00000-0000-4000-8000-000000000012', @empresa_id, NULL, 'Bebidas', 'bebidas', 'Demo jerárquico', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = 'c0a00000-0000-4000-8000-000000000012');

INSERT INTO `categories` (`id`, `empresa_id`, `parent_id`, `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT 'c0a00000-0000-4000-8000-000000000013', @empresa_id, 'c0a00000-0000-4000-8000-000000000012', 'Bebidas analcohólicas', 'bebidas-analcoholicas', 'Demo', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `id` = 'c0a00000-0000-4000-8000-000000000013');

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.9.0-002-demo-category-tree-costa-azul', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
