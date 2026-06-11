/**
 * Gib — a validated storage size in Gibibytes (GiB).
 *
 * Valid range: 0 GiB to 100,000,000 GiB (≈ 97.7 PiB). Values outside this
 * range are rejected as parse errors rather than domain values.
 *
 * All storage sizes extracted from autosupport files are stored as Gib
 * throughout the domain layer:
 *   - Total capacity, used, available (SERVER USAGE section)
 *   - Pre-compression logical size (Filesys Compression section)
 *   - Per-MTree sizes (DM ASTATS section)
 *
 * The value object prevents unit confusion: a Gib cannot be accidentally added
 * to a raw number that represents, for example, megabytes.
 *
 * An invalid Gib CANNOT exist — constructor throws ValidationError.
 * Use Gib.from() for untrusted input.
 */

import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import { type Result, ok, err } from '@/lib/infrastructure/errors/result';
import { StoragePercent } from './storage-percent.vo';

/** Maximum sane storage size: 100 PiB expressed in GiB. */
const MAX_GIB = 100_000_000;

export class Gib {
  /** The validated GiB value, rounded to 3 decimal places. Always ≥ 0. */
  readonly value: number;

  /**
   * Constructs a Gib.
   *
   * @param value - Size in GiB, ≥ 0. Rounded to 3 decimal places.
   * @throws ValidationError if value is negative, non-finite, or exceeds MAX_GIB.
   */
  constructor(value: number) {
    if (!Number.isFinite(value)) {
      throw new ValidationError([
        { field: 'gib', message: `Must be a finite number, received ${value}` },
      ]);
    }
    const rounded = parseFloat(value.toFixed(3));
    if (rounded < 0) {
      throw new ValidationError([
        {
          field: 'gib',
          message: `Must be ≥ 0 GiB, received ${rounded}`,
          received: rounded,
        },
      ]);
    }
    if (rounded > MAX_GIB) {
      throw new ValidationError([
        {
          field: 'gib',
          message: `Exceeds maximum sane value of ${MAX_GIB} GiB (≈ 97.7 PiB), received ${rounded}`,
          received: rounded,
        },
      ]);
    }
    this.value = rounded;
  }

  // ---------------------------------------------------------------------------
  // Unit conversion
  // ---------------------------------------------------------------------------

  /** Converts to Tebibytes (TiB). 1 TiB = 1024 GiB. */
  toTib(): number {
    return this.value / 1024;
  }

  /** Converts to Pebibytes (PiB). 1 PiB = 1,048,576 GiB. */
  toPib(): number {
    return this.value / 1_048_576;
  }

  /**
   * Converts to SI Gigabytes (GB).
   * 1 GiB = 1.073741824 GB (binary/decimal conversion).
   */
  toGb(): number {
    return this.value * 1.073741824;
  }

  /** Converts to bytes. 1 GiB = 1,073,741,824 bytes. */
  toBytes(): number {
    return this.value * 1_073_741_824;
  }

  // ---------------------------------------------------------------------------
  // Arithmetic
  // ---------------------------------------------------------------------------

  /**
   * Returns a new Gib that is the sum of this and other.
   * The result is always valid (non-negative), so this never throws.
   *
   * @param other - The Gib to add.
   * @returns A new Gib equal to this + other.
   */
  add(other: Gib): Gib {
    return new Gib(this.value + other.value);
  }

  /**
   * Returns a new Gib that is this minus other.
   *
   * @param other - The Gib to subtract.
   * @returns A new Gib equal to this − other.
   * @throws ValidationError if the result would be negative.
   */
  subtract(other: Gib): Gib {
    const result = this.value - other.value;
    if (result < 0) {
      throw new ValidationError([
        {
          field: 'gib',
          message: `Cannot subtract ${other.value} GiB from ${this.value} GiB: result would be negative`,
        },
      ]);
    }
    return new Gib(result);
  }

  /**
   * Computes this size as a percentage of a total.
   * Returns StoragePercent(0) if total is zero (avoids division by zero).
   *
   * @param total - The total capacity to compare against.
   * @returns A StoragePercent representing (this / total) × 100.
   */
  percentOf(total: Gib): StoragePercent {
    if (total.value === 0) {
      return StoragePercent.unsafe(0);
    }
    const rawPercent = (this.value / total.value) * 100;
    // Clamp to [0, 100] to guard against floating-point edge cases
    const clamped = Math.min(100, Math.max(0, parseFloat(rawPercent.toFixed(2))));
    return StoragePercent.unsafe(clamped);
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  /**
   * Returns the most human-readable representation with appropriate unit suffix.
   * Thresholds: ≥ 1,048,576 GiB → PiB, ≥ 1,024 GiB → TiB, otherwise GiB.
   *
   * Examples:
   *   Gib(18941.9).toHumanString()   → "18.50 TiB"
   *   Gib(423971.7).toHumanString()  → "413.97 TiB"
   *   Gib(512).toHumanString()       → "512.00 GiB"
   *   Gib(1_100_000).toHumanString() → "1.05 PiB"
   */
  toHumanString(): string {
    if (this.value >= 1_048_576) {
      return `${this.toPib().toFixed(2)} PiB`;
    }
    if (this.value >= 1024) {
      return `${this.toTib().toFixed(2)} TiB`;
    }
    return `${this.value.toFixed(2)} GiB`;
  }

  /** Returns the value always in GiB with 3 decimal places, e.g. "18941.900 GiB". */
  toString(): string {
    return `${this.value.toFixed(3)} GiB`;
  }

  /** Returns the raw GiB number for JSON serialisation. */
  toJSON(): number {
    return this.value;
  }

  // ---------------------------------------------------------------------------
  // Equality
  // ---------------------------------------------------------------------------

  /** Returns true when both Gib instances represent the same size. */
  equals(other: Gib): boolean {
    return this.value === other.value;
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /**
   * Safely constructs a Gib from an unknown value.
   * Does NOT throw — returns err() if the value is invalid.
   *
   * @param raw - Expected to be a number ≥ 0.
   * @returns Ok(Gib) on success, Err(ValidationError) on failure.
   */
  static from(raw: unknown): Result<Gib, ValidationError> {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return err(
        new ValidationError([
          {
            field: 'gib',
            message: `Must be a finite number, received ${String(raw)}`,
            received: raw,
          },
        ]),
      );
    }
    const rounded = parseFloat(raw.toFixed(3));
    if (rounded < 0) {
      return err(
        new ValidationError([
          {
            field: 'gib',
            message: `Must be ≥ 0 GiB, received ${rounded}`,
            received: rounded,
          },
        ]),
      );
    }
    if (rounded > MAX_GIB) {
      return err(
        new ValidationError([
          {
            field: 'gib',
            message: `Exceeds maximum of ${MAX_GIB} GiB, received ${rounded}`,
            received: rounded,
          },
        ]),
      );
    }
    return ok(new Gib(rounded));
  }

  /**
   * Constructs a Gib from a pre-validated number.
   * THROWS ValidationError if the value is invalid.
   * Only call this when the value has already been validated upstream.
   *
   * @param value - A non-negative number in GiB.
   * @returns A new Gib.
   */
  static unsafe(value: number): Gib {
    return new Gib(value);
  }

  /** Zero-GiB sentinel. Useful as a neutral element for addition and defaults. */
  static readonly ZERO: Gib = new Gib(0);
}
