-- ERP Core v1.2 — datos semilla mínimos.

INSERT INTO `branches` (`id`, `name`, `address`, `phone`, `is_active`, `created_at`, `updated_at`) VALUES
('48d4ee18-5349-11f1-a915-00ff541b88ad', 'Sucursal Central', 'Por definir', NULL, 1, NOW(), NOW());

INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
('fb302810-4e95-11f1-b994-00ff541b88ad', 'ADMIN', 'Administrador del sistema', NOW(), NOW()),
('fb30307f-4e95-11f1-b994-00ff541b88ad', 'AUDITOR', 'Auditoría y gestión de usuarios', NOW(), NOW()),
('fb30365a-4e95-11f1-b994-00ff541b88ad', 'SELLER', 'Vendedor / operación de sucursal', NOW(), NOW()),
('6554b196-6375-4d18-b4e5-4e549b4ea6ec', 'COMANDA', 'Usuario para ver comandas en cocina', NOW(), NOW());

-- Admin inicial: api-core seedBootstrapAdmin (admin@empanadascostaazul.cl)
