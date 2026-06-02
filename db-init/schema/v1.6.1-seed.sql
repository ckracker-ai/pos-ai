-- v1.6.1 — Suscripción demo Costa Azul (plataforma crea admin en runtime)

INSERT INTO `empresa_suscripciones` (
  `id`, `empresa_id`, `plan_id`, `estado`, `origen`, `periodo`,
  `inicio_en`, `proximo_cobro_en`, `vence_en`, `created_at`, `updated_at`
) VALUES (
  'e1000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'a0000000-0000-4000-8000-000000000002',
  'PILOTO', 'PLATAFORMA', 'MENSUAL',
  NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 90 DAY),
  NOW(), NOW()
);

INSERT INTO `schema_migrations` (`version`, `applied_at`) VALUES
('v1.6.1-001-empresa-suscripciones', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = VALUES(`applied_at`);
