-- Límites PYME acordados: Básico 1/3, Estándar y Full 3/6 sucursales/usuarios.
-- Descripciones comerciales alineadas con landing.

UPDATE `saas_planes` SET
  `descripcion` = 'ERP para un local: POS, catálogo, comandas y reportes. 1 sucursal, 3 usuarios (Admin, Vendedor, Comanda).',
  `max_sucursales` = 1,
  `max_usuarios` = 3,
  `updated_at` = NOW()
WHERE `codigo` = 'BASICO';

UPDATE `saas_planes` SET
  `descripcion` = 'Básico + hasta 3 sucursales y 6 usuarios (Admin, Auditor, Vendedor, Comanda por sucursal) + asistente IA WhatsApp.',
  `max_sucursales` = 3,
  `max_usuarios` = 6,
  `updated_at` = NOW()
WHERE `codigo` = 'ESTANDAR';

UPDATE `saas_planes` SET
  `descripcion` = 'Estándar + IA telefónica + pasarela de pago online (requiere RUT y datos bancarios formalizados).',
  `max_sucursales` = 3,
  `max_usuarios` = 6,
  `updated_at` = NOW()
WHERE `codigo` = 'FULL';
