-- v1.18.0 — Demo canal VOZ (plan Full) + binding teléfono 56900000003

USE `pos-ai-db`;

-- Costa Azul: Full incluye WSP + voz (56900000001 sigue válido para WSP)
UPDATE `empresas`
SET `plan_id` = 'a0000000-0000-4000-8000-000000000003'
WHERE `slug` = 'costa-azul';

INSERT INTO `assistant_channel_bindings` (
  `id`, `empresa_id`, `channel`, `external_id`, `default_branch_id`,
  `session_branch_id`, `is_active`, `created_at`, `updated_at`
)
SELECT
  'b0000000-0000-4000-8000-000000000003',
  '11111111-1111-4111-8111-111111111111',
  'VOZ',
  '56900000003',
  '48d4ee18-5349-11f1-a915-00ff541b88ad',
  NULL,
  1,
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `assistant_channel_bindings`
  WHERE `channel` = 'VOZ' AND `external_id` = '56900000003'
);

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.18.0-001-voice-channel-demo', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
