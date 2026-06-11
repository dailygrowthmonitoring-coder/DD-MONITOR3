/**
 * Parser verification test — must fully pass before the parser is considered done.
 *
 * Reads the real details_1.txt, runs parseAutosupport(), and asserts every
 * expected value from the spec. Exits with code 1 on any failure.
 *
 * Run with: npm run test:parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseAutosupport } from '../lib/parser/index';

const SAMPLE_PATH = path.resolve(__dirname, '../../DATA_DOMAIN_INFO/details_1.txt');

// ── Harness ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, extra?: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
    failed++;
  }
}

function assertEq<T>(label: string, actual: T, expected: T): void {
  const ok = actual === expected;
  assert(label, ok, ok ? '' : `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

// ── Load file ────────────────────────────────────────────────────────────────
const rawText = fs.readFileSync(SAMPLE_PATH, 'utf-8');
console.log(`\nRead ${rawText.length.toLocaleString()} chars (${(rawText.length / 1_048_576).toFixed(2)} MiB)`);

const t0 = Date.now();
const result = parseAutosupport(rawText);
const elapsed = Date.now() - t0;
console.log(`Parsed in ${elapsed}ms\n`);

if (result.parse_errors.length > 0) {
  console.log('Parse errors:');
  result.parse_errors.forEach(e => console.error(`  [${e.section}] ${e.message}`));
  console.log();
}
console.log(`Sections found: ${result.sections_found.join(', ')}\n`);

const { data } = result;

// ── Top-level ───────────────────────────────────────────────────────────────
console.log('── Top-level ──');
assert('success = true', result.success);
assertEq('parse_errors.length = 0', result.parse_errors.length, 0);

// ── meta ─────────────────────────────────────────────────────────────────────
console.log('\n── meta ──');
assertEq('meta.hostname',       data.meta.hostname,       'DD6300BSR.iq.zain.com');
assertEq('meta.location',       data.meta.location,       'Basra');
assertEq('meta.model',          data.meta.model,          'DD6300');
assertEq('meta.serial_number',  data.meta.serial_number,  'CKM00193901494');
assertEq('meta.chassis_serial', data.meta.chassis_serial, 'FCNCS190702089');
assertEq('meta.timezone',       data.meta.timezone,       'Asia/Baghdad');
assertEq('meta.uptime_days',    data.meta.uptime_days,    1754);
assertEq('meta.data_encryption_enabled', data.meta.data_encryption_enabled, true);
assertEq('meta.ha_enabled',     data.meta.ha_enabled,     false);
assertEq('meta.generated_on',   data.meta.generated_on,   '2025-03-10T06:48:00');
assertEq('meta.generated_epoch', data.meta.generated_epoch, 1741578480);
assertEq('meta.os_version',     data.meta.os_version,     'Data Domain OS 6.2.0.30-629757');
assertEq('meta.hw_revision',    data.meta.hw_revision,    '1');
assertEq('meta.admin_email',    data.meta.admin_email,    'DD6300BSR@iq.zain.com');

// ── storage ──────────────────────────────────────────────────────────────────
console.log('\n── storage ──');
assert('storage non-null', data.storage !== null);
assertEq('storage.total_gib',     data.storage?.total_gib,     63988.6);
assertEq('storage.used_gib',      data.storage?.used_gib,      18941.9);
assertEq('storage.available_gib', data.storage?.available_gib, 45046.7);
assertEq('storage.used_percent',  data.storage?.used_percent,  30);
assertEq('storage.cleanable_gib', data.storage?.cleanable_gib, 755.4);
assertEq('storage.pre_comp_gib',  data.storage?.pre_comp_gib,  423971.7);
assertEq('storage.last_cleaning', data.storage?.last_cleaning, '2025-03-04T08:25:28');

// ── compression ──────────────────────────────────────────────────────────────
console.log('\n── compression ──');
assert('compression non-null', data.compression !== null);
assertEq('compression.period_from', data.compression?.period_from, '2025-03-03T06:00:00');
assertEq('compression.period_to',   data.compression?.period_to,   '2025-03-10T06:00:00');
assertEq('compression.currently_used.pre_comp_gib',    data.compression?.currently_used.pre_comp_gib,    423971.7);
assertEq('compression.currently_used.post_comp_gib',   data.compression?.currently_used.post_comp_gib,   18941.9);
assertEq('compression.currently_used.total_factor',    data.compression?.currently_used.total_factor,    22.4);
assertEq('compression.currently_used.reduction_percent', data.compression?.currently_used.reduction_percent, 95.5);
assertEq('compression.last_7_days.pre_comp_gib',    data.compression?.last_7_days.pre_comp_gib,    8585.1);
assertEq('compression.last_7_days.post_comp_gib',   data.compression?.last_7_days.post_comp_gib,   1054.5);
assertEq('compression.last_7_days.global_factor',   data.compression?.last_7_days.global_factor,   7.6);
assertEq('compression.last_7_days.local_factor',    data.compression?.last_7_days.local_factor,    1.1);
assertEq('compression.last_7_days.total_factor',    data.compression?.last_7_days.total_factor,    8.1);
assertEq('compression.last_7_days.reduction_percent', data.compression?.last_7_days.reduction_percent, 87.7);
assertEq('compression.last_24_hours.pre_comp_gib',    data.compression?.last_24_hours.pre_comp_gib,    645.6);
assertEq('compression.last_24_hours.post_comp_gib',   data.compression?.last_24_hours.post_comp_gib,   126.9);
assertEq('compression.last_24_hours.global_factor',   data.compression?.last_24_hours.global_factor,   5.0);
assertEq('compression.last_24_hours.local_factor',    data.compression?.last_24_hours.local_factor,    1.0);
assertEq('compression.last_24_hours.total_factor',    data.compression?.last_24_hours.total_factor,    5.1);
assertEq('compression.last_24_hours.reduction_percent', data.compression?.last_24_hours.reduction_percent, 80.3);

// ── system_health ─────────────────────────────────────────────────────────────
console.log('\n── system_health ──');
assert('system_health non-null', data.system_health !== null);
assertEq('system_health.availability_since',               data.system_health?.availability_since,               '2020-05-21T03:00:00');
assertEq('system_health.system_availability_percent',      data.system_health?.system_availability_percent,      100);
assertEq('system_health.system_availability_excl_controlled', data.system_health?.system_availability_excl_controlled, 100);
assertEq('system_health.filesystem_availability_percent',  data.system_health?.filesystem_availability_percent,  100);
assertEq('system_health.filesystem_availability_excl_controlled', data.system_health?.filesystem_availability_excl_controlled, 100);
assertEq('system_health.memory_total_mib',   data.system_health?.memory_total_mib,   48137);
assertEq('system_health.memory_free_mib',    data.system_health?.memory_free_mib,    790);
assertEq('system_health.memory_inactive_mib', data.system_health?.memory_inactive_mib, 1612);
assertEq('system_health.swap_total_mib',     data.system_health?.swap_total_mib,     5119);
assertEq('system_health.swap_free_mib',      data.system_health?.swap_free_mib,      1);
assertEq('system_health.nfs_status',         data.system_health?.nfs_status,         'active');
assertEq('system_health.cifs_status',        data.system_health?.cifs_status,        'enabled');
assert('system_health.filesystem_verify_status contains "normally"',
  (data.system_health?.filesystem_verify_status ?? '').includes('normally'));

// ── disks.summary ─────────────────────────────────────────────────────────────
console.log('\n── disks.summary ──');
assertEq('disks.summary.active_tier_total',  data.disks.summary.active_tier_total,  27);
assertEq('disks.summary.active_tier_in_use', data.disks.summary.active_tier_in_use, 25);
assertEq('disks.summary.active_tier_spare',  data.disks.summary.active_tier_spare,  2);
assertEq('disks.summary.cache_tier_in_use',  data.disks.summary.cache_tier_in_use,  1);
assertEq('disks.summary.failed_disks',       data.disks.summary.failed_disks,       0);
assertEq('disks.summary.overall_status',     data.disks.summary.overall_status,     'Normal');
assert('disks.summary.proactive_check non-null', data.disks.summary.proactive_check !== null);

// ── disks.drives ──────────────────────────────────────────────────────────────
console.log('\n── disks.drives ──');
assertEq('disks.drives.length',                  data.disks.drives.length, 28);
assertEq('drives[0].enclosure',                  data.disks.drives[0]?.enclosure,          1);
assertEq('drives[0].disk_number',                data.disks.drives[0]?.disk_number,        1);
assertEq('drives[0].slot',                       data.disks.drives[0]?.slot,               0);
assertEq('drives[0].manufacturer_model',         data.disks.drives[0]?.manufacturer_model, 'SEAGATE STMFSND2CLAR4000');
assertEq('drives[0].firmware',                   data.disks.drives[0]?.firmware,           'BS03');
assertEq('drives[0].serial',                     data.disks.drives[0]?.serial,             'ZC1B4W1Y');
assertEq('drives[0].capacity_gib',               data.disks.drives[0]?.capacity_gib,       3686.4);
assertEq('drives[0].type',                       data.disks.drives[0]?.type,               'SAS');
// SSD drive (1.13)
const ssd = data.disks.drives.find(d => d.type === 'SAS-SSD');
assert('SSD drive present (1.13)',               ssd !== undefined);
assertEq('SSD manufacturer_model',               ssd?.manufacturer_model, 'SAMSUNG P045S800_CLAR800');
assertEq('SSD capacity_gib',                     ssd?.capacity_gib,       745.2);
// HITACHI drives
const hitachi = data.disks.drives.find(d => d.manufacturer_model.startsWith('HITACHI'));
assert('HITACHI drive present',                  hitachi !== undefined);
assertEq('HITACHI capacity_gib',                 hitachi?.capacity_gib,   2764.8);

// ── enclosures ────────────────────────────────────────────────────────────────
console.log('\n── enclosures ──');
assertEq('enclosures.length',      data.enclosures.length,       2);
assertEq('enclosures[0].id',       data.enclosures[0]?.id,       1);
assertEq('enclosures[0].model',    data.enclosures[0]?.model,    'DD6300');
assertEq('enclosures[0].serial',   data.enclosures[0]?.serial,   'FCNCS190702089');
assertEq('enclosures[0].slots',    data.enclosures[0]?.slots,    14);
assertEq('enclosures[0].fans.length', data.enclosures[0]?.fans.length, 12);
assertEq('enclosures[0].temperatures.length', data.enclosures[0]?.temperatures.length, 11);
assertEq('enclosures[0].power_supplies.length', data.enclosures[0]?.power_supplies.length, 2);
assertEq('enclosures[1].id',       data.enclosures[1]?.id,       2);
assertEq('enclosures[1].model',    data.enclosures[1]?.model,    'ES30');
assertEq('enclosures[1].serial',   data.enclosures[1]?.serial,   'CK200194722389');
assertEq('enclosures[1].slots',    data.enclosures[1]?.slots,    15);

// ── network ───────────────────────────────────────────────────────────────────
console.log('\n── network ──');
assertEq('network.ports.length', data.network.ports.length, 9);
const eth1a = data.network.ports.find(p => p.name === 'eth1a');
const eth1d = data.network.ports.find(p => p.name === 'eth1d');
const ethMa = data.network.ports.find(p => p.name === 'ethMa');
assert('eth1a present', eth1a !== undefined);
assertEq('eth1a.state',       eth1a?.state,       'running');
assertEq('eth1a.link_status', eth1a?.link_status, 'yes');
assert('eth1d present', eth1d !== undefined);
assertEq('eth1d.state',       eth1d?.state,       'up');
assertEq('eth1d.link_status', eth1d?.link_status, 'no');
assert('ethMa present', ethMa !== undefined);
assertEq('ethMa.state',       ethMa?.state,       'down');

// ── alerts ────────────────────────────────────────────────────────────────────
console.log('\n── alerts ──');
assertEq('alerts.active_count', data.alerts.active_count, 1);
assertEq('alerts.active.length', data.alerts.active.length, 1);
assertEq('alerts.active[0].id',       data.alerts.active[0]?.id,       'p0-273');
assertEq('alerts.active[0].severity', data.alerts.active[0]?.severity, 'CRITICAL');
assertEq('alerts.active[0].class',    data.alerts.active[0]?.class,    'Network');
assertEq('alerts.active[0].object',   data.alerts.active[0]?.object,   'Interface Index=20');
assertEq('alerts.active[0].post_time', data.alerts.active[0]?.post_time, '2025-03-10T04:38:22');
assert('alerts.active[0].message contains EVT-NETM-00001',
  (data.alerts.active[0]?.message ?? '').includes('EVT-NETM-00001'));
assert('alerts.history.length >= 1', data.alerts.history.length >= 1);
assertEq('alerts.history[0].id',       data.alerts.history[0]?.id,        'p0-273');
assertEq('alerts.history[0].status',   data.alerts.history[0]?.status,    'active');
assertEq('alerts.history[0].clear_time', data.alerts.history[0]?.clear_time, null);

// ── mtrees ────────────────────────────────────────────────────────────────────
console.log('\n── mtrees ──');
assertEq('mtrees.length', data.mtrees.length, 2);
const backup   = data.mtrees.find(m => m.name.endsWith('/backup'));
const ntrkbsr  = data.mtrees.find(m => m.name.endsWith('/ntrkbsr_new'));
assert('mtree backup present',    backup !== undefined);
assert('mtree ntrkbsr_new present', ntrkbsr !== undefined);
assertEq('backup.mtree_id',    backup?.mtree_id,    '1574169456');
assertEq('backup.status',      backup?.status,      'RW');
assertEq('backup.pre_comp_gib', backup?.pre_comp_gib, 0.0);
assertEq('ntrkbsr_new.mtree_id',    ntrkbsr?.mtree_id,    '1589978419');
assertEq('ntrkbsr_new.pre_comp_gib', ntrkbsr?.pre_comp_gib, 423971.7);
assert('ntrkbsr_new.compression non-null', ntrkbsr?.compression !== null);
assertEq('ntrkbsr_new.compression.last_24h.pre_comp_gib',    ntrkbsr?.compression?.last_24h.pre_comp_gib,    645.6);
assertEq('ntrkbsr_new.compression.last_24h.post_comp_gib',   ntrkbsr?.compression?.last_24h.post_comp_gib,   126.9);
assertEq('ntrkbsr_new.compression.last_24h.total_factor',    ntrkbsr?.compression?.last_24h.total_factor,    5.1);
assertEq('ntrkbsr_new.compression.last_24h.reduction_percent', ntrkbsr?.compression?.last_24h.reduction_percent, 80.3);
assertEq('ntrkbsr_new.compression.last_7d.pre_comp_gib',    ntrkbsr?.compression?.last_7d.pre_comp_gib,    8585.1);
assertEq('ntrkbsr_new.compression.last_7d.total_factor',    ntrkbsr?.compression?.last_7d.total_factor,    8.1);
assertEq('ntrkbsr_new.compression.last_7d.reduction_percent', ntrkbsr?.compression?.last_7d.reduction_percent, 87.7);

// ── licenses ──────────────────────────────────────────────────────────────────
console.log('\n── licenses ──');
assert('licenses non-null', data.licenses !== null);
assertEq('licenses.locking_id',              data.licenses?.locking_id,              'CKM00193901494');
assertEq('licenses.capacity.length',         data.licenses?.capacity.length,         2);
assertEq('licenses.features.length',         data.licenses?.features.length,         8);
assertEq('licenses.licensed_active_tier_tib', data.licenses?.licensed_active_tier_tib, 32.74);
const capActive = data.licenses?.capacity.find(c => c.feature === 'CAPACITY-ACTIVE');
assert('CAPACITY-ACTIVE license present', capActive !== undefined);
assertEq('CAPACITY-ACTIVE.shelf_model',  capActive?.shelf_model,  'ES30');
assertEq('CAPACITY-ACTIVE.capacity_tib', capActive?.capacity_tib, 32.74);
assertEq('CAPACITY-ACTIVE.state',        capActive?.state,        'active');
const featRepl = data.licenses?.features.find(f => f.feature === 'REPLICATION');
assert('REPLICATION feature license present', featRepl !== undefined);
assertEq('REPLICATION.count', featRepl?.count, 1);
assertEq('REPLICATION.state', featRepl?.state, 'active');

// ── replication ───────────────────────────────────────────────────────────────
console.log('\n── replication ──');
assert('replication non-null', data.replication !== null);
assertEq('replication.configured', data.replication?.configured, false);

// ── hardware ──────────────────────────────────────────────────────────────────
console.log('\n── hardware ──');
assert('hardware non-null', data.hardware !== null);
assertEq('hardware.bios_version', data.hardware?.bios_version, '37.69');
assertEq('hardware.bmc_firmware', data.hardware?.bmc_firmware, '13.80');
assert('hardware.cpu_model contains E5-2620',
  (data.hardware?.cpu_model ?? '').includes('E5-2620'));
assertEq('hardware.memory_dimms',      data.hardware?.memory_dimms,      6);
assertEq('hardware.memory_dimm_size_mb', data.hardware?.memory_dimm_size_mb, 8192);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed   (parse: ${elapsed}ms)`);
console.log(`${'─'.repeat(60)}\n`);

// Print full parsed JSON for inspection
console.log('Full parsed JSON:');
console.log(JSON.stringify(data, null, 2));

if (failed > 0) process.exit(1);
