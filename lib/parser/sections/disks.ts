/**
 * Parses per-disk hardware details from Disk Show Hardware in HARDWARE CONFIGURATION.
 *
 * Table format (split on 2+ spaces):
 *   Disk         Slot   Manufacturer/Model         Firmware   Serial No.     Capacity    Type
 *   (enc/disk)
 *   ----------   ----   ------------------------   --------   ------------   ---------   -------
 *   1.1          0      SEAGATE STMFSND2CLAR4000   BS03       ZC1B4W1Y       3.6 TiB     SAS
 *   1.13         13     SAMSUNG P045S800_CLAR800   ESF7       28NA0M802665   745.2 GiB   SAS-SSD
 *   2.1          0      HITACHI HUS72303CLAR3000   C310       YXGSJN9K       2.7 TiB     SAS
 *   ----------   ----   ------------------------   --------   ------------   ---------   -------
 *   28 drives present.
 *
 * Capacity conversion:
 *   "3.6 TiB"   →  3686.4 GiB  (×1024, rounded to 1 decimal)
 *   "2.7 TiB"   →  2764.8 GiB
 *   "745.2 GiB" →  745.2  GiB  (kept as-is)
 */

import type { DiskDrive, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseCapacityToGib } from '../utils/numbers';

export function parseDisks(lines: string[]): SectionResult<readonly DiskDrive[]> {
  try {
    const section = extractSection(lines, 'HARDWARE CONFIGURATION');
    if (section.length === 0) {
      return { value: [], error: 'HARDWARE CONFIGURATION section not found' };
    }

    // Find "Disk Show Hardware" subsection
    let headerIdx = -1;
    for (let i = 0; i < section.length; i++) {
      if ((section[i] ?? '').toLowerCase() === 'disk show hardware') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      return { value: [], error: 'Disk Show Hardware not found in HARDWARE CONFIGURATION' };
    }

    const dashRe = /^-{3,}/;
    // 3-dash table: section underline + column header rows + column underline, then data
    // Skip 2 dashes lines to land directly on data rows
    let dashCount = 0;
    let dataStart = -1;
    for (let i = headerIdx + 1; i < section.length; i++) {
      if (dashRe.test(section[i] ?? '')) {
        dashCount++;
        if (dashCount === 2) { dataStart = i + 1; break; }
      }
    }
    if (dataStart === -1) return { value: [], error: 'Disk Show Hardware: table dashes not found' };

    const drives: DiskDrive[] = [];
    for (let i = dataStart; i < section.length; i++) {
      const line = section[i] ?? '';
      if (dashRe.test(line)) break;
      if (!line.length) continue;

      const cols = splitColumns(line);
      // cols: ["1.1", "0", "SEAGATE STMFSND2CLAR4000", "BS03", "ZC1B4W1Y", "3.6 TiB", "SAS"]
      if (cols.length < 7) continue;

      const diskRef = cols[0] ?? '';          // "1.1", "1.13", "2.15"
      const parts = diskRef.split('.');
      const enclosure = parseInt(parts[0] ?? '0', 10);
      const disk_number = parseInt(parts[1] ?? '0', 10);
      if (isNaN(enclosure) || isNaN(disk_number)) continue;

      const slot = parseInt(cols[1] ?? '0', 10);
      const manufacturer_model = cols[2] ?? '';
      const firmware = cols[3] ?? '';
      const serial   = cols[4] ?? '';
      const capacityRaw = cols[5] ?? '';
      const type    = cols[6] ?? '';

      const capacity_gib = parseCapacityToGib(capacityRaw) ?? 0;

      drives.push({ enclosure, disk_number, slot, manufacturer_model, firmware, serial, capacity_gib, type });
    }

    return { value: drives, error: null };
  } catch (e) {
    return { value: [], error: `disks: ${e instanceof Error ? e.message : String(e)}` };
  }
}
