import dataSubjectDelegate from '../modules/legal/delegates/DataSubjectDelegate';
import { withJobLock } from '../lib/jobLock';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export function startTenantDeletionJob(): void {
  if (process.env.TENANT_DELETION_JOB_ENABLED === 'false') {
    console.info('[DATA_SUBJECT] background job disabled (TENANT_DELETION_JOB_ENABLED=false)');
    return;
  }

  const intervalMs = Math.max(
    60_000,
    Number.parseInt(process.env.TENANT_DELETION_JOB_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS), 10) ||
      DEFAULT_INTERVAL_MS
  );

  const run = async () => {
    const locked = await withJobLock('process-data-deletions', 300, () =>
      dataSubjectDelegate.processScheduledDeletions()
    );
    if (!locked.acquired) return;
    if (!locked.value.success) {
      console.warn('[DATA_SUBJECT] background job failed:', locked.value.error);
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, intervalMs);

  console.info(`[DATA_SUBJECT] background job every ${Math.round(intervalMs / 1000)}s`);
}
