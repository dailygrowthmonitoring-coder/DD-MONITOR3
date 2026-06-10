import type { PerformanceMetricData } from '../../../types/dd-report'
import type { SectionResult } from '../types'

function sf(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function splitSlash(token: string): [number | null, number | null] {
  const parts = token.split('/')
  return [sf(parts[0]), sf(parts[1])]
}

// Performance row regex — extracts timestamp then first 19 data columns
// Format: timestamp read write repl_in/repl_out precomp_in/precomp_out cmpr_ops precomp_used
//         cache_data_in/out cache_wait_in/out cpu_avg cpu_max disk_util% thra% unus% ovhd% data%
const RE_PERF_ROW = new RegExp(
  [
    '^(\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}:\\d{2})',   // 1: timestamp
    '\\s+([\\d.]+)',                                          // 2: read_mbps
    '\\s+([\\d.]+)',                                          // 3: write_mbps
    '\\s+([\\d.]+)\\s*\\/\\s*([\\d.]+)',                     // 4,5: repl_in/repl_out
    '\\s+([\\d.]+)\\s*\\/\\s*([\\d.]+)',                     // 6,7: precomp_in/precomp_out
    '\\s+([\\d.]+)',                                          // 8: cmpr_ops
    '\\s+([\\d.]+)%?',                                       // 9: pre_comp_used
    '\\s+([\\d.]+)\\s*\\/\\s*([\\d.]+)',                     // 10,11: cache_miss_data_in/out
    '\\s+([\\d.]+)\\s*\\/\\s*([\\d.]+)',                     // 12,13: cache_miss_wait_in/out
    '\\s+([\\d.]+)',                                          // 14: cpu_avg
    '\\s+([\\d.]+)',                                          // 15: cpu_max
    '\\s+([\\d.]+)%',                                        // 16: disk_util
    '\\s+([\\d.]+)%',                                        // 17: util_thra
    '\\s+([\\d.]+)%',                                        // 18: util_unus
    '\\s+([\\d.]+)%',                                        // 19: util_ovhd
    '\\s+([\\d.]+)%',                                        // 20: util_data
  ].join(''),
  'gm'
)

// Streams: 6 values separated by "/" in remainder of line
const RE_STREAMS = /\s+([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)\s*\/\s*([\d.]+)/

// Latency avg/max (last X/Y decimal pair)
const RE_LATENCY = /([\d.]+)\s*\/\s*([\d.]+)\s*$/

// Global/local compression: "0%/ 1%[2]" or "6%[ 3]"
const RE_GCOMP_LCOMP = /([\d.]+)%\s*\/\s*([\d.]+)%/

function parseRow(line: string): PerformanceMetricData | null {
  const m = RE_PERF_ROW.exec(line)
  if (!m) return null

  // Reconstruct ISO timestamp from "YYYY/MM/DD HH:MM:SS"
  const ts = m[1]
  const metric_time = ts.slice(0, 4) + '-' + ts.slice(5, 7) + '-' + ts.slice(8, 10) + 'T' + ts.slice(11)

  const afterMatch = line.slice(line.indexOf(ts) + ts.length)
  const fullRest   = line.slice(line.indexOf(m[0]))

  const streamM    = RE_STREAMS.exec(afterMatch)
  const latencyM   = RE_LATENCY.exec(afterMatch)
  const gcompM     = RE_GCOMP_LCOMP.exec(afterMatch)

  return {
    metric_time,
    read_mbps:            sf(m[2]),
    write_mbps:           sf(m[3]),
    repl_in_mbps:         sf(m[4]),
    repl_out_mbps:        sf(m[5]),
    repl_precomp_in_mbps: sf(m[6]),
    repl_precomp_out_mbps: sf(m[7]),
    compression_ops:      sf(m[8]),
    pre_comp_used_pct:    sf(m[9]),
    cache_miss_data_in:   sf(m[10]),
    cache_miss_data_out:  sf(m[11]),
    cache_miss_wait_in:   sf(m[12]),
    cache_miss_wait_out:  sf(m[13]),
    cpu_avg_pct:          sf(m[14]),
    cpu_max_pct:          sf(m[15]),
    disk_util_pct:        sf(m[16]),
    util_thra_pct:        sf(m[17]),
    util_unus_pct:        sf(m[18]),
    util_ovhd_pct:        sf(m[19]),
    util_data_pct:        sf(m[20]),
    util_meta_pct:        null,
    streams_read:         streamM ? sf(streamM[1]) : null,
    streams_write:        streamM ? sf(streamM[2]) : null,
    streams_repl_in:      streamM ? sf(streamM[3]) : null,
    streams_repl_out:     streamM ? sf(streamM[4]) : null,
    latency_avg_ms:       latencyM ? sf(latencyM[1]) : null,
    latency_max_ms:       latencyM ? sf(latencyM[2]) : null,
    gcomp_pct:            gcompM ? sf(gcompM[1]) : null,
    lcomp_pct:            gcompM ? sf(gcompM[2]) : null,
  }
}

export function parsePerformance(text: string): SectionResult<PerformanceMetricData[]> {
  try {
    const sectionIdx = text.indexOf('SYSTEM SHOW PERFORMANCE LEGACY VIEW')
    if (sectionIdx === -1) {
      return { value: [], error: 'SYSTEM SHOW PERFORMANCE LEGACY VIEW section not found' }
    }

    const after  = text.slice(sectionIdx)
    // End at next major section (======) or after 200k chars
    const endIdx = after.search(/\n={5,}/)
    const window = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 200_000)

    const metrics: PerformanceMetricData[] = []
    const re = RE_PERF_ROW
    re.lastIndex = 0

    const lines = window.split('\n')
    for (const line of lines) {
      if (!line.match(/^\d{4}\/\d{2}\/\d{2}/)) continue
      const row = parseRow(line)
      if (row) metrics.push(row)
    }

    // Reset static regex
    RE_PERF_ROW.lastIndex = 0

    if (metrics.length === 0) {
      return { value: [], error: 'No performance data rows parsed' }
    }

    return { value: metrics, error: null }
  } catch (err) {
    return {
      value: [],
      error: `performance parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
