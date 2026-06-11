/**
 * Parses device identity and report metadata from the GENERAL INFO section.
 *
 * Source format — KEY=VALUE lines, one per logical line (blank lines between):
 *   GENERATED_ON=Mon Mar 10 06:48:00 AST 2025
 *   GENERATED_EPOCH_TIME=1741578480
 *   TIME_ZONE=Asia/Baghdad
 *   VERSION=Data Domain OS 6.2.0.30-629757
 *   SYSTEM_SERIALNO=CKM00193901494
 *   CHASSIS_SERIALNO=FCNCS190702089
 *   MODEL_NO=DD6300
 *   HW_REVISION=1
 *   DATA_ENCRYPTION_ENABLED=Yes
 *   SSD_SHELF_PRESENT=NO
 *   HOSTNAME=DD6300BSR.iq.zain.com
 *   LOCATION=Basra
 *   ADMIN_EMAIL=DD6300BSR@iq.zain.com
 *   HA_ENABLED=false
 *   UPTIME= 06:48:03 up 1754 days, 16:17,  0 users,  load average: 3.31, 3.06, 3.16
 */

import type { ReportMeta, SectionResult } from '../types';
import { extractSection } from '../utils/normalize';
import { parseDate } from '../utils/dates';

function parseBoolean(v: string): boolean {
  const s = v.toLowerCase().trim();
  return s === 'yes' || s === 'true';
}

/** Split a KEY=VALUE line on the first `=` only. */
function splitKV(line: string): [string, string] | null {
  const eq = line.indexOf('=');
  if (eq === -1) return null;
  return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
}

export function parseGeneralInfo(lines: string[]): SectionResult<ReportMeta> {
  try {
    const section = extractSection(lines, 'GENERAL INFO');
    if (section.length === 0) {
      return { value: null, error: 'GENERAL INFO section not found' };
    }

    const kv: Map<string, string> = new Map();
    for (const line of section) {
      const pair = splitKV(line);
      if (pair !== null) kv.set(pair[0].toUpperCase(), pair[1]);
    }

    // GENERATED_ON — required
    const rawGenOn = kv.get('GENERATED_ON') ?? '';
    const generated_on = parseDate(rawGenOn);
    if (!generated_on) {
      return { value: null, error: `Could not parse GENERATED_ON: "${rawGenOn}"` };
    }

    // HOSTNAME — required
    const hostname = (kv.get('HOSTNAME') ?? '').trim();
    if (!hostname) {
      return { value: null, error: 'HOSTNAME not found in GENERAL INFO' };
    }

    // GENERATED_EPOCH_TIME
    const epochRaw = kv.get('GENERATED_EPOCH_TIME') ?? '';
    const generated_epoch = epochRaw ? parseInt(epochRaw, 10) || null : null;

    // UPTIME — "... up 1754 days, ..."
    const uptimeRaw = kv.get('UPTIME') ?? '';
    const uptimeMatch = /up\s+(\d+)\s+days/i.exec(uptimeRaw);
    const uptime_days = uptimeMatch?.[1] !== undefined ? parseInt(uptimeMatch[1], 10) : null;

    return {
      value: {
        generated_on,
        generated_epoch,
        timezone: kv.get('TIME_ZONE') ?? 'UTC',
        hostname,
        location: kv.get('LOCATION') ?? null,
        model: kv.get('MODEL_NO') ?? null,
        os_version: kv.get('VERSION') ?? null,
        serial_number: kv.get('SYSTEM_SERIALNO') ?? null,
        chassis_serial: kv.get('CHASSIS_SERIALNO') ?? null,
        hw_revision: kv.get('HW_REVISION') ?? null,
        admin_email: kv.get('ADMIN_EMAIL') ?? null,
        uptime_days,
        data_encryption_enabled: parseBoolean(kv.get('DATA_ENCRYPTION_ENABLED') ?? 'no'),
        ssd_shelf_present: parseBoolean(kv.get('SSD_SHELF_PRESENT') ?? 'no'),
        ha_enabled: parseBoolean(kv.get('HA_ENABLED') ?? 'false'),
      },
      error: null,
    };
  } catch (e) {
    return { value: null, error: `general-info: ${e instanceof Error ? e.message : String(e)}` };
  }
}
