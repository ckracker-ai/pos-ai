-- PYME informal: estado tributario, rubro/teléfono y progreso de formalización.

ALTER TABLE `empresas`
  ADD COLUMN `estado_tributario` enum('INFORMAL','EN_TRAMITE','FORMAL') NOT NULL DEFAULT 'FORMAL'
    COMMENT 'INFORMAL=sin RUT; FORMAL=operación tributaria completa'
    AFTER `estado`,
  ADD COLUMN `rubro_negocio` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `giro_sii`,
  ADD COLUMN `telefono_negocio` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `rubro_negocio`,
  ADD COLUMN `formalizacion_progreso` json DEFAULT NULL AFTER `telefono_negocio`;

-- Empresas existentes con RUT real permanecen FORMAL.
UPDATE `empresas` SET `estado_tributario` = 'FORMAL' WHERE `estado_tributario` = 'FORMAL';
