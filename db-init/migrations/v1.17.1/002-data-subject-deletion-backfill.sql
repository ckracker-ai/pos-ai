-- v1.17.1 — Backfill tickets DELETE PENDING → SCHEDULED con fecha

USE `pos-ai-db`;

UPDATE `data_subject_requests`
SET
  `status` = 'SCHEDULED',
  `scheduled_purge_at` = DATE_ADD(`created_at`, INTERVAL 24 HOUR)
WHERE `request_type` = 'DELETE'
  AND `status` = 'PENDING'
  AND `scheduled_purge_at` IS NULL
  AND `cancelled_at` IS NULL;

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.17.1-002-data-subject-deletion-backfill', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
