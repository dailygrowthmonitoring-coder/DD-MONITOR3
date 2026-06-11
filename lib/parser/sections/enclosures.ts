/**
 * Parses enclosure data from the GENERAL STATUS section.
 *
 * Enclosure Show Summary (summary table):
 *   Enclosure   Model No.   Serial No.       State    OEM Name   OEM Value   Capacity
 *   ---------   ---------   --------------   ------   --------   ---------   --------
 *   1           DD6300      FCNCS190702089   Online                          14 Slots
 *   2           ES30        CK200194722389   Online                          15 Slots
 *
 * Enclosure Show All (per-enclosure detail blocks):
 *   Enclosure 1
 *     Fans
 *       -----------   -----   ------
 *       FAN 0A        low     OK
 *       ...
 *     Temperature
 *       -----------------------   -------   ------
 *       Ambient Temperature       16/61     OK
 *       ...
 *     Power Supply
 *       --------------   ------
 *       Power module 0   OK
 *       ...
 *
 *   Enclosure 2
 *     Fans / Temperature / Power Supply (same structure)
 */

import type { EnclosureData, FanEntry, TemperatureEntry, PowerSupplyEntry, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';

/**
 * Parse data rows from a 3-dash table starting at `start` in `lines`.
 * Skips 2 dashes lines (section underline + column underline) before collecting.
 */
function tableRowsBetweenDashes(lines: string[], start: number): { rows: string[]; endIdx: number } {
  const dashRe = /^-{3,}/;
  let dashCount = 0;
  let dataStart = -1;
  for (let i = start; i < lines.length; i++) {
    if (dashRe.test(lines[i] ?? '')) {
      dashCount++;
      if (dashCount === 2) { dataStart = i + 1; break; }
    }
  }
  if (dataStart === -1) return { rows: [], endIdx: start };
  const rows: string[] = [];
  let endIdx = dataStart;
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (dashRe.test(line)) { endIdx = i; break; }
    if (line.length > 0) rows.push(line);
    endIdx = i + 1;
  }
  return { rows, endIdx };
}

export function parseEnclosures(lines: string[]): SectionResult<readonly EnclosureData[]> {
  try {
    const section = extractSection(lines, 'GENERAL STATUS');
    if (section.length === 0) {
      return { value: [], error: 'GENERAL STATUS section not found for enclosures' };
    }

    // ── Enclosure Show Summary ─────────────────────────────────────────────
    const summaryMap = new Map<number, { model: string; serial: string; state: string; slots: number }>();
    let summaryIdx = -1;
    for (let i = 0; i < section.length; i++) {
      if ((section[i] ?? '').toLowerCase() === 'enclosure show summary') {
        summaryIdx = i;
        break;
      }
    }
    if (summaryIdx !== -1) {
      const { rows } = tableRowsBetweenDashes(section, summaryIdx + 1);
      for (const row of rows) {
        const cols = splitColumns(row);
        // cols: [id, model, serial, state, ..., "N Slots"]
        if (cols.length < 4) continue;
        const id = parseInt(cols[0] ?? '0', 10);
        if (isNaN(id) || id === 0) continue;
        const model  = cols[1] ?? '';
        const serial = cols[2] ?? '';
        const state  = cols[3] ?? '';
        // Capacity is the last column, formatted as "14 Slots"
        const lastCol = cols[cols.length - 1] ?? '';
        const slotsMatch = /^(\d+)\s+Slots?$/i.exec(lastCol);
        const slots = slotsMatch?.[1] !== undefined ? parseInt(slotsMatch[1], 10) : 0;
        summaryMap.set(id, { model, serial, state, slots });
      }
    }

    // ── Enclosure Show All ─────────────────────────────────────────────────
    // Each enclosure block starts with "Enclosure N"
    const enclosureBlocks = new Map<number, string[]>();
    let currentEncId = -1;
    let inAll = false;
    for (const line of section) {
      if ((line ?? '').toLowerCase() === 'enclosure show all') { inAll = true; continue; }
      if (!inAll) continue;
      // New enclosure block
      const encHeader = /^Enclosure\s+(\d+)$/i.exec(line ?? '');
      if (encHeader?.[1] !== undefined) {
        currentEncId = parseInt(encHeader[1], 10);
        enclosureBlocks.set(currentEncId, []);
        continue;
      }
      if (currentEncId > 0) {
        const arr = enclosureBlocks.get(currentEncId);
        if (arr !== undefined) arr.push(line ?? '');
      }
    }

    // Build final enclosures array
    const enclosures: EnclosureData[] = [];
    const allIds = new Set([...summaryMap.keys(), ...enclosureBlocks.keys()]);

    for (const id of [...allIds].sort((a, b) => a - b)) {
      const summary = summaryMap.get(id);
      const blockLines = enclosureBlocks.get(id) ?? [];

      // Parse fans, temperatures, power supplies from block
      const fans: FanEntry[] = [];
      const temperatures: TemperatureEntry[] = [];
      const power_supplies: PowerSupplyEntry[] = [];

      let mode: 'fans' | 'temp' | 'power' | null = null;
      const dashRe = /^-{3,}/;
      let pastFirstDash = false;

      for (const line of blockLines) {
        const lower = line.toLowerCase();
        if (lower === 'fans') { mode = 'fans'; pastFirstDash = false; continue; }
        if (lower === 'temperature') { mode = 'temp'; pastFirstDash = false; continue; }
        if (lower === 'power supply') { mode = 'power'; pastFirstDash = false; continue; }
        if (lower === 'chassis:' || lower === 'controller:' || lower === 'cpus:' || lower === 'memory dimms:') {
          mode = null; continue;
        }
        if (mode === null) continue;

        if (dashRe.test(line)) {
          if (!pastFirstDash) { pastFirstDash = true; }
          else { mode = null; }  // closing dashes
          continue;
        }
        if (!pastFirstDash) continue;

        const cols = splitColumns(line);
        if (mode === 'fans' && cols.length >= 3) {
          fans.push({ description: cols[0] ?? '', level: cols[1] ?? '', status: cols[2] ?? '' });
        } else if (mode === 'temp' && cols.length >= 3) {
          temperatures.push({ description: cols[0] ?? '', celsius: cols[1] ?? '', status: cols[2] ?? '' });
        } else if (mode === 'power' && cols.length >= 2) {
          power_supplies.push({ description: cols[0] ?? '', status: cols[1] ?? '' });
        }
      }

      enclosures.push({
        id,
        model:  summary?.model  ?? '',
        serial: summary?.serial ?? '',
        state:  summary?.state  ?? '',
        slots:  summary?.slots  ?? 0,
        fans,
        temperatures,
        power_supplies,
      });
    }

    return { value: enclosures, error: null };
  } catch (e) {
    return { value: [], error: `enclosures: ${e instanceof Error ? e.message : String(e)}` };
  }
}
