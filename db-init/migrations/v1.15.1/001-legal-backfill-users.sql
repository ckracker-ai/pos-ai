-- v1.15.1 — Backfill aceptaciones legales para usuarios existentes (S7 login gate)
-- Canal ADMIN_IMPORT: usuarios creados antes del gate no quedan bloqueados en demo/QA.

INSERT INTO legal_acceptances (
  id,
  user_id,
  empresa_id,
  document_id,
  document_version,
  content_hash,
  acceptance_channel,
  accepted_at
)
SELECT
  UUID(),
  u.id,
  u.empresa_id,
  ld.id,
  ld.version,
  ld.content_hash,
  'ADMIN_IMPORT',
  NOW()
FROM users u
INNER JOIN legal_documents ld
  ON ld.is_current = 1
 AND ld.locale = 'es-CL'
 AND ld.doc_type IN ('TOS', 'PRIVACY')
WHERE NOT EXISTS (
  SELECT 1
  FROM legal_acceptances la
  WHERE la.user_id = u.id
    AND la.document_id = ld.id
    AND la.document_version = ld.version
);
