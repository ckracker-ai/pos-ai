-- v1.17.1 — Eliminación tenant: programación 24h y cancelación

USE `pos-ai-db`;

ALTER TABLE `data_subject_requests`
  ADD COLUMN `scheduled_purge_at` DATETIME NULL AFTER `notes`,
  ADD COLUMN `cancelled_at` DATETIME NULL AFTER `scheduled_purge_at`,
  ADD COLUMN `initiated_by_platform` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cancelled_at`;

ALTER TABLE `data_subject_requests`
  MODIFY COLUMN `status` ENUM(
    'PENDING',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING';

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES ('v1.17.1-001-data-subject-deletion-schedule', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
