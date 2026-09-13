/**
 * In-memory scheduler job status registry.
 *
 * The scheduled jobs (auto-charge, alert-evaluation, budget-reset) run outside
 * any HTTP request and previously only logged to the console — a silently-failed
 * cron run was invisible. Each job now reports its outcome here so an admin can
 * see, via `GET /api/v1/health/scheduler`, whether jobs are running and healthy.
 *
 * This is operational telemetry for a single-process, local-first app, so it is
 * intentionally in-memory (resets on restart) rather than persisted.
 */

export type JobRunStatus = 'never' | 'success' | 'error';

export interface JobStatus {
  /** Job identifier (e.g. 'auto-charge'). */
  name: string;
  /** ISO timestamp of the last run, or null if it has not run yet. */
  lastRunAt: string | null;
  /** Outcome of the last run. */
  lastStatus: JobRunStatus;
  /** Duration of the last run in milliseconds, or null. */
  lastDurationMs: number | null;
  /** Short human-readable summary of the last run (counts / error message). */
  lastMessage: string | null;
}

const jobs = new Map<string, JobStatus>();
const startedAt = new Date().toISOString();

/** Registers a job so it appears in the status snapshot before its first run. */
export function registerJob(name: string): void {
  if (!jobs.has(name)) {
    jobs.set(name, {
      name,
      lastRunAt: null,
      lastStatus: 'never',
      lastDurationMs: null,
      lastMessage: null,
    });
  }
}

/** Records the outcome of a job run. */
export function recordJobRun(
  name: string,
  status: Exclude<JobRunStatus, 'never'>,
  durationMs: number,
  message: string,
): void {
  jobs.set(name, {
    name,
    lastRunAt: new Date().toISOString(),
    lastStatus: status,
    lastDurationMs: durationMs,
    lastMessage: message,
  });
}

export interface SchedulerStatusSnapshot {
  /** ISO timestamp of when the process (and thus the scheduler) started. */
  startedAt: string;
  /** True if every registered job's last run succeeded (or hasn't run yet). */
  healthy: boolean;
  jobs: JobStatus[];
}

/** Returns a snapshot of all job statuses. */
export function getSchedulerStatus(): SchedulerStatusSnapshot {
  const all = [...jobs.values()];
  return {
    startedAt,
    healthy: all.every((j) => j.lastStatus !== 'error'),
    jobs: all,
  };
}

/** Test helper: clears all recorded job statuses. */
export function resetSchedulerStatus(): void {
  jobs.clear();
}
