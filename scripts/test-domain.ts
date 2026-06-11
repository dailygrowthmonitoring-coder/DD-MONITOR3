/**
 * Domain layer smoke test.
 *
 * Verifies that all value objects enforce their invariants correctly.
 * Run with:   npm run test:domain
 *
 * Expected output: all PASS lines, zero FAIL lines, exit code 0.
 */

import { StoragePercent } from '../lib/domain/value-objects/storage-percent.vo';
import { CompressionFactor } from '../lib/domain/value-objects/compression-factor.vo';
import { Gib } from '../lib/domain/value-objects/gib.vo';
import { isOk, isErr } from '../lib/infrastructure/errors/result';
import { ValidationError } from '../lib/infrastructure/errors/app-error';
import { DeviceStatus } from '../lib/domain/enums/device-status.enum';

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

function assertThrows(label: string, fn: () => unknown): void {
  try {
    fn();
    console.error(`  FAIL  ${label}  (expected throw, but none occurred)`);
    failed++;
  } catch (e) {
    if (e instanceof ValidationError) {
      console.log(`  PASS  ${label}  (threw ValidationError: ${e.message})`);
      passed++;
    } else {
      console.error(`  FAIL  ${label}  (threw non-ValidationError: ${String(e)})`);
      failed++;
    }
  }
}

// ---------------------------------------------------------------------------
// StoragePercent tests
// ---------------------------------------------------------------------------

console.log('\n── StoragePercent ──');

const sp82 = StoragePercent.from(82);
assert('from(82) → ok',                isOk(sp82));
assert('from(82) value = 82',          isOk(sp82) && sp82.value.value === 82);
assert('from(82) isHealthy = true',    isOk(sp82) && sp82.value.isHealthy());
assert('from(82) isWarning = false',   isOk(sp82) && !sp82.value.isWarning());
assert('from(82) isCritical = false',  isOk(sp82) && !sp82.value.isCritical());
assert('from(82) toDeviceStatus = Healthy',
  isOk(sp82) && sp82.value.toDeviceStatus() === DeviceStatus.Healthy);

const sp93 = StoragePercent.from(93);
assert('from(93) → ok',                isOk(sp93));
assert('from(93) isWarning = true',    isOk(sp93) && sp93.value.isWarning());
assert('from(93) isHealthy = false',   isOk(sp93) && !sp93.value.isHealthy());
assert('from(93) isCritical = false',  isOk(sp93) && !sp93.value.isCritical());
assert('from(93) toDeviceStatus = Warning',
  isOk(sp93) && sp93.value.toDeviceStatus() === DeviceStatus.Warning);

const sp97 = StoragePercent.from(97);
assert('from(97) → ok',                isOk(sp97));
assert('from(97) isCritical = true',   isOk(sp97) && sp97.value.isCritical());
assert('from(97) toDeviceStatus = Critical',
  isOk(sp97) && sp97.value.toDeviceStatus() === DeviceStatus.Critical);

const sp150 = StoragePercent.from(150);
assert('from(150) → err (out of range)', isErr(sp150));

const sp0 = StoragePercent.from(0);
assert('from(0) → ok',                 isOk(sp0));
assert('from(0) freePercent = 100',    isOk(sp0) && sp0.value.freePercent() === 100);

const sp100 = StoragePercent.from(100);
assert('from(100) → ok (boundary)',    isOk(sp100));

assert('from(-1) → err',               isErr(StoragePercent.from(-1)));
assert('from("82") → err (wrong type)', isErr(StoragePercent.from('82')));
assert('from(NaN) → err',              isErr(StoragePercent.from(NaN)));

const sp8250 = StoragePercent.from(82.506);
assert('from(82.506) rounds to 82.51', isOk(sp8250) && sp8250.value.value === 82.51);
assert('from(82.506) toString = "82.51%"', isOk(sp8250) && sp8250.value.toString() === '82.51%');

assertThrows('new StoragePercent(-1) throws ValidationError', () => new StoragePercent(-1));
assertThrows('new StoragePercent(101) throws ValidationError', () => new StoragePercent(101));

// ---------------------------------------------------------------------------
// CompressionFactor tests
// ---------------------------------------------------------------------------

console.log('\n── CompressionFactor ──');

const cf224 = CompressionFactor.from(22.4);
assert('from(22.4) → ok',              isOk(cf224));
assert('from(22.4) value = 22.4',      isOk(cf224) && cf224.value.value === 22.4);
assert('from(22.4) isExcellent = true', isOk(cf224) && cf224.value.isExcellent());
assert('from(22.4) reductionPercent derived correctly',
  isOk(cf224) && Math.abs(cf224.value.reductionPercent - 95.5357) < 0.001);
