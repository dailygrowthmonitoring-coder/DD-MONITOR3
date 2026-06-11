/**
 * Number parsing utilities for DD autosupport files.
 *
 * The file mixes many unit and format conventions; these helpers centralise
 * the translation so section parsers stay readable.
 */

/**
 * Parse a plain number string, stripping a trailing % or unit word.
 * Returns null for "-" (not applicable) or anything unparseable.
 *
 * Examples: "30%" → 30, "48137 MiB" → 48137, "1754 days" → 1754, "-" → null
 */
export function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (s === '-' || s === '') return null;
  // Strip trailing non-numeric suffix (units, %)
  const num = parseFloat(s.replace(/[^0-9.]/g, ' ').trim().split(/\s+/)[0] ?? '');
  return isNaN(num) ? null : num;
}

/**
 * Parse a capacity string with optional unit into GiB.
 *
 * Rules:
 *   "3.6 TiB"   →  3686.4   (multiply by 1024)
 *   "2.7 TiB"   →  2764.8
 *   "745.2 GiB" →  745.2    (keep as-is)
 *   "32.74 TiB" →  33525.76
 *   "-"         →  null
 *
 * The file sometimes omits the space before the unit (not observed in practice,
 * but the regex handles both "3.6 TiB" and "3.6TiB").
 */
export function parseCapacityToGib(raw: string): number | null {
  const s = raw.trim();
  if (s === '-' || s === '') return null;
  const m = /^([\d.]+)\s*(TiB|GiB|MiB)/i.exec(s);
  if (m === null) return null;
  const value = parseFloat(m[1] ?? '0');
  if (isNaN(value)) return null;
  const unit = (m[2] ?? '').toUpperCase();
  if (unit === 'TIB') return Math.round(value * 1024 * 10) / 10;
  if (unit === 'GIB') return value;
  if (unit === 'MIB') return Math.round((value / 1024) * 10) / 10;
  return null;
}

/**
 * Parse a compression factor/reduction cell.
 *
 * Two formats exist in the real file:
 *   "22.4x (95.5)"  →  { factor: 22.4, reduction: 95.5 }   (Currently Used row)
 *   "8.1x (87.7)"   →  { factor: 8.1,  reduction: 87.7 }   (Last 7 days / 24 hrs)
 *   "5.1(80.3)"     →  { factor: 5.1,  reduction: 80.3 }   (Mtree Show Compression — no space)
 *   "-"             →  null
 *
 * Returns null for "-" (not applicable).
 */
export function parseCompressionCell(raw: string): { factor: number; reduction: number } | null {
  const s = raw.trim();
  if (s === '-' || s === '') return null;
  // Handles both "5.1(80.3)" and "5.1x (80.3)" and "22.4x (95.5)"
  const m = /^([\d.]+)x?\s*\(([\d.]+)\)$/.exec(s);
  if (m === null) return null;
  const factor    = parseFloat(m[1] ?? '0');
  const reduction = parseFloat(m[2] ?? '0');
  if (isNaN(factor) || isNaN(reduction)) return null;
  return { factor, reduction };
}

/**
 * Parse a factor-only cell (e.g. "7.6x" → 7.6, "-" → null).
 */
export function parseFactor(raw: string): number | null {
  const s = raw.trim();
  if (s === '-' || s === '') return null;
  const n = parseFloat(s.replace('x', ''));
  return isNaN(n) ? null : n;
}
