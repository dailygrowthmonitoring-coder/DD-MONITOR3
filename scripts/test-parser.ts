import * as fs from 'fs'
import * as path from 'path'
import { parseReport } from '../lib/parser/index'

const SAMPLE_PATH = path.resolve(
  __dirname,
  '../../instructions_for_claude/SAMPLE_REPORT.txt.txt'
)

const rawText = fs.readFileSync(SAMPLE_PATH, 'utf-8')
console.log(`Read ${rawText.length.toLocaleString()} characters from sample report.\n`)

const result = parseReport(rawText)

if (result.parse_errors.length > 0) {
  console.error('=== PARSE ERRORS ===')
  result.parse_errors.forEach(e => console.error(' -', e))
  console.error('')
}

console.log('=== SUMMARY ===')
console.log('Sections extracted:')
console.log(' meta:              ', result.data.meta.hostname)
console.log(' storage:           ', result.data.storage ? `${result.data.storage.used_percent}% used` : 'FAILED')
console.log(' compression:       ', result.data.compression ? result.data.compression.currently_used.total_factor : 'FAILED')
console.log(' mtrees:            ', result.data.mtrees.length, 'trees')
console.log(' disk_groups:       ', result.data.disk_groups.length, 'groups')
console.log(' performance rows:  ', result.data.performance_metrics.length)
console.log(' backup_summary:    ', result.data.backup_summary ? result.data.backup_summary.status : 'not found')
console.log(' alerts:            ', result.data.alerts.active_count, 'active')
console.log(' network ports:     ', result.data.network.ports.length)
console.log(' system_health:     ', result.data.system_health ? 'OK' : 'FAILED')
console.log(' replication:       ', result.data.replication
  ? (result.data.replication.is_configured ? 'configured' : 'not configured')
  : 'FAILED')
console.log(' parse_errors:      ', result.parse_errors.length)
