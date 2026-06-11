/**
 * Text normalization utilities for the DD autosupport parser.
 *
 * The autosupport file uses Windows CRLF line endings and surrounds most data
 * lines with blank lines. All utilities here operate on pre-normalized line
 * arrays produced by normalizeLines().
 */

/**
 * Normalize a raw autosupport file into a trimmed, blank-filtered line array.
 * Called ONCE per file in the parser entry point; the result is passed to all
 * section parsers by reference.
 *
 * Source format: Windows CRLF, many blank lines, occasional leading/trailing spaces.
 */
export function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Extract the lines belonging to a named top-level section.
 *
 * Top-level sections are delimited by headers matching:
 *   "==========  SECTION NAME  =========="
 *
 * Returns lines between the matched header and the next top-level header (exclusive),
 * already trimmed and blank-filtered (inherited from the input array).
 *
 * @param lines  - Full normalized line array from normalizeLines().
 * @param name   - Section name as it appears between the equals signs (case-insensitive).
 */
export function extractSection(lines: string[], name: string): string[] {
  const headerRe = /^={5,}\s+(.+?)\s+=+$/;
  const targetNorm = name.trim().toLowerCase();

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const m = headerRe.exec(line);
    if (m !== null && m[1] !== undefined && m[1].trim().toLowerCase() === targetNorm) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return [];

  const result: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (headerRe.test(line)) break;
    result.push(line);
  }
  return result;
}

/**
 * Find a subsection within a section's lines by its plain-text header.
 *
 * Subsection headers are plain text lines followed by a dashes separator line.
 * Returns lines after the first dash-separator following the header, up to the
 * next occurrence of the same kind of dashes line (i.e. the closing separator),
 * or another subsection header, or end of input.
 *
 * @param lines   - Section-level lines (from extractSection).
 * @param header  - Exact text of the subsection header (trimmed, case-insensitive).
 */
export function extractSubsection(lines: string[], header: string): string[] {
  const target = header.trim().toLowerCase();
  const dashRe = /^-{3,}$/;

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.toLowerCase() === target) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  // Find the first dashes line after the header
  let dataStart = -1;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && dashRe.test(line)) {
      dataStart = i + 1;
      break;
    }
  }
  if (dataStart === -1) return [];

  // Collect until the closing dashes line
  const result: string[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (dashRe.test(line)) break;
    result.push(line);
  }
  return result;
}

/**
 * Split a space-aligned table row into columns.
 *
 * DD autosupport tables use 2+ spaces as column separators. Single spaces inside
 * a cell (e.g. "Interface Index=20", "SEAGATE STMFSND2CLAR4000") are preserved.
 *
 * @param line - A single trimmed data line from a table.
 */
export function splitColumns(line: string): string[] {
  return line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
}

/**
 * Extract lines of a three-dash table (header row, separator, data rows, separator).
 *
 * Returns only the data rows (between first and last dash-separator lines found
 * after the given start index in `lines`).
 *
 * @param lines      - Section or subsection lines to search.
 * @param startAfter - Index to begin searching from (exclusive).
 */
export function extractTableRows(lines: string[], startAfter: number): string[] {
  const dashRe = /^-{3,}/;
  let firstDash = -1;
  let secondDash = -1;

  for (let i = startAfter; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (dashRe.test(line)) {
      if (firstDash === -1) {
        firstDash = i;
      } else {
        secondDash = i;
        break;
      }
    }
  }
  if (firstDash === -1 || secondDash === -1) return [];

  const result: string[] = [];
  for (let i = firstDash + 1; i < secondDash; i++) {
    const line = lines[i];
    if (line !== undefined && line.length > 0) result.push(line);
  }
  return result;
}
