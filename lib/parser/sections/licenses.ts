/**
 * Parses capacity and feature licenses from the SOFTWARE CONFIGURATION section.
 *
 * System locking-id: CKM00193901494
 *
 * Capacity licenses (split on 2+ spaces):
 *   ##   Feature           Shelf Model   Capacity    Type        State    Expiration Date   Note
 *   --   ---------------   -----------   ---------   ---------   ------   ---------------   ----
 *   1    CAPACITY-ACTIVE   ES30          32.74 TiB   permanent   active   n/a
 *   2    SSD-CAPACITY      n/a           0.72 TiB    permanent   active   n/a
 *
 * Licensed Active Tier capacity: 32.74 TiB*
 *
 * Feature licenses (split on 2+ spaces):
 *   ##   Feature                     Count   Type        State    Expiration Date   Note
 *   --   -------------------------   -----   ---------   ------   ---------------   ----
 *   1    REPLICATION                     1   permanent   active   n/a
 *   ...
 *   8    RETENTION-LOCK-COMPLIANCE       1   permanent   active   n/a
 */

import type { LicensesData, CapacityLicense, FeatureLicense, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseNumber } from '../utils/numbers';
import { parseCapacityToGib } from '../utils/numbers';

export function parseLicenses(lines: string[]): SectionResult<LicensesData> {
  try {
    const section = extractSection(lines, 'SOFTWARE CONFIGURATION');
    if (section.length === 0) {
      return { value: null, error: 'SOFTWARE CONFIGURATION section not found' };
    }

    // System locking-id
    let locking_id: string | null = null;
    for (const line of section) {
      const m = /System locking-id:\s*(\S+)/i.exec(line);
      if (m?.[1]) { locking_id = m[1]; break; }
    }

    // Licensed Active Tier capacity (TiB)
    let licensed_active_tier_tib: number | null = null;
    for (const line of section) {
      const m = /Licensed Active Tier capacity:\s*([\d.]+)\s*TiB/i.exec(line);
      if (m?.[1]) { licensed_active_tier_tib = parseFloat(m[1]); break; }
    }

    // ── Capacity licenses ──────────────────────────────────────────────────
    const capacity: CapacityLicense[] = [];
    let inCapacity = false;
    let pastCapDash = false;
    const dashRe = /^-{2,}/;

    for (const line of section) {
      if (/^Capacity licenses:/i.test(line)) { inCapacity = true; pastCapDash = false; continue; }
      if (/^Feature licenses:/i.test(line)) { inCapacity = false; continue; }
      if (!inCapacity) continue;

      if (dashRe.test(line)) {
        if (!pastCapDash) pastCapDash = true;
        else inCapacity = false;
        continue;
      }
      if (!pastCapDash) continue;

      const cols = splitColumns(line);
      // cols: ["1", "CAPACITY-ACTIVE", "ES30", "32.74 TiB", "permanent", "active", "n/a"]
      if (cols.length < 6) continue;
      const feature     = cols[1] ?? '';
      const shelf_model = cols[2] ?? '';
      const capRaw      = cols[3] ?? '';
      const type        = cols[4] ?? '';
      const state       = cols[5] ?? '';
      if (!feature) continue;

      // capacity_tib: parse TiB value directly from "32.74 TiB"
      const tibMatch = /^([\d.]+)\s*TiB$/i.exec(capRaw);
      const capacity_tib = tibMatch?.[1] !== undefined ? parseFloat(tibMatch[1]) : (parseCapacityToGib(capRaw) ?? 0) / 1024;

      capacity.push({ feature, shelf_model, capacity_tib, type, state });
    }

    // ── Feature licenses ───────────────────────────────────────────────────
    const features: FeatureLicense[] = [];
    let inFeature = false;
    let pastFeatDash = false;

    for (const line of section) {
      if (/^Feature licenses:/i.test(line)) { inFeature = true; pastFeatDash = false; continue; }
      if (!inFeature) continue;

      if (dashRe.test(line)) {
        if (!pastFeatDash) pastFeatDash = true;
        else inFeature = false;
        continue;
      }
      if (!pastFeatDash) continue;

      const cols = splitColumns(line);
      // cols: ["1", "REPLICATION", "1", "permanent", "active", "n/a"]
      if (cols.length < 5) continue;
      const feature = cols[1] ?? '';
      const count   = parseNumber(cols[2] ?? '0') ?? 1;
      const type    = cols[3] ?? '';
      const state   = cols[4] ?? '';
      if (!feature) continue;
      features.push({ feature, count, type, state });
    }

    return {
      value: { locking_id, capacity, features, licensed_active_tier_tib },
      error: null,
    };
  } catch (e) {
    return { value: null, error: `licenses: ${e instanceof Error ? e.message : String(e)}` };
  }
}
