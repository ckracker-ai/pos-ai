-- v1.15.0 — Documentos legales versionados y aceptaciones auditables (S7)

CREATE TABLE IF NOT EXISTS legal_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  doc_type ENUM('TOS', 'PRIVACY', 'SLA', 'AUP', 'COOKIES') NOT NULL,
  version VARCHAR(32) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'es-CL',
  title VARCHAR(200) NOT NULL,
  content_md MEDIUMTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  effective_at DATETIME NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_legal_doc_version (doc_type, locale, version),
  KEY idx_legal_current (doc_type, locale, is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  empresa_id CHAR(36) NULL,
  document_id CHAR(36) NOT NULL,
  document_version VARCHAR(32) NOT NULL,
  content_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  acceptance_channel ENUM('REGISTRO', 'CHECKOUT', 'LOGIN_REAUTH', 'ADMIN_IMPORT') NOT NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_legal_acc_user (user_id),
  KEY idx_legal_acc_empresa (empresa_id),
  KEY idx_legal_acc_doc (document_id),
  CONSTRAINT fk_legal_acc_document FOREIGN KEY (document_id) REFERENCES legal_documents (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Términos de Servicio v1.0.0 (resumen operativo — revisión abogado pendiente)
INSERT INTO legal_documents (id, doc_type, version, locale, title, content_md, content_hash, effective_at, is_current)
VALUES (
  'legal-tos-1-0-0-es-cl',
  'TOS',
  'tos-1.0.0',
  'es-CL',
  'Términos de Servicio POS-AI',
  '# Términos de Servicio POS-AI (v1.0.0)\n\n## 1. Servicio SaaS\nPOS-AI se presta como software en la nube. Se otorga una licencia de uso limitada, no exclusiva, intransferible y revocable. No se vende ni cede el código fuente.\n\n## 2. Propiedad intelectual\nEl software, marcas y modelos pertenecen al proveedor. Los datos operativos del negocio pertenecen al cliente, quien autoriza su procesamiento para prestar el servicio.\n\n## 3. Uso aceptable\nProhibido: ingeniería inversa, escaneos de seguridad no autorizados, subarriendo de cuentas, uso fuera del giro del negocio.\n\n## 4. Limitación de responsabilidad\nSalvo dolo o culpa grave, la responsabilidad total se limita al monto pagado por suscripción en los últimos 12 meses. Sin lucro cesante ni daños indirectos.\n\n## 5. Planes y facturación\nEl servicio depende del plan contratado (Básico, Estándar, Full) y del pago oportuno.\n\n*Documento borrador para revisión legal en Chile.*',
  'a3f8c2e1b9d0476f8e2a1c5b7d9e0f3a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4',
  '2026-06-01 00:00:00',
  1
)
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO legal_documents (id, doc_type, version, locale, title, content_md, content_hash, effective_at, is_current)
VALUES (
  'legal-privacy-1-0-0-es-cl',
  'PRIVACY',
  'privacy-1.0.0',
  'es-CL',
  'Política de Privacidad POS-AI',
  '# Política de Privacidad POS-AI (v1.0.0)\n\n## Responsable del tratamiento\nLa empresa cliente es responsable frente a sus clientes finales. POS-AI actúa como encargado del tratamiento para operar el ERP.\n\n## Datos tratados\nUsuarios del tenant, datos de ventas e inventario, comprobantes de pago (imágenes), conversaciones WhatsApp del asistente IA y logs técnicos.\n\n## Finalidad\nPrestación del servicio, soporte, seguridad y cumplimiento contractual. No vendemos datos a terceros.\n\n## Subprocesadores\nHosting en la nube, pasarelas de pago (sin almacenar tarjetas), proveedores de IA y Meta/WhatsApp según plan.\n\n## Derechos\nAcceso, rectificación y eliminación según Ley 19.628 (Chile). Solicitudes vía administrador de la empresa o soporte.\n\n*Documento borrador para revisión legal en Chile.*',
  'b4e9d3f2c0a1587e9f3b2d6c8a1e4f7b0d3e6f9a2c5d8e1f4a7b0c3d6e9f2a5',
  '2026-06-01 00:00:00',
  1
)
ON DUPLICATE KEY UPDATE title = VALUES(title);
