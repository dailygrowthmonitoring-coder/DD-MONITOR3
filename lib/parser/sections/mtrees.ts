/**
 * Parses per-MTree data from three sources in DETAILED FILESYSTEM LAYER:
 *
 * 1. DM ASTATS inode map — provides mtree_id for each named mtree:
 *      DM ASTATS -- uptime=151603490s, mtree_count=2, ...
 *      0: Utree,1574169455,...
 *      1: backup,1574169456,...
 *      2: ntrkbsr_new,1589978419,...
 *
 * 2. Mtree List — provides name, pre_comp_gib, status:
 *      /data/col1/backup                   0.0   RW
 *      /data/col1/ntrkbsr_new         423971.7   RW
 *
 * 3. Mtree Show Compression — provides per-mtree compression for 24h and 7d:
 *      /data/col1/backup            -  -  -  -  -  -  -  -  -  -
 *      /data/col1/ntrkbsr_new   645.6   126.9   5.0   1.0   5.1(80.3)   8585.1   1054.5   7.6   1.1   8.1(87.7)
 *
 * NOTE: Mtree Show Compression uses "5.1(80.3)" — no space before the paren.
 */

import type { MTreeData, MTreeCompression, MTreeCompressionPeriod, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseNumber, parseCompressionCell, parseFactor } from '../utils/numbers';

/** Build name→id map from DM ASTATS block. */
function buildIdMap(section: string[]): Map<string, string> {
  const map = new Map<string, string>();
  // Lines look like: "1: backup,1574169456,#Inode=..."
  for (const line of section) {
    const m = /^\d+:\s+(\w+),(\d+),/.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

function parsePeriod(
  pre: string, post: string, global: string, local: string, total: string
): MTreeCompressionPeriod | null {
  if (pre === '-') return null;
  const preN  = parseNumber(pre);
  const postN = parseNumber(post);
  const cell  = parseCompressionCell(total);
  if (preN === null || postN === null || cell === null) return null;
  return {
    pre_comp_gib:    preN,
    post_comp_gib:   postN,
    global_factor:   parseFactor(global),
    local_factor:    parseFactor(local),
    total_factor:    cell.factor,
    reduction_percent: cell.reduction,
  };
}

export function parseMtrees(lines: string[]): SectionResult<readonly MTreeData[]> {
  try {
    const section = extractSection(lines, 'DETAILED FILESYSTEM LAYER');
    if (section.length === 0) {
      return { value: [], error: 'DETAILED FILESYSTEM LAYER section not found' };
    }

    // ── DM ASTATS id map ───────────────────────────────────────────────────
    const idMap = buildIdMap(section);

    // ── Mtree List ─────────────────────────────────────────────────────────
    let listHeaderIdx = -1;
    for (let i = 0; i < section.length; i++) {
      if ((section[i] ?? '').toLowerCase() === 'mtree list') { listHeaderIdx = i; break; }
    }
    if (listHeaderIdx === -1) return { value: [], error: 'Mtree List not found' };

    const dashRe = /^-{3,}/;
    // 3-dash table: skip 2 dashes (section underline + column underline) to reach data
    let dashCount = 0;
    let dataStart = -1;
    for (let i = listHeaderIdx + 1; i < section.length; i++) {
      if (dashRe.test(section[i] ?? '')) {
        dashCount++;
        if (dashCount === 2) { dataStart = i + 1; break; }
      }
    }
    if (dataStart === -1) return { value: [], error: 'Mtree List: table not found' };

    const listRows: Array<{ name: string; pre_comp_gib: number; status: string }> = [];
    for (let i = dataStart; i < section.length; i++) {
      const line = section[i] ?? '';
      if (dashRe.test(line)) break;
      if (!line.startsWith('/data/')) continue;
      const cols = splitColumns(line);
      // cols: ["/data/col1/ntrkbsr_new", "423971.7", "RW"]
      if (cols.length < 2) continue;
      const name = cols[0] ?? '';
      const pre  = parseNumber(cols[1] ?? '-') ?? 0;
      // Status may not appear in all rows; default to first non-numeric, non-dash token
      const statusRaw = cols.slice(2).find(c => /^[A-Z]/.test(c)) ?? cols[2] ?? 'RW';
      listRows.push({ name, pre_comp_gib: pre, status: statusRaw.split(/\s+/)[0] ?? statusRaw });
    }

    // ── Mtree Show Compression ─────────────────────────────────────────────
    let compHeaderIdx = -1;
    for (let i = 0; i < section.length; i++) {
      if ((section[i] ?? '').toLowerCase() === 'mtree show compression') { compHeaderIdx = i; break; }
    }

    const compressionMap = new Map<string, MTreeCompression>();
    if (compHeaderIdx !== -1) {
      // Mtree Show Compression also has a 3-dash structure — skip 2 dashes
      let compDashCount = 0;
      let compDataStart = -1;
      for (let i = compHeaderIdx + 1; i < section.length; i++) {
        if (dashRe.test(section[i] ?? '')) {
          compDashCount++;
          if (compDashCount === 2) { compDataStart = i + 1; break; }
        }
      }
      if (compDataStart !== -1) {
        for (let i = compDataStart; i < section.length; i++) {
          const line = section[i] ?? '';
          if (dashRe.test(line)) break;
          if (!line.startsWith('/data/')) continue;
          const cols = splitColumns(line);
          // cols[0]=name, [1-5]=24h fields, [6-10]=7d fields
          if (cols.length < 11) continue;
          const name = cols[0] ?? '';
          const p24 = parsePeriod(cols[1] ?? '-', cols[2] ?? '-', cols[3] ?? '-', cols[4] ?? '-', cols[5] ?? '-');
          const p7d = parsePeriod(cols[6] ?? '-', cols[7] ?? '-', cols[8] ?? '-', cols[9] ?? '-', cols[10] ?? '-');
          if (p24 !== null && p7d !== null) {
            compressionMap.set(name, { last_24h: p24, last_7d: p7d });
          }
        }
      }
    }

    // ── Assemble ───────────────────────────────────────────────────────────
    if (listRows.length === 0) return { value: [], error: 'No rows found in Mtree List' };

    const mtrees: MTreeData[] = listRows.map(r => {
      // Short name (last path segment) for id lookup
      const shortName = r.name.split('/').pop() ?? '';
      return {
        name:         r.name,
        mtree_id:     idMap.get(shortName) ?? null,
        status:       r.status,
        pre_comp_gib: r.pre_comp_gib,
        compression:  compressionMap.get(r.name) ?? null,
      };
    });

    return { value: mtrees, error: null };
  } catch (e) {
    return { value: [], error: `mtrees: ${e instanceof Error ? e.message : String(e)}` };
  }
}
