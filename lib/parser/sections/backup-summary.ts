import type { BackupSummaryData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

// DDBoost job statistics: "Total jobs: 142"
const RE_TOTAL_JOBS    = /Total jobs?:\s*(\d+)/i
const RE_OK_JOBS       = /(?:Succeeded|Successful|OK) jobs?:\s*(\d+)/i
const RE_FAILED_JOBS   = /Failed jobs?:\s*(\d+)/i
const RE_SCHED_JOBS    = /Scheduled jobs?:\s*(\d+)/i

function safeInt(v: string): number { return parseInt(v, 10) || 0 }

export function parseBackupSummary(text: string): SectionResult<BackupSummaryData> {
  try {
    // Look for DDBoost Statistics section
    const ddboostIdx = text.indexOf('DDBoost Statistics')
    const window = ddboostIdx !== -1
      ? text.slice(ddboostIdx, ddboostIdx + 3000)
      : ''

    const totalMatch  = RE_TOTAL_JOBS.exec(window)
    const okMatch     = RE_OK_JOBS.exec(window)
    const failedMatch = RE_FAILED_JOBS.exec(window)
    const schedMatch  = RE_SCHED_JOBS.exec(window)

    if (!totalMatch) {
      // No DDBoost section — not an error, just no backup summary available
      return { value: null, error: 'DDBoost Statistics section not found' }
    }

    const jobs_total    = safeInt(totalMatch[1])
    const jobs_ok       = okMatch     ? safeInt(okMatch[1])     : 0
    const jobs_failed   = failedMatch ? safeInt(failedMatch[1]) : 0
    const jobs_scheduled = schedMatch ? safeInt(schedMatch[1])  : 0
    const success_rate_pct = jobs_total > 0
      ? Math.round((jobs_ok / jobs_total) * 100 * 10) / 10
      : null

    let status: BackupSummaryData['status'] = 'unknown'
    if (jobs_total === 0) status = 'unknown'
    else if (jobs_failed > 0 && jobs_failed / jobs_total > 0.1) status = 'critical'
    else if (jobs_failed > 0) status = 'warning'
    else if (jobs_scheduled > 0 && jobs_ok === 0) status = 'scheduled'
    else status = 'ok'

    return {
      value: {
        jobs_total,
        jobs_ok,
        jobs_failed,
        jobs_scheduled,
        success_rate_pct,
        avg_duration_min: null,
        total_data_written_gib: null,
        status,
      },
      error: null,
    }
  } catch (err) {
    return {
      value: null,
      error: `backup-summary parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
