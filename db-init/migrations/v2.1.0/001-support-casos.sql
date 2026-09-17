-- v2.1.0 — S16.1: casos de soporte SaaS (inbox plataforma).

USE `pos-ai-db`;

CREATE TABLE IF NOT EXISTS `support_casos` (
  `id` CHAR(36) NOT NULL,
  `empresa_id` CHAR(36) NOT NULL,
  `status` ENUM('ABIERTO','ESPERANDO_CLIENTE','ESPERANDO_SOPORTE','RESUELTO') NOT NULL DEFAULT 'ABIERTO',
  `origin` ENUM('TENANT','PLATFORM','SIGNAL','COPILOT') NOT NULL DEFAULT 'TENANT',
  `severity` ENUM('BAJA','MEDIA','ALTA') NOT NULL DEFAULT 'MEDIA',
  `subject` VARCHAR(200) NOT NULL,
  `created_by_kind` ENUM('USER','PLATFORM','SYSTEM') NOT NULL DEFAULT 'USER',
  `created_by_id` CHAR(36) DEFAULT NULL,
  `last_message_at` DATETIME NOT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_casos_empresa_status` (`empresa_id`, `status`),
  KEY `idx_support_casos_last_message` (`last_message_at`),
  CONSTRAINT `fk_support_casos_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_mensajes` (
  `id` CHAR(36) NOT NULL,
  `caso_id` CHAR(36) NOT NULL,
  `author_kind` ENUM('USER','PLATFORM','SYSTEM','COPILOT') NOT NULL,
  `author_id` CHAR(36) DEFAULT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_mensajes_caso` (`caso_id`, `created_at`),
  CONSTRAINT `fk_support_mensajes_caso` FOREIGN KEY (`caso_id`) REFERENCES `support_casos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v2.1.0-001-support-casos', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = `applied_at`;
