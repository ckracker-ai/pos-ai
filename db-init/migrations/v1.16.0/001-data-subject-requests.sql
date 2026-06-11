-- v1.16.0 — Solicitudes ARCO / portabilidad (S7-T4/T5)

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  empresa_id CHAR(36) NOT NULL,
  request_type ENUM('EXPORT', 'DELETE', 'RECTIFY') NOT NULL,
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  requested_by CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  KEY idx_dsr_empresa (empresa_id),
  KEY idx_dsr_status (status),
  KEY idx_dsr_type (request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
