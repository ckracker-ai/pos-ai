-- ERP Core v1.4+ — seed multi-tenant (planes SaaS + empresa demo + roles + sucursal).

INSERT INTO `saas_planes` (
  `id`, `codigo`, `nombre`, `descripcion`, `valor`, `metodo_pago`, `max_sucursales`, `max_usuarios`,
  `features`, `orden`, `is_active`, `created_at`, `updated_at`
) VALUES
(
  'a0000000-0000-4000-8000-000000000001', 'BASICO', 'POS-AI Básico',
  'ERP para un local: POS, catálogo, comandas y reportes. 1 sucursal, 3 usuarios (Admin, Vendedor, Comanda).',
  24990, 'TRANSFERENCIA', 1, 3,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', false, 'assistantVoz', false, 'pagosOnline', false),
  1, 1, NOW(), NOW()
),
(
  'a0000000-0000-4000-8000-000000000002', 'ESTANDAR', 'POS-AI Estándar',
  'Básico + hasta 3 sucursales y 6 usuarios + asistente IA WhatsApp.',
  44990, 'TRANSFERENCIA', 3, 6,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', true, 'assistantVoz', false, 'pagosOnline', false),
  2, 1, NOW(), NOW()
),
(
  'a0000000-0000-4000-8000-000000000003', 'FULL', 'POS-AI Full',
  'Estándar + IA telefónica + pasarela de pago online (requiere RUT formalizado).',
  69990, 'MIXTO', 3, 6,
  JSON_OBJECT('modulosCore', true, 'assistantWhatsapp', true, 'assistantVoz', true, 'pagosOnline', true),
  3, 1, NOW(), NOW()
);

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
('fb302810-4e95-11f1-b994-00ff541b88ad', 'ADMIN', 'Administrador del sistema', NOW(), NOW()),
('fb30307f-4e95-11f1-b994-00ff541b88ad', 'AUDITOR', 'Auditoría y gestión de usuarios', NOW(), NOW()),
('fb30365a-4e95-11f1-b994-00ff541b88ad', 'SELLER', 'Vendedor / operación de sucursal', NOW(), NOW()),
('6554b196-6375-4d18-b4e5-4e549b4ea6ec', 'COMANDA', 'Usuario para ver comandas en cocina', NOW(), NOW());

INSERT INTO `empresas` (
  `id`, `rut_empresa`, `rut_numero`, `rut_dv`, `razon_social`, `nombre_fantasia`,
  `giro_sii`, `direccion_comercial`, `correo_facturacion`, `url_logo`, `slug`, `estado`, `plan_id`,
  `assistant_admin_phone`, `transfer_bank_name`, `transfer_account_type`, `transfer_account`,
  `transfer_holder_name`, `transfer_rut`,
  `created_at`, `updated_at`
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '76.123.456-7', 76123456, '7',
  'Empanadas Costa Azul SpA', 'Costa Azul',
  'Elaboración de productos de panadería y pastelería',
  'Por definir', 'facturacion@empanadascostaazul.cl', NULL, 'costa-azul', 'ACTIVO',
  'a0000000-0000-4000-8000-000000000002',
  '56900000002', 'BancoEstado', 'Cuenta vista', '12345678',
  'Empanadas Costa Azul SpA', '76.123.456-7',
  NOW(), NOW()
);

INSERT INTO `branches` (
  `id`, `empresa_id`, `name`, `address`, `phone`, `is_active`, `created_at`, `updated_at`
) VALUES (
  '48d4ee18-5349-11f1-a915-00ff541b88ad',
  '11111111-1111-4111-8111-111111111111',
  'Sucursal Central', 'Por definir', NULL, 1, NOW(), NOW()
);

-- Canal WhatsApp demo (cliente 56900000001)
INSERT INTO `assistant_channel_bindings` (
  `id`, `empresa_id`, `channel`, `external_id`, `default_branch_id`,
  `session_branch_id`, `is_active`, `created_at`, `updated_at`
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'WHATSAPP', '56900000001',
  '48d4ee18-5349-11f1-a915-00ff541b88ad',
  NULL, 1, NOW(), NOW()
);

-- Catálogo demo asistente WSP
INSERT INTO `categories` (`id`, `empresa_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`)
VALUES ('c0a00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Empanadas', 'Catálogo demo asistente WSP', 1, NOW(), NOW());

INSERT INTO `suppliers` (
  `id`, `empresa_id`, `name`, `contact_email`, `contact_phone`, `address`, `is_active`, `created_at`, `updated_at`
) VALUES ('s0a00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Proveedor demo', NULL, NULL, NULL, 1, NOW(), NOW());

INSERT INTO `products` (
  `id`, `empresa_id`, `category_id`, `supplier_id`, `sku`, `name`, `description`, `price`, `unit`, `is_active`, `created_at`, `updated_at`
) VALUES
('d0a00000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0a00000-0000-4000-8000-000000000001', 's0a00000-0000-4000-8000-000000000001', 'EMP-QUESO', 'Empanada de queso', 'Demo WSP', 2500.00, 'unit', 1, NOW(), NOW()),
('d0a00000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'c0a00000-0000-4000-8000-000000000001', 's0a00000-0000-4000-8000-000000000001', 'EMP-PINO', 'Empanada de pino', 'Demo WSP', 2800.00, 'unit', 1, NOW(), NOW()),
('d0a00000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'c0a00000-0000-4000-8000-000000000001', 's0a00000-0000-4000-8000-000000000001', 'EMP-NAPO', 'Empanada napolitana', 'Demo WSP', 3000.00, 'unit', 1, NOW(), NOW());

INSERT INTO `inventory_stock` (
  `id`, `empresa_id`, `product_id`, `branch_id`, `quantity`, `min_stock`, `created_at`, `updated_at`
)
SELECT UUID(), '11111111-1111-4111-8111-111111111111', p.id, '48d4ee18-5349-11f1-a915-00ff541b88ad', 50, 5, NOW(), NOW()
FROM `products` p
WHERE p.empresa_id = '11111111-1111-4111-8111-111111111111'
  AND p.id IN (
    'd0a00000-0000-4000-8000-000000000001',
    'd0a00000-0000-4000-8000-000000000002',
    'd0a00000-0000-4000-8000-000000000003'
  );

INSERT INTO `schema_migrations` (`version`, `applied_at`) VALUES
('v1.7.0-001-assistant-channel', NOW()),
('v1.7.0-002-demo-catalog-costa-azul', NOW()),
('v1.7.0-003-assistant-payment-proofs', NOW()),
('v1.7.0-004-transfer-profile', NOW()),
('v1.7.0-005-payment-proof-image', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = VALUES(`applied_at`);

-- Admin inicial: api-core seedBootstrapAdmin (admin@empanadascostaazul.cl)
