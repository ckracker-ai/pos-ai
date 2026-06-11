-- v1.15.2 — Documento SLA público (S7)

INSERT INTO legal_documents (id, doc_type, version, locale, title, content_md, content_hash, effective_at, is_current)
VALUES (
  'legal-sla-1-0-0-es-cl',
  'SLA',
  'sla-1.0.0',
  'es-CL',
  'Acuerdo de Nivel de Servicio (SLA) POS-AI',
  '# SLA POS-AI (v1.0.0)\n\n## Alcance\nAplica a clientes B2B con plan de pago activo (Básico, Estándar, Full). Pilotos gratuitos: best-effort sin compensación automática.\n\n## Uptime garantizado mensual\n| Plan | Uptime |\n|------|--------|\n| Básico | 99,0% |\n| Estándar | 99,5% |\n| Full | 99,5% + soporte prioritario |\n\nMedición 24×7, zona Chile continental (UTC-4).\n\n## Exclusiones de downtime\n- Mantenimiento programado notificado con ≥48 h (máx. 4 h/mes).\n- Caídas por el cliente, su red o integraciones no autorizadas.\n- Fuerza mayor.\n- Indisponibilidad de terceros (PSP, Meta, DNS del cliente).\n\n## Compensación (crédito de servicio)\n| Uptime mensual | Crédito próxima factura |\n|----------------|------------------------|\n| ≥ umbral plan | 0% |\n| 99,0% – 99,49% (Estándar/Full) | 5% |\n| 98,0% – 98,99% | 10% |\n| 95,0% – 97,99% | 20% |\n| < 95,0% | 30% (tope) |\n\nEl crédito no es reembolso en efectivo. Reclamo dentro de 15 días corridos post fin de mes vía soporte.\n\n*Documento borrador para revisión legal en Chile.*',
  'c5f0e4d3b2a1698f0e3d6c9a2b5e8f1d4a7c0e3f6b9d2e5f8a1c4b7e0d3f6a9',
  '2026-06-01 00:00:00',
  1
)
ON DUPLICATE KEY UPDATE title = VALUES(title), content_md = VALUES(content_md);
