-- v1.12.0 — Corrige nombres/descripciones de planes con encoding roto (B??sico → Básico).

USE `pos-ai-db`;

UPDATE `saas_planes`
SET
  `nombre` = 'POS-AI Básico',
  `descripcion` = 'ERP operativo para PYME: POS, catálogo, comandas, reportes y mantenedores.',
  `updated_at` = NOW()
WHERE `codigo` = 'BASICO';

UPDATE `saas_planes`
SET
  `nombre` = 'POS-AI Estándar',
  `descripcion` = 'Básico + asistente IA WhatsApp conectado al inventario y ventas.',
  `updated_at` = NOW()
WHERE `codigo` = 'ESTANDAR';

UPDATE `saas_planes`
SET
  `nombre` = 'POS-AI Full',
  `descripcion` = 'Estándar + asistente voz/teléfono + cobro con medios de pago online.',
  `updated_at` = NOW()
WHERE `codigo` = 'FULL';

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.12.0-001-saas-planes-encoding', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
