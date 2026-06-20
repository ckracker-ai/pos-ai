-- v1.19.0 — Menú virtual gastronómico por sucursal (QR WSP)

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `virtual_menus` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Menú',
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `public_slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_virtual_menu_branch` (`branch_id`),
  UNIQUE KEY `uq_virtual_menu_slug` (`public_slug`),
  KEY `idx_virtual_menu_empresa` (`empresa_id`),
  CONSTRAINT `fk_virtual_menu_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_virtual_menu_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `virtual_menu_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `catalog_category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vmc_menu` (`menu_id`),
  KEY `idx_vmc_catalog_cat` (`catalog_category_id`),
  CONSTRAINT `fk_vmc_menu` FOREIGN KEY (`menu_id`) REFERENCES `virtual_menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vmc_catalog_category` FOREIGN KEY (`catalog_category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `virtual_menu_products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_override` decimal(10,2) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vmp_category_product` (`menu_category_id`, `product_id`),
  KEY `idx_vmp_product` (`product_id`),
  CONSTRAINT `fk_vmp_category` FOREIGN KEY (`menu_category_id`) REFERENCES `virtual_menu_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vmp_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.19.0-001-virtual-menu', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
