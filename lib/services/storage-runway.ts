import { querySelectStorageHistory30d } from '@/lib/supabase/queries/storage-runway'
import type { RunwayResult } from '@/types/dashboard'

export async function getStorageRunway(): Promise<RunwayResult> {
  const rows = await querySelectStorageHistory30d()

  // Group rows by device_id, already ordered by report_date asc
  const byDevice = new Map<
    string,
    { report_date: string; used_gib: number | null; available_gib: number | null }[]
  >()
  for (const row of rows) {
    const existing = byDevice.get(row.device_id)
    if (existing) {
      existing.push(row)
    } else {
      byDevice.set(row.device_id, [row])
    }
  }

  let totalAvailableGib = 0
  let totalDailyGrowthGib = 0

  for (const deviceRows of byDevice.values()) {
    if (deviceRows.length < 2) {
      // At least use available_gib from the single row
      if (deviceRows[0]?.available_gib != null) {
        totalAvailableGib += deviceRows[0].available_gib
      }
      continue
    }

    const oldest = deviceRows[0]
    const latest = deviceRows[deviceRows.length - 1]

    if (latest.available_gib != null) {
      totalAvailableGib += latest.available_gib
    }

    if (
      oldest.used_gib != null &&
      latest.used_gib != null &&
      oldest.report_date !== latest.report_date
    ) {
      const msPerDay = 1000 * 60 * 60 * 24
      const days =
        (new Date(latest.report_date).getTime() - new Date(oldest.report_date).getTime()) /
        msPerDay
      if (days > 0) {
        const growth = (latest.used_gib - oldest.used_gib) / days
        if (growth > 0) totalDailyGrowthGib += growth
      }
    }
  }

  let runwayDays: number | null = null
  let runwayMonths: number | null = null

  if (totalDailyGrowthGib > 0 && totalAvailableGib > 0) {
    runwayDays = Math.floor(totalAvailableGib / totalDailyGrowthGib)
    runwayMonths = Math.round((runwayDays / 30) * 10) / 10
  }

  return {
    runway_days:            runwayDays,
    runway_months:          runwayMonths,
    total_available_gib:    totalAvailableGib,
    total_daily_growth_gib: totalDailyGrowthGib,
    computed_at:            new Date().toISOString(),
  }
}
