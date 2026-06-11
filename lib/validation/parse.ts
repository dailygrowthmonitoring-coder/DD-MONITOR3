/**
 * parseSchema — thin wrapper that runs a Zod schema and maps failures to
 * the project's ValidationError type.
 *
 * All API route handlers and services call this instead of `.parse()` or
 * `.safeParse()` directly so the error type is always consistent.
 *
 * Returns a `Result<T, ValidationError>` — never throws.
 */

import { type ZodType, type ZodTypeDef } from 'zod';
import { ValidationError } from '@/lib/infrastructure/errors/app-error';
import { ok, err, type Result } from '@/lib/infrastructure/errors/result';

/**
 * Validates `input` against `schema` and returns a typed Result.
 *
 * On success:  Ok(parsedValue) — the Zod-transformed, fully typed value.
 * On failure:  Err(ValidationError) — with per-field detail from Zod issues.
 *
 * @param schema - Any Zod schema (z.object, z.string, z.array, etc.).
 * @param input  - The raw unknown value to validate (request body, query params, etc.).
 */
export function parseSchema<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  input: unknown,
): Result<T, ValidationError> {
  const result = schema.safeParse(input);
  if (result.success) return ok(result.data);
  return err(ValidationError.fromZod(result.error));
}
