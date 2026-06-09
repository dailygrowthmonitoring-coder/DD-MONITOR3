import type { DDReport } from '../../types/dd-report'

export interface ParseResult {
  data: DDReport
  parse_errors: string[]
}

export interface SectionResult<T> {
  value: T | null
  error: string | null
}
