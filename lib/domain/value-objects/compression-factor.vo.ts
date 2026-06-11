/**
 * CompressionFactor — a validated Data Domain compression ratio.
 *
 * Valid range: 1.0 (no compression) to 1000.0 (extreme archival). Values
 * outside this range are rejected as parse errors rather than domain values.
 *
 * In the autosupport file this appears in the Filesys Compression section:
 *   Currently Used:*   423971.7  18941.9  -  -  22.4x (95.5)
 * where 22.4 is the factor and 95.5 is the reduction percent (saved space).
 *
 * Dashboard uses:
 *   - Compression ratio tile on the Device Detail page
 *   - Compression-over-time chart on the History page
 *   - Comparison table (side-by-side device comparison)
 *
 * Typical DD6300 ranges: 5x–25x for backup workloads. Archival may exceed 50x.
 *
 * An invalid CompressionFactor CANNOT exist — constructor throws ValidationError.
 * Use CompressionFactor.from() for untrusted input.
 */

import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import { type Result, ok, err } from '@/lib/infrastructure/errors/result';

/** Maximum sane compression factor; anything higher indicates a parse error. */
const MAX_FACTOR = 1000.0;

export class CompressionFactor {
  /** The compression ratio (e.g. 22.4 for 22.4×). Always ≥ 1.0. */
  readonly value: number;

  /**
   * Percentage of storage saved by compression.
   * Derived as `(1 − 1/value) × 100` if not provided by the parser.
   * Range: 0.0 – 99.9.
   */
  readonly reductionPercent: number;

  /**
   * Constructs a CompressionFactor.
   *
   * @param value - The compression ratio, ≥ 1.0 and ≤ 1000.0.
   * @param reductionPercent - Pre-parsed reduction %; derived from value if omitted.
   * @throws ValidationError if value is out of range or not finite.
   */
  constructor(value: number, reductionPercent?: number) {
    if (!Number.isFinite(value)) {
      throw new ValidationError([
        { field: 'compressionFactor', message: `Must be a finite number, received ${value}` },
      ]);
    }
    if (value < 1.0 || value > MAX_FACTOR) {
      throw new ValidationError([
        {
          field: 'compressionFactor',
          message: `Must be between 1.0 and ${MAX_FACTOR}, received ${value}`,
          received: value,
        },
      ]);
    }
    this.value = value;
    this.reductionPercent =
      reductionPercent !== undefined
        ? reductionPercent
        : parseFloat(((1 - 1 / value) * 100).toFixed(4));
  }

  // ---------------------------------------------------------------------------
  // Quality classification
  // ---------------------------------------------------------------------------

  /** Excellent compression: ≥ 15×. Typical of deduplicated backup data. */
  isExcellent(): boolean {
    return this.value >= 15.0;
  }

  /** Good compression: ≥ 8× and < 15×. Normal for mixed backup workloads. */
  isGood(): boolean {
    return this.value >= 8.0 && this.value < 15.0;
  }

  /** Moderate compression: ≥ 3× and < 8×. Common for newer or varied data. */
  isModerate(): boolean {
    return this.value >= 3.0 && this.value < 8.0;
  }

  /** Poor compression: < 3×. May indicate uncompressible or already-compressed data. */
  isPoor(): boolean {
    return this.value < 3.0;
  }

  // ---------------------------------------------------------------------------
  // Equality / serialisation
  // ---------------------------------------------------------------------------

  /** Returns true when both CompressionFactor instances have the same value. */
  equals(other: CompressionFactor): boolean {
    return this.value === other.value;
  }

  /**
   * Returns a human-readable string, e.g. "22.4x (95.5%)".
   * Factor is formatted to 1 decimal place; reduction percent to 1 decimal place.
   */
  toString(): string {
    return `${this.value.toFixed(1)}x (${this.reductionPercent.toFixed(1)}%)`;
  }

  /** Returns a structured object for JSON serialisation. */
  toJSON(): { readonly factor: number; readonly reductionPercent: number } {
    return {
      factor: this.value,
      reductionPercent: this.reductionPercent,
    };
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /**
   * Safely constructs a CompressionFactor from unknown inputs.
   * Does NOT throw — returns err() if the inputs are invalid.
   *
   * @param raw - Expected to be a number ≥ 1.0 and ≤ 1000.0.
   * @param reductionRaw - Optional pre-parsed reduction percent (unknown type).
   * @returns Ok(CompressionFactor) on success, Err(ValidationError) on failure.
   */
  static from(raw: unknown, reductionRaw?: unknown): Result<CompressionFactor, ValidationError> {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return err(
        new ValidationError([
          {
            field: 'compressionFactor',
            message: `Must be a finite number, received ${String(raw)}`,
            received: raw,
          },
        ]),
      );
    }
    if (raw < 1.0 || raw > MAX_FACTOR) {
      return err(
        new ValidationError([
          {
            field: 'compressionFactor',
            message: `Must be between 1.0 and ${MAX_FACTOR}, received ${raw}`,
            received: raw,
          },
        ]),
      );
    }

    if (reductionRaw !== undefined) {
      if (typeof reductionRaw !== 'number' || !Number.isFinite(reductionRaw)) {
        return err(
          new ValidationError([
            {
              field: 'reductionPercent',
              message: `Must be a finite number, received ${String(reductionRaw)}`,
              received: reductionRaw,
            },
          ]),
        );
      }
      return ok(new CompressionFactor(raw, reductionRaw));
    }

    return ok(new CompressionFactor(raw));
  }

  /**
   * Constructs a CompressionFactor from a pre-validated number.
   * THROWS ValidationError if the value is out of range.
   * Only call this when the value has already been validated upstream.
   *
   * @param value - A number in [1.0, 1000.0].
   * @param reductionPercent - Optional pre-parsed reduction percent.
   * @returns A new CompressionFactor.
   */
  static unsafe(value: number, reductionPercent?: number): CompressionFactor {
    if (reductionPercent !== undefined) {
      return new CompressionFactor(value, reductionPercent);
    }
    return new CompressionFactor(value);
  }

  /**
   * The minimum valid compression factor (1.0×, no compression).
   * Useful as a default/zero value in contexts where compression data is absent.
   */
  static readonly MINIMUM: CompressionFactor = new CompressionFactor(1.0, 0);
}
