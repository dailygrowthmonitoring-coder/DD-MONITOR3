/**
 * Result<T, E> — the foundation of all error handling in DD Monitor.
 *
 * Every operation that can fail in a normal-business way returns a Result
 * instead of throwing. Throwing is reserved for programmer errors and
 * truly unrecoverable conditions (misconfigured boot, etc.).
 *
 * The Result type is a discriminated union, so TypeScript's control-flow
 * analysis narrows it correctly after an `isOk` or `isErr` check.
 *
 * Dependency: app-error.ts (for the AppError default type parameter and
 * the DatabaseError used inside tryCatch). No other internal deps.
 */

import { type AppError, DatabaseError } from './app-error';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** A successful result wrapping a value of type T. All fields are readonly. */
export type OkResult<T> = { readonly ok: true; readonly value: T };

/** A failed result wrapping an error of type E. All fields are readonly. */
export type ErrResult<E> = { readonly ok: false; readonly error: E };

/**
 * A discriminated union that is either a success (OkResult) or failure (ErrResult).
 * E defaults to AppError — the base type for all typed errors in this system.
 */
export type Result<T, E = AppError> = OkResult<T> | ErrResult<E>;

/**
 * A Promise that resolves to a Result.
 * Use this as the return type of any async function that can fail in a
 * business-expected way.
 *
 * @example
 * async function findDevice(id: string): AsyncResult<Device> { ... }
 */
export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>;

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Creates a successful OkResult wrapping the given value.
 *
 * @param value - The success value.
 * @returns An OkResult<T>.
 */
export function ok<T>(value: T): OkResult<T> {
  return { ok: true, value };
}

/**
 * Creates a failed ErrResult wrapping the given error.
 *
 * @param error - The typed error.
 * @returns An ErrResult<E>.
 */
export function err<E>(error: E): ErrResult<E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Type guard: narrows a Result<T, E> to OkResult<T>.
 *
 * @example
 * if (isOk(result)) {
 *   console.log(result.value); // typed as T
 * }
 */
export function isOk<T, E>(result: Result<T, E>): result is OkResult<T> {
  return result.ok === true;
}

/**
 * Type guard: narrows a Result<T, E> to ErrResult<E>.
 *
 * @example
 * if (isErr(result)) {
 *   console.error(result.error.message); // typed as E
 * }
 */
export function isErr<T, E>(result: Result<T, E>): result is ErrResult<E> {
  return result.ok === false;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the value from an OkResult, or throws the contained error if the
 * result is an ErrResult.
 *
 * Only call this after you have already confirmed the result is Ok via isOk(),
 * or in contexts where you explicitly want to re-throw on failure (e.g. top-level
 * service orchestration where a failure is truly unexpected at that point).
 *
 * @param result - The result to unwrap.
 * @returns The contained value.
 * @throws The contained error if result.ok is false.
 */
export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) return result.value;
  throw result.error;
}

/**
 * Transforms the value inside an OkResult by applying `fn`.
 * If result is an ErrResult, passes it through unchanged (no fn call).
 *
 * @param result - The result to map over.
 * @param fn - Transformation function applied to the Ok value.
 * @returns A new Result with the mapped value, or the original ErrResult.
 *
 * @example
 * const countResult = mapResult(devicesResult, (devices) => devices.length);
 */
export function mapResult<T, U, E = AppError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isOk(result)) return ok(fn(result.value));
  return result;
}

/**
 * Transforms the error inside an ErrResult by applying `fn`.
 * If result is an OkResult, passes it through unchanged (no fn call).
 *
 * Useful for converting domain errors to API DTOs, or wrapping low-level
 * errors in higher-level error types at layer boundaries.
 *
 * @param result - The result whose error to transform.
 * @param fn - Transformation function applied to the Err value.
 * @returns A new Result with the mapped error, or the original OkResult.
 *
 * @example
 * const apiResult = mapErrResult(dbResult, (e) => new IngestionError(e.message, fileName));
 */
export function mapErrResult<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (isErr(result)) return err(fn(result.error));
  // result is OkResult<T>; reconstruct to satisfy Result<T, F> (different E param)
  return { ok: true, value: result.value };
}

/**
 * Wraps an async operation that may throw into an AsyncResult.
 *
 * Any thrown value is caught and wrapped as a DatabaseError — use this
 * primarily around database/external-service calls. For more precise error
 * types, catch explicitly in the calling code instead.
 *
 * The parser is explicitly excluded: it must never use tryCatch because it
 * never throws (per architecture rules).
 *
 * @param fn - An async thunk that may throw.
 * @returns An AsyncResult<T, AppError> that never rejects.
 *
 * @example
 * const result = await tryCatch(() => supabase.from('devices').select('*'));
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
): AsyncResult<T, AppError> {
  try {
    const value = await fn();
    return ok(value);
  } catch (caught: unknown) {
    return err(DatabaseError.fromUnknown(caught));
  }
}
