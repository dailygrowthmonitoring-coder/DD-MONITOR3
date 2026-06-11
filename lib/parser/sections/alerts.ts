/**
 * Parses active alerts and alert history from the GENERAL STATUS section.
 *
 * Current Alerts table (3-dash structure, message column = rest of line):
 *   Id       Post Time                  Severity   Class     Object               Message
 *   ------   ------------------------   --------   -------   ------------------   ---...---
 *   p0-273   Mon Mar 10 04:38:22 2025   CRITICAL   Network   Interface Index=20   EVT-NETM-00001: ...
 *   ------   ------------------------   --------   -------   ------------------   ---...---
 *   There is 1 active alert.
 *
 * Alerts History — same but with an extra Clear Time column:
 *   p0-273   Mon Mar 10 04:38:22 2025   (active)     CRITICAL   Network   Interface Index=20   EVT-NETM-00001: ...
 *
 * CRITICAL: Message column contains embedded spaces/colons. Split on 2+ spaces only —
 * the last chunk is the full message and must not be re-split.
 */

import type { AlertEntry, AlertHistoryEntry, AlertsData, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseDate } from '../utils/dates';

type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

function normSeverity(s: string): AlertSeverity {
  const u = s.trim().toUpperCase();
  if (u === 'CRITICAL' || u === 'WARNING' || u === 'INFO') return u;
  return 'INFO';
}

function findTableRows(section: string[], headerText: string): string[] {
  const dashRe = /^-{3,}/;
  let headerIdx = -1;
  const targetLower = headerText.toLowerCase();
  for (let i = 0; i < section.length; i++) {
    if ((section[i] ?? '').toLowerCase() === targetLower) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  // Table structure: header / dashes#1(section underline) / col-header / dashes#2(col underline) / DATA / dashes#3
  // Skip 2 dashes lines to land on data
  let dashCount = 0;
  let dataStart = -1;
  for (let i = headerIdx + 1; i < section.length; i++) {
    if (dashRe.test(section[i] ?? '')) {
      dashCount++;
      if (dashCount === 2) { dataStart = i + 1; break; }
    }
  }
  if (dataStart === -1) return [];

  // Collect data rows until closing dashes
  const rows: string[] = [];
  for (let i = dataStart; i < section.length; i++) {
    const line = section[i] ?? '';
    if (dashRe.test(line)) break;
    if (line.length > 0) rows.push(line);
  }
  return rows;
}

export function parseAlerts(lines: string[]): SectionResult<AlertsData> {
  try {
    const section = extractSection(lines, 'GENERAL STATUS');
    if (section.length === 0) {
      return { value: null, error: 'GENERAL STATUS section not found for alerts' };
    }

    // ── Current Alerts ─────────────────────────────────────────────────────
    const activeRows = findTableRows(section, 'Current Alerts');
    const active: AlertEntry[] = [];

    for (const row of activeRows) {
      const cols = splitColumns(row);
      // cols: [id, post_time, severity, class, object, message]
      if (cols.length < 6) continue;
      const id      = cols[0] ?? '';
      const postRaw = cols[1] ?? '';
      const sev     = normSeverity(cols[2] ?? '');
      const cls     = cols[3] ?? '';
      const object  = cols[4] ?? '';
      const message = cols.slice(5).join('  ');
      if (!id) continue;
      active.push({ id, post_time: parseDate(postRaw) ?? postRaw, severity: sev, class: cls, object, message });
    }

    // Count from summary line
    let active_count = active.length;
    for (const line of section) {
      const m = /There (?:is|are)\s+(\d+)\s+active alert/i.exec(line);
      if (m?.[1] !== undefined) { active_count = parseInt(m[1], 10); break; }
    }

    // ── Alerts History ─────────────────────────────────────────────────────
    const histRows = findTableRows(section, 'Alerts History');
    const history: AlertHistoryEntry[] = [];

    for (const row of histRows) {
      const cols = splitColumns(row);
      // cols: [id, post_time, clear_time|(active), severity, class, object, message]
      if (cols.length < 7) continue;
      const id       = cols[0] ?? '';
      const postRaw  = cols[1] ?? '';
      const clearRaw = cols[2] ?? '';
      const sev      = normSeverity(cols[3] ?? '');
      const cls      = cols[4] ?? '';
      const object   = cols[5] ?? '';
      const message  = cols.slice(6).join('  ');
      if (!id) continue;
      const isActive = clearRaw.toLowerCase() === '(active)';
      history.push({
        id,
        post_time:  parseDate(postRaw) ?? postRaw,
        clear_time: isActive ? null : (parseDate(clearRaw) ?? clearRaw),
        severity:   sev,
        class:      cls,
        object,
        message,
        status:     isActive ? 'active' : 'cleared',
      });
    }

    return { value: { active_count, active, history }, error: null };
  } catch (e) {
    return { value: null, error: `alerts: ${e instanceof Error ? e.message : String(e)}` };
  }
}
