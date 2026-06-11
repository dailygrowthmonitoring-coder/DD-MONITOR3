/**
 * Parses network port hardware details from Net Show Hardware in GENERAL STATUS.
 *
 * Table format (split on 2+ spaces):
 *   Port    Speed      Duplex    Supp Speeds      Hardware Address    Physical   Link Status   State
 *   -----   --------   -------   --------------   -----------------   --------   -----------   -------
 *   ethMa   unknown    unknown   10/100/1000      00:60:16:ab:71:fa   Copper     unknown       down
 *   eth1a   1000Mb/s   full      100/1000/10000   00:60:16:a8:df:34   Copper     yes           running
 *   eth1d   unknown    unknown   100/1000/10000   00:60:16:a8:df:37   Copper     no            up
 *
 * Columns: Port[0], Speed[1], Duplex[2], Supp Speeds[3] (skipped),
 *          Hardware Address[4], Physical[5], Link Status[6], State[7]
 *
 * eth1d is notable: Link Status = "no" but State = "up" — both must be captured.
 */

import type { NetworkPort, NetworkData, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';

export function parseNetwork(lines: string[]): SectionResult<NetworkData> {
  try {
    const section = extractSection(lines, 'GENERAL STATUS');
    if (section.length === 0) {
      return { value: { ports: [] }, error: 'GENERAL STATUS section not found for network' };
    }

    // Find "Net Show Hardware" subsection header
    let headerIdx = -1;
    for (let i = 0; i < section.length; i++) {
      if ((section[i] ?? '').toLowerCase() === 'net show hardware') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      return { value: { ports: [] }, error: 'Net Show Hardware not found in GENERAL STATUS' };
    }

    const dashRe = /^-{3,}/;
    // 3-dash table: skip 2 dashes (section underline + column underline) to reach data rows
    let dashCount = 0;
    let dataStart = -1;
    for (let i = headerIdx + 1; i < section.length; i++) {
      if (dashRe.test(section[i] ?? '')) {
        dashCount++;
        if (dashCount === 2) { dataStart = i + 1; break; }
      }
    }
    if (dataStart === -1) return { value: { ports: [] }, error: 'Net Show Hardware: no table found' };

    // Collect data rows until closing dashes
    const ports: NetworkPort[] = [];
    for (let i = dataStart; i < section.length; i++) {
      const line = section[i] ?? '';
      if (dashRe.test(line)) break;
      // Port names always start with "eth" in this file
      if (!line.startsWith('eth')) continue;

      const cols = splitColumns(line);
      // cols[0]=Port, [1]=Speed, [2]=Duplex, [3]=SuppSpeeds, [4]=HW Addr, [5]=Physical, [6]=LinkStatus, [7]=State
      if (cols.length < 8) continue;

      ports.push({
        name:             cols[0] ?? '',
        speed:            cols[1] ?? '',
        duplex:           cols[2] ?? '',
        physical:         cols[5] ?? '',
        hardware_address: cols[4] ?? null,
        link_status:      cols[6] ?? '',
        state:            cols[7] ?? '',
      });
    }

    return { value: { ports }, error: null };
  } catch (e) {
    return { value: { ports: [] }, error: `network: ${e instanceof Error ? e.message : String(e)}` };
  }
}
