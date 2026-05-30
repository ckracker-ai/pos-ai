-- ERP Core v1.3 — seed multi-tenant (empresa demo + roles + sucursal).

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
('fb302810-4e95-11f1-b994-00ff541b88ad', 'ADMIN', 'Administrador del sistema', NOW(), NOW()),
('fb30307f-4e95-11f1-b994-00ff541b88ad', 'AUDITOR', 'Auditoría y gestión de usuarios', NOW(), NOW()),
('fb30365a-4e95-11f1-b994-00ff541b88ad', 'SELLER', 'Vendedor / operación de sucursal', NOW(), NOW()),
('6554b196-6375-4d18-b4e5-4e549b4ea6ec', 'COMANDA', 'Usuario para ver comandas en cocina', NOW(), NOW());

INSERT INTO `empresas` (
  `id`, `rut_empresa`, `rut_numero`, `rut_dv`, `razon_social`, `nombre_fantasia`,
  `giro_sii`, `direccion_comercial`, `correo_facturacion`, `url_logo`, `slug`, `estado`,
  `created_at`, `updated_at`
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '76.123.456-7', 76123456, '7',
  'Empanadas Costa Azul SpA', 'Costa Azul',
  'Elaboración de productos de panadería y pastelería',
  'Por definir', 'facturacion@empanadascostaazul.cl', NULL, 'costa-azul', 'ACTIVO',
  NOW(), NOW()
);

INSERT INTO `branches` (
  `id`, `empresa_id`, `name`, `address`, `phone`, `is_active`, `created_at`, `updated_at`
) VALUES (
  '48d4ee18-5349-11f1-a915-00ff541b88ad',
  '11111111-1111-4111-8111-111111111111',
  'Sucursal Central', 'Por definir', NULL, 1, NOW(), NOW()
);

-- Admin inicial: api-core seedBootstrapAdmin (admin@empanadascostaazul.cl)
