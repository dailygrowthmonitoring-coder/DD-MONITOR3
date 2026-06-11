/**
 * Parses storage totals and compression ratios from the SERVER USAGE section.
 *
 * Storage — Active Tier table (split on 2+ spaces):
 *   /data: pre-comp           -   423971.7           -      -                -
 *   /data: post-comp    63988.6    18941.9     45046.7    30%            755.4
 *   * Estimated based on last cleaning of 2025/03/04 08:25:28.
 *
 * Filesys Compression table:
 *   From: 2025-03-03 06:00 To: 2025-03-10 06:00
 *   Currently Used:*   423971.7     18941.9             -            -    22.4x (95.5)
 *    Last 7 days        8585.1      1054.5          7.6x         1.1x     8.1x (87.7)
 *    Last 24 hrs         645.6       126.9          5.0x         1.0x     5.1x (80.3)
 */

import type { StorageData, CompressionData, CompressionPeriod, SectionResult } from '../types';
import { extractSection, splitColumns } from '../utils/normalize';
import { parseNumber, parseCompressionCell, parseFactor } from '../utils/numbers';
import { parseDate } from '../utils/dates';

export function parseServerUsage(lines: string[]): {
  storage: SectionResult<StorageData>;
  compression: SectionResult<CompressionData>;
} {
  try {
    const section = extractSection(lines, 'SERVER USAGE');
    if (section.length === 0) {
      const e = 'SERVER USAGE section not found';
      return {
        storage:     { value: null, error: e },
        compression: { value: null, error: e },
      };
    }

    // ── Storage ────────────────────────────────────────────────────────────
    let total_gib: number | null = null;
    let used_gib: number | null = null;
    let available_gib: number | null = null;
    let used_percent: number | null = null;
    let cleanable_gib: number | null = null;
    let pre_comp_gib: number | null = null;
    let last_cleaning: string | null = null;

    for (const line of section) {
      if (line.startsWith('/data: pre-comp')) {
        const cols = splitColumns(line);
        // cols: ["/data: pre-comp", "-", "423971.7", "-", "-", "-"]
        // pre_comp is cols[2] (Used GiB column of pre-comp row)
        pre_comp_gib = parseNumber(cols[2] ?? '-');
      } else if (line.startsWith('/data: post-comp')) {
        const cols = splitColumns(line);
        // cols: ["/data: post-comp", "63988.6", "18941.9", "45046.7", "30%", "755.4"]
        total_gib     = parseNumber(cols[1] ?? '-');
        used_gib      = parseNumber(cols[2] ?? '-');
        available_gib = parseNumber(cols[3] ?? '-');
        used_percent  = parseNumber(cols[4] ?? '-');  // strips "%" suffix
        cleanable_gib = parseNumber(cols[5] ?? '-');
      } else if (line.includes('last cleaning of')) {
        // "* Estimated based on last cleaning of 2025/03/04 08:25:28."
        const m = /last cleaning of\s+([\d/: ]+)/.exec(line);
        if (m?.[1]) {
          last_cleaning = parseDate(m[1].trim().replace(/\.$/, ''));
        }
      }
    }

    const storage: StorageData = {
      total_gib, used_gib, available_gib, used_percent,
      cleanable_gib, pre_comp_gib, last_cleaning,
    };

    // ── Compression ────────────────────────────────────────────────────────
    let period_from: string | null = null;
    let period_to:   string | null = null;

    // Currently Used fields
    let cu_pre: number | null = null;
    let cu_post: number | null = null;
    let cu_total_factor: number | null = null;
    let cu_reduction: number | null = null;

    // Last 7 days
    let d7_pre: number | null = null;
    let d7_post: number | null = null;
    let d7_global: number | null = null;
    let d7_local: number | null = null;
    let d7_total: number | null = null;
    let d7_red: number | null = null;

    // Last 24 hours
    let d1_pre: number | null = null;
    let d1_post: number | null = null;
    let d1_global: number | null = null;
    let d1_local: number | null = null;
    let d1_total: number | null = null;
    let d1_red: number | null = null;

    for (const line of section) {
      // From/To period line
      if (line.startsWith('From:')) {
        const m = /From:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+To:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/.exec(line);
        if (m) {
          period_from = parseDate(m[1] ?? '');
          period_to   = parseDate(m[2] ?? '');
        }
        continue;
      }

      // Currently Used row — starts with "Currently Used"
      if (/^Currently Used/i.test(line)) {
        const cols = splitColumns(line);
        // cols: ["Currently Used:*", "423971.7", "18941.9", "-", "-", "22.4x (95.5)"]
        cu_pre  = parseNumber(cols[1] ?? '-');
        cu_post = parseNumber(cols[2] ?? '-');
        // cols[3] = Global, cols[4] = Local (both "-" for currently used)
        const totalCell = parseCompressionCell(cols[5] ?? '-');
        if (totalCell) { cu_total_factor = totalCell.factor; cu_reduction = totalCell.reduction; }
        continue;
      }

      // Last 7 days
      if (/Last\s+7\s+days/i.test(line)) {
        const cols = splitColumns(line);
        // cols: ["Last 7 days", "8585.1", "1054.5", "7.6x", "1.1x", "8.1x (87.7)"]
        d7_pre    = parseNumber(cols[1] ?? '-');
        d7_post   = parseNumber(cols[2] ?? '-');
        d7_global = parseFactor(cols[3] ?? '-');
        d7_local  = parseFactor(cols[4] ?? '-');
        const cell7 = parseCompressionCell(cols[5] ?? '-');
        if (cell7) { d7_total = cell7.factor; d7_red = cell7.reduction; }
        continue;
      }

      // Last 24 hrs
      if (/Last\s+24\s+hr/i.test(line)) {
        const cols = splitColumns(line);
        d1_pre    = parseNumber(cols[1] ?? '-');
        d1_post   = parseNumber(cols[2] ?? '-');
        d1_global = parseFactor(cols[3] ?? '-');
        d1_local  = parseFactor(cols[4] ?? '-');
        const cell1 = parseCompressionCell(cols[5] ?? '-');
        if (cell1) { d1_total = cell1.factor; d1_red = cell1.reduction; }
        continue;
      }
    }

    // Build compression result — require all mandatory fields
    let compressionResult: SectionResult<CompressionData>;
    if (
      period_from && period_to &&
      cu_pre !== null && cu_post !== null &&
      cu_total_factor !== null && cu_reduction !== null &&
      d7_pre !== null && d7_post !== null && d7_total !== null && d7_red !== null &&
      d1_pre !== null && d1_post !== null && d1_total !== null && d1_red !== null
    ) {
      const last_7_days: CompressionPeriod = {
        pre_comp_gib:    d7_pre,
        post_comp_gib:   d7_post,
        global_factor:   d7_global,
        local_factor:    d7_local,
        total_factor:    d7_total,
        reduction_percent: d7_red,
      };
      const last_24_hours: CompressionPeriod = {
        pre_comp_gib:    d1_pre,
        post_comp_gib:   d1_post,
        global_factor:   d1_global,
        local_factor:    d1_local,
        total_factor:    d1_total,
        reduction_percent: d1_red,
      };
      compressionResult = {
        value: {
          period_from,
          period_to,
          currently_used: {
            pre_comp_gib:    cu_pre,
            post_comp_gib:   cu_post,
            total_factor:    cu_total_factor,
            reduction_percent: cu_reduction,
          },
          last_7_days,
          last_24_hours,
        },
        error: null,
      };
    } else {
      compressionResult = { value: null, error: 'Incomplete Filesys Compression data' };
    }

    return {
      storage:     { value: storage, error: null },
      compression: compressionResult,
    };
  } catch (e) {
    const msg = `server-usage: ${e instanceof Error ? e.message : String(e)}`;
    return {
      storage:     { value: null, error: msg },
      compression: { value: null, error: msg },
    };
  }
}
