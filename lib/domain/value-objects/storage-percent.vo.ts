/**
 * StoragePercent — a validated storage-utilization percentage.
 *
 * Valid range: 0.00 – 100.00 (inclusive), rounded to 2 decimal places.
 *
 * In the autosupport file this originates from the SERVER USAGE section:
 *   /data: post-comp  ...  Use%  30%
 *
 * Dashboard uses:
 *   - Colours device tiles and table rows (green / amber / red)
 *   - Renders the horizontal storage-bar in device cards
 *   - Triggers alert rules: WARNING at ≥ 90 %, CRITICAL at ≥ 95 %
 *
 * An invalid StoragePercent CANNOT exist — the constructor throws ValidationError
 * for out-of-range input. Use StoragePercent.from() for untrusted input.
 */

import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import { type Result, ok, err } from '@/lib/infrastructure/errors/result';
import { DeviceStatus } from '../enums/device-status.enum';

export class StoragePercent {
  /** The validated percentage value, 0.00 – 100.00. */
  readonly value: number;

  /**
   * Storage percentage at which a WARNING alert is triggered.
   * Must match the default threshold in the alert_rules table.
   */
  static readonly WARNING_THRESHOLD = 90;

  /**
   * Storage percentage at which a CRITICAL alert is triggered.
   * Must match the default threshold in the alert_rules table.
   */
  static readonly CRITICAL_THRESHOLD = 95;

  /**
   * Constructs a StoragePercent.
   *
   * @param value - A number in [0, 100]. Rounded to 2 decimal places.
   * @throws ValidationError if value is outside [0, 100] or not finite.
   */
  constructor(value: number) {
    if (!Number.isFinite(value)) {
      throw new ValidationError([
        { field: 'storagePercent', message: `Must be a finite number, received ${value}` },
      ]);
    }
    const rounded = parseFloat(value.toFixed(2));
    if (rounded < 0 || rounded > 100) {
      throw new ValidationError([
        {
          field: 'storagePercent',
          message: `Must be between 0 and 100, received ${rounded}`,
          received: rounded,
        },
      ]);
    }
    this.value = rounded;
  }

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------

  /** Returns true when storage is below the WARNING threshold (< 90%). */
  isHealthy(): boolean {
    return this.value < StoragePercent.WARNING_THRESHOLD;
  }

  /** Returns true when storage is at or above WARNING but below CRITICAL (90% ≤ v < 95%). */
  isWarning(): boolean {
    return (
      this.value >= StoragePercent.WARNING_THRESHOLD &&
      this.value < StoragePercent.CRITICAL_THRESHOLD
    );
  }

  /** Returns true when storage is at or above the CRITICAL threshold (≥ 95%). */
  isCritical(): boolean {
    return this.value >= StoragePercent.CRITICAL_THRESHOLD;
  }

  /**
   * Maps this percentage to the corresponding DeviceStatus.
   *
   * @returns DeviceStatus.Critical, Warning, or Healthy based on thresholds.
   */
  toDeviceStatus(): DeviceStatus {
    if (this.isCritical()) return DeviceStatus.Critical;
    if (this.isWarning())  return DeviceStatus.Warning;
    return DeviceStatus.Healthy;
  }

  /**
   * Returns the free percentage (100 − this.value), rounded to 2 decimal places.
   */
  freePercent(): number {
    return parseFloat((100 - this.value).toFixed(2));
  }

  // ---------------------------------------------------------------------------
  // Equality / serialisation
  // ---------------------------------------------------------------------------

  /** Returns true when both StoragePercent values are numerically equal. */
  equals(other: StoragePercent): boolean {
    return this.value === other.value;
  }

  /** Returns a human-readable string, e.g. "82.00%". */
  toString(): string {
    return `${this.value.toFixed(2)}%`;
  }

  /** Returns the raw number for JSON serialisation. */
  toJSON(): number {
    return this.value;
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /**
   * Safely constructs a StoragePercent from an unknown value.
   * Does NOT throw — returns err() if the value is invalid.
   *
   * @param raw - The unknown input (expected to be a number in [0, 100]).
   * @returns Ok(StoragePercent) on success, Err(ValidationError) on failure.
   */
  static from(raw: unknown): Result<StoragePercent, ValidationError> {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return err(
        new ValidationError([
          { field: 'storagePercent', message: `Must be a finite number, received ${String(raw)}`, received: raw },
        ]),
      );
    }
    const rounded = parseFloat(raw.toFixed(2));
    if (rounded < 0 || rounded > 100) {
      return err(
        new ValidationError([
          {
            field: 'storagePercent',
            message: `Must be between 0 and 100, received ${rounded}`,
            received: rounded,
          },
        ]),
      );
    }
    return ok(new StoragePercent(rounded));
  }

  /**
   * Constructs a StoragePercent from a pre-validated number.
   * THROWS ValidationError if the value is out of range.
   * Only call this when the value has already been validated upstream.
   *
   * @param value - A number in [0, 100].
   * @returns A new StoragePercent.
   */
  static unsafe(value: number): StoragePercent {
    return new StoragePercent(value);
  }
}
