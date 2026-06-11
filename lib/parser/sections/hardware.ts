/**
 * Parses BIOS, BMC, CPU, and memory DIMM data from HARDWARE CONFIGURATION.
 *
 * Key source lines:
 *   BMC
 *    Firmware Revision     : 13.80
 *   BIOS
 *    Version: 37.69
 *   CPU
 *    Model name        : Intel(R) Xeon(R) CPU E5-2620 v3 @ 2.40GHz
 *   Memory Device         ← repeated block, count them; each has "Size: 8192 MB"
 *    Size: 8192 MB
 */

import type { HardwareData, SectionResult } from '../types';
import { extractSection } from '../utils/normalize';

export function parseHardware(lines: string[]): SectionResult<HardwareData> {
  try {
    const section = extractSection(lines, 'HARDWARE CONFIGURATION');
    if (section.length === 0) {
      return { value: null, error: 'HARDWARE CONFIGURATION section not found' };
    }

    let bios_version: string | null = null;
    let bmc_firmware: string | null = null;
    let cpu_model: string | null = null;
    let memory_dimms = 0;
    let memory_dimm_size_mb: number | null = null;

    let inBmc = false;
    let inBios = false;
    let inCpu = false;
    let inMemDevice = false;

    for (const line of section) {
      // Section delimiters (plain uppercase labels)
      if (line === 'BMC')    { inBmc = true;  inBios = false; inCpu = false; inMemDevice = false; continue; }
      if (line === 'BIOS')   { inBios = true; inBmc = false;  inCpu = false; inMemDevice = false; continue; }
      if (line === 'CPU')    { inCpu = true;  inBmc = false;  inBios = false; inMemDevice = false; continue; }
      if (line === 'Memory Device') {
        memory_dimms++;
        inMemDevice = true; inBmc = false; inBios = false; inCpu = false;
        continue;
      }
      // Any other plain uppercase label ends current context
      if (/^[A-Z][A-Z ]+$/.test(line) && !line.startsWith(' ')) {
        inBmc = false; inBios = false; inCpu = false; inMemDevice = false;
        continue;
      }

      if (inBmc && bmc_firmware === null) {
        const m = /Firmware Revision\s*:\s*([\d.]+)/i.exec(line);
        if (m?.[1]) { bmc_firmware = m[1]; inBmc = false; }
      }
      if (inBios && bios_version === null) {
        const m = /Version:\s*([\d.]+)/i.exec(line);
        if (m?.[1]) { bios_version = m[1]; inBios = false; }
      }
      if (inCpu && cpu_model === null) {
        const m = /Model name\s*:\s*(.+)/i.exec(line);
        if (m?.[1]) { cpu_model = m[1].trim(); inCpu = false; }
      }
      if (inMemDevice && memory_dimm_size_mb === null) {
        const m = /Size:\s*(\d+)\s*MB/i.exec(line);
        if (m?.[1]) { memory_dimm_size_mb = parseInt(m[1], 10); }
      }
    }

    return {
      value: { bios_version, bmc_firmware, cpu_model, memory_dimms: memory_dimms || null, memory_dimm_size_mb },
      error: null,
    };
  } catch (e) {
    return { value: null, error: `hardware: ${e instanceof Error ? e.message : String(e)}` };
  }
}