assert('from(22.4) toString contains "22.4x"',
  isOk(cf224) && cf224.value.toString().startsWith('22.4x'));
assert('from(22.4) toString contains reduction %',
  isOk(cf224) && cf224.value.toString().includes('%'));

const cf224r = CompressionFactor.from(22.4, 95.5);
assert('from(22.4, 95.5) stores explicit reductionPercent',
  isOk(cf224r) && cf224r.value.reductionPercent === 95.5);
assert('from(22.4, 95.5) toString = "22.4x (95.5%)"',
  isOk(cf224r) && cf224r.value.toString() === '22.4x (95.5%)');

assert('from(0.9) → err (< 1.0)',      isErr(CompressionFactor.from(0.9)));
assert('from(1001) → err (> 1000)',    isErr(CompressionFactor.from(1001)));
assert('from("22.4") → err',          isErr(CompressionFactor.from('22.4')));

const cfMin = CompressionFactor.from(1.0);
assert('from(1.0) → ok (minimum)',     isOk(cfMin));
assert('from(1.0) reductionPercent = 0',
  isOk(cfMin) && Math.abs(cfMin.value.reductionPercent) < 0.001);
assert('from(1.0) isPoor = true',      isOk(cfMin) && cfMin.value.isPoor());

assert('MINIMUM.value = 1.0',         CompressionFactor.MINIMUM.value === 1.0);
assert('MINIMUM.reductionPercent = 0', CompressionFactor.MINIMUM.reductionPercent === 0);

assertThrows('new CompressionFactor(0.5) throws', () => new CompressionFactor(0.5));

const cfToJSON = CompressionFactor.unsafe(10.0);
const json = cfToJSON.toJSON();
assert('toJSON returns { factor, reductionPercent }',
  json.factor === 10.0 && typeof json.reductionPercent === 'number');

// ---------------------------------------------------------------------------
// Gib tests
// ---------------------------------------------------------------------------

console.log('\n── Gib ──');

const g18941 = Gib.from(18941.9);
assert('from(18941.9) → ok',           isOk(g18941));
assert('from(18941.9) value = 18941.9', isOk(g18941) && g18941.value.value === 18941.9);
assert('from(18941.9) toHumanString has TiB',
  isOk(g18941) && g18941.value.toHumanString().includes('TiB'));
assert('from(18941.9) toHumanString ~18.50 TiB',
  isOk(g18941) && g18941.value.toHumanString().endsWith('TiB'));

const g512 = Gib.from(512);
assert('from(512) toHumanString = "512.00 GiB"',
  isOk(g512) && g512.value.toHumanString() === '512.00 GiB');

const gLarge = Gib.from(1_100_000);
assert('from(1_100_000) toHumanString has PiB',
  isOk(gLarge) && gLarge.value.toHumanString().includes('PiB'));

assert('from(-1) → err',               isErr(Gib.from(-1)));
assert('from(NaN) → err',              isErr(Gib.from(NaN)));
assert('from("100") → err',            isErr(Gib.from('100')));

assertThrows('new Gib(-1) throws ValidationError', () => new Gib(-1));

// Arithmetic
const g100 = Gib.unsafe(100);
const g50  = Gib.unsafe(50);
assert('ZERO.add(100).toJSON() = 100',
  Gib.ZERO.add(g100).toJSON() === 100);
assert('g100.add(g50).value = 150',
  g100.add(g50).value === 150);
assert('g100.subtract(g50).value = 50',
  g100.subtract(g50).value === 50);
assertThrows('g50.subtract(g100) throws (negative result)',
  () => g50.subtract(g100));

// percentOf
const used   = Gib.unsafe(423971.7);
const total  = Gib.unsafe(440956.8);
const pct    = used.percentOf(total);
assert('percentOf: result is StoragePercent',
  pct instanceof StoragePercent);
assert('percentOf: value ≈ 96.1%',
  Math.abs(pct.value - 96.14) < 0.1);

assert('ZERO percentOf ZERO = 0%',
  Gib.ZERO.percentOf(Gib.ZERO).value === 0);

// toString
const g18942 = Gib.unsafe(18941.9);
assert('toString includes "GiB"', g18942.toString().includes('GiB'));

// toJSON
assert('toJSON returns number',    typeof Gib.unsafe(100).toJSON() === 'number');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n────────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`────────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
