/**
 * Parses replication configuration state from the GENERAL STATUS section.
 *
 * Key source line:
 *   **** This restorer is not configured for replication.
 *
 * When configured, additional fields would appear (not present in this file).
 */

import type { ReplicationData, SectionResult } from '../types';
import { extractSection } from '../utils/normalize';

export function parseReplication(lines: string[]): SectionResult<ReplicationData> {
  try {
    const section = extractSection(lines, 'GENERAL STATUS');
    if (section.length === 0) {
      return { value: null, error: 'GENERAL STATUS section not found for replication' };
    }

    for (const line of section) {
      if (/not configured for replication/i.test(line)) {
        return { value: { configured: false, status: null }, error: null };
      }
      if (/Replication Status/i.test(line)) {
        // Section header encountered — check subsequent lines
        continue;
      }
    }

    // Default: not configured (also handles missing "Replication Status" subsection)
    return { value: { configured: false, status: null }, error: null };
  } catch (e) {
    return { value: null, error: `replication: ${e instanceof Error ? e.message : String(e)}` };
  }
}
