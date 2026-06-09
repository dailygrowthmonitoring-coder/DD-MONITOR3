import { format, parseISO, isValid } from 'date-fns'

export function formatDatetime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return dateStr
    return format(date, 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const date = parseISO(dateStr)
    if (!isValid(date)) return dateStr
    return format(date, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatGib(value: number): string {
  return `${value.toFixed(1)} GiB`
}

export function formatMib(value: number): string {
  return `${value.toLocaleString()} MiB`
}
