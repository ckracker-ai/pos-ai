-- v1.8.0 — División territorial Chile (CUT SUBDERE) + sucursales

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `regions` (
  `codigo_cut` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigla` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_busqueda` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`codigo_cut`),
  KEY `idx_regions_busqueda` (`nombre_busqueda`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `comunas` (
  `codigo_cut` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region_id` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_busqueda` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`codigo_cut`),
  KEY `idx_comunas_region` (`region_id`),
  KEY `idx_comunas_busqueda` (`nombre_busqueda`),
  CONSTRAINT `fk_comunas_region` FOREIGN KEY (`region_id`) REFERENCES `regions` (`codigo_cut`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `branches`
  ADD COLUMN `comuna_id` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `address`,
  ADD COLUMN `codigo_postal` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `comuna_id`,
  ADD KEY `idx_branches_comuna` (`comuna_id`),
  ADD CONSTRAINT `fk_branches_comuna` FOREIGN KEY (`comuna_id`) REFERENCES `comunas` (`codigo_cut`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.8.0-001-territory-cut', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
