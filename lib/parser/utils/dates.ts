/**
 * Date parsing for DD autosupport files.
 *
 * Five distinct formats appear in the real file — all are normalised to
 * ISO 8601 without a trailing Z (times are local to the device timezone):
 *
 *   Format 1: "Mon Mar 10 06:48:00 AST 2025"  →  "2025-03-10T06:48:00"
 *   Format 2: "Mon Mar 10 04:38:22 2025"       →  "2025-03-10T04:38:22"
 *   Format 3: "2025-03-10 06:48:06 AST"        →  "2025-03-10T06:48:06"
 *   Format 4: "2025/03/04 08:25:28"             →  "2025-03-04T08:25:28"
 *   Format 5: "May 21 03:00:00 AST 2020"        →  "2020-05-21T03:00:00"
 *
 * Additionally, date-only timestamps like "2025-03-03 06:00" (no seconds) are
 * accepted and padded with ":00" seconds.
 */

const MONTHS: Readonly<Record<string, string>> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

const DOW = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

/** Pad a number string to 2 digits. */
function pad2(s: string): string {
  return s.length === 1 ? `0${s}` : s;
}

/**
 * Parse a DD autosupport date string into ISO 8601 local time.
 * Returns null if the input cannot be recognised.
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Format 3: "2025-03-10 06:48:06 AST" or "2025-03-10 06:48:06"
  // Format 4: "2025/03/04 08:25:28"
  if (/^\d{4}[-/]/.test(s)) {
    const m3 = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)/.exec(s);
    if (m3 !== null) {
      const time = m3[4] ?? '';
      const fullTime = time.length === 5 ? `${time}:00` : time;
      return `${m3[1]}-${m3[2]}-${m3[3]}T${fullTime}`;
    }
    const m4 = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2}:\d{2})/.exec(s);
    if (m4 !== null) {
      return `${m4[1]}-${m4[2]}-${m4[3]}T${m4[4]}`;
    }
    return null;
  }

  // Split into tokens to distinguish Format 1/2 vs Format 5
  const tokens = s.split(/\s+/);
  const first = tokens[0] ?? '';

  if (DOW.has(first)) {
    // Format 1: Mon Mar 10 06:48:00 AST 2025  (6 tokens)
    // Format 2: Mon Mar 10 04:38:22 2025        (5 tokens)
    const month = tokens[1] ?? '';
    const day   = tokens[2] ?? '';
    const time  = tokens[3] ?? '';
    const mon = MONTHS[month];
    if (!mon) return null;

    if (tokens.length >= 6) {
      // Format 1: last token is year, second-to-last is TZ
      const year = tokens[tokens.length - 1] ?? '';
      if (/^\d{4}$/.test(year)) {
        return `${year}-${mon}-${pad2(day)}T${time}`;
      }
    }
    if (tokens.length === 5) {
      // Format 2: last token is year
      const year = tokens[4] ?? '';
      if (/^\d{4}$/.test(year)) {
        return `${year}-${mon}-${pad2(day)}T${time}`;
      }
    }
    return null;
  }

  // Format 5: "May 21 03:00:00 AST 2020"  (5 tokens, month first)
  const month = first;
  const day   = tokens[1] ?? '';
  const time  = tokens[2] ?? '';
  // tokens[3] is TZ abbreviation, tokens[4] is year
  const year  = tokens[4] ?? '';
  const mon = MONTHS[month];
  if (mon && /^\d{4}$/.test(year) && /^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return `${year}-${mon}-${pad2(day)}T${time}`;
  }

  return null;
}
