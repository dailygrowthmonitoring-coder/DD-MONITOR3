/**
 * Typed error hierarchy for DD Monitor.
 *
 * Every error thrown or returned in this system extends AppError and carries:
 *   - a stable `code` from the error catalog
 *   - an HTTP status for route handlers
 *   - a `toClientSafeObject()` that never leaks internals to API consumers
 *   - a `toLogObject()` with full detail for structured logging
 *
 * Dependency: error-catalog.ts (defines code strings). No other internal deps.
 */

import { type ZodError } from 'zod';
import { ERROR_CODES, type ErrorCode } from './error-catalog';

// ---------------------------------------------------------------------------
// Shared option types
// ---------------------------------------------------------------------------

/** Options accepted by AppError constructors that allow cause and context. */
export interface AppErrorOptions {
  /** The original error or value that caused this error, for chaining. */
  readonly cause?: unknown;
  /** Structured diagnostic context — safe to log, never sent to clients. */
  readonly context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

/**
 * Base class for all typed errors in DD Monitor.
 *
 * Rules:
 * - Extend this for every new error type; never throw plain `Error`.
 * - `toClientSafeObject()` is the only shape that ever reaches API consumers.
 * - `toLogObject()` is used exclusively by the logger — never sent over HTTP.
 */
export class AppError extends Error {
  /** Stable code string from the error catalog. Used for programmatic handling. */
  readonly code: ErrorCode;

  /** HTTP status code appropriate for this error type. */
  readonly httpStatus: number;

  /**
   * Structured diagnostic context for logging.
   * Never sent to API clients.
   */
  readonly context: Record<string, unknown> | undefined;

  /**
   * The underlying cause of this error, if any.
   * Used to build a cause chain in `toLogObject()`.
   */
  readonly cause: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    httpStatus: number,
    options?: AppErrorOptions,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.context = options?.context;
    this.cause = options?.cause;
    // Maintain correct prototype chain for instanceof checks across transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a safe, minimal object suitable for JSON API error responses.
   * Contains no stack traces, no context, no cause chains.
   */
  toClientSafeObject(): { readonly code: string; readonly message: string; readonly status: number } {
    return {
      code: this.code,
      message: this.message,
      status: this.httpStatus,
    };
  }

  /**
   * Returns full diagnostic detail for structured logging.
   * Never send this to API clients.
   */
  toLogObject(): {
    readonly code: string;
    readonly message: string;
    readonly status: number;
    readonly context: Record<string, unknown> | undefined;
    readonly cause: string | undefined;
    readonly stack: string | undefined;
  } {
    return {
      code: this.code,
      message: this.message,
      status: this.httpStatus,
      context: this.context,
      cause: serializeCause(this.cause),
      stack: this.stack,
    };
  }

  override toString(): string {
    return `${this.name}[${this.code}]: ${this.message}`;
  }
}

// ---------------------------------------------------------------------------
// Helpers (private to this module)
// ---------------------------------------------------------------------------

/**
 * Safely converts an unknown cause value to a loggable string.
 * Never propagates raw unknown values into log objects.
 */
function serializeCause(cause: unknown): string | undefined {
  if (cause === undefined || cause === null) return undefined;
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }
  if (typeof cause === 'string') return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

/** A single field-level validation failure, used inside ValidationError. */
export interface ValidationField {
  readonly field: string;
  readonly message: string;
  /** The value that was received, when available from the Zod error. */
  readonly received?: unknown;
}

/**
 * Returned when request input fails Zod schema validation at a trust boundary.
 *
 * Carries per-field detail so callers know exactly which fields are invalid.
 * HTTP 400.
 */
export class ValidationError extends AppError {
  /** Per-field validation failures. */
  readonly fields: readonly ValidationField[];

  constructor(fields: readonly ValidationField[], options?: AppErrorOptions) {
    const summary = fields.map((f) => `${f.field}: ${f.message}`).join('; ');
    super(
      ERROR_CODES.VALIDATION.INVALID_INPUT,
      `Validation failed — ${summary}`,
      400,
      options,
    );
    this.fields = fields;
  }

  /**
   * Converts a Zod parse error into a ValidationError with per-field detail.
   *
   * @param zodError - The ZodError produced by `schema.parse()` or `schema.safeParse()`.
   * @returns A ValidationError with one entry per failing Zod issue.
   */
  static fromZod(zodError: ZodError): ValidationError {
    const fields = zodError.issues.map((issue): ValidationField => {
      const field = issue.path.map(String).join('.') || '_root';
      // ZodInvalidTypeIssue carries a `received` property; other issue types may not.
      if ('received' in issue) {
        return { field, message: issue.message, received: (issue as { received: unknown }).received };
      }
      return { field, message: issue.message };
    });
    return new ValidationError(fields);
  }

  override toClientSafeObject() {
    return {
      ...super.toClientSafeObject(),
      fields: this.fields,
    };
  }
}

// ---------------------------------------------------------------------------
// NotFoundError
// ---------------------------------------------------------------------------

/**
 * Returned when a requested resource does not exist.
 * HTTP 404.
 *
 * @example new NotFoundError('Device', 'DD6300BSR') → "Device 'DD6300BSR' not found"
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string | number, options?: AppErrorOptions) {
    const code = resolveNotFoundCode(resource);
    super(code, `${resource} '${identifier}' not found`, 404, options);
  }
}

/** Maps a resource name to its specific NOT_FOUND catalog code. */
function resolveNotFoundCode(resource: string): ErrorCode {
  switch (resource.toLowerCase()) {
    case 'device': return ERROR_CODES.NOT_FOUND.DEVICE;
    case 'report': return ERROR_CODES.NOT_FOUND.REPORT;
    case 'alert':  return ERROR_CODES.NOT_FOUND.ALERT;
    case 'user':   return ERROR_CODES.NOT_FOUND.USER;
    default:       return ERROR_CODES.DATABASE.NOT_FOUND;
  }
}

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

/**
 * Returned for authentication failures (invalid API key, missing session).
 * HTTP 401.
 */
export class AuthError extends AppError {
  private constructor(code: ErrorCode, message: string, options?: AppErrorOptions) {
    super(code, message, 401, options);
  }

  /** Creates an AuthError for a missing or invalid x-api-key header. */
  static invalidApiKey(): AuthError {
    return new AuthError(
      ERROR_CODES.AUTH.INVALID_API_KEY,
      'Invalid or missing API key.',
    );
  }

  /** Creates an AuthError for an unauthenticated dashboard API request. */
  static sessionRequired(): AuthError {
    return new AuthError(
      ERROR_CODES.AUTH.SESSION_REQUIRED,
      'Authentication is required to access this resource.',
    );
  }

  /** Creates an AuthError for an insufficient-permissions condition. */
  static insufficientPermissions(): AuthError {
    return new AuthError(
      ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
      'You do not have permission to perform this action.',
    );
  }
}

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------

/**
 * Returned when a caller exceeds the configured request rate.
 * HTTP 429.
 */
export class RateLimitError extends AppError {
  /** Seconds until the rate-limit window resets, for the Retry-After header. */
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, options?: AppErrorOptions) {
    super(
      ERROR_CODES.RATE_LIMIT.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`,
      429,
      options,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }

  override toClientSafeObject() {
    return {
      ...super.toClientSafeObject(),
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}

// ---------------------------------------------------------------------------
// IngestionError
// ---------------------------------------------------------------------------

/**
 * Returned when the ingestion pipeline cannot process a file.
 * HTTP 422.
 */
export class IngestionError extends AppError {
  /** The name of the file that failed ingestion. */
  readonly fileName: string;
  /** The hostname of the device, if it could be extracted before the failure. */
  readonly deviceHostname: string | undefined;

  constructor(
    message: string,
    fileName: string,
    options?: AppErrorOptions & { deviceHostname?: string; code?: ErrorCode },
  ) {
    super(
      options?.code ?? ERROR_CODES.INGESTION.TRANSACTION_FAILED,
      message,
      422,
      options,
    );
    this.fileName = fileName;
    this.deviceHostname = options?.deviceHostname;
  }

  override toClientSafeObject() {
    return {
      ...super.toClientSafeObject(),
      fileName: this.fileName,
    };
  }
}

// ---------------------------------------------------------------------------
// ParseError
// ---------------------------------------------------------------------------

/**
 * Returned when a specific section of an autosupport file cannot be parsed.
 * HTTP 422.
 *
 * Note: the parser itself never throws — it collects parse errors in its
 * ParseResult.parse_errors array. ParseError is used by the ingestion service
 * when it decides a critical parse failure should abort the ingest.
 */
export class ParseError extends AppError {
  /** The autosupport section that failed (e.g. 'GENERAL INFO'). */
  readonly section: string;
  /** Human-readable list of what went wrong within the section. */
  readonly parseErrors: readonly string[];

  constructor(section: string, parseErrors: readonly string[], options?: AppErrorOptions) {
    super(
      ERROR_CODES.PARSE.SECTION_EXTRACTION_FAILED,
      `Parse failed in section '${section}': ${parseErrors.join('; ')}`,
      422,
      options,
    );
    this.section = section;
    this.parseErrors = parseErrors;
  }

  override toClientSafeObject() {
    return {
      ...super.toClientSafeObject(),
      section: this.section,
    };
  }
}

// ---------------------------------------------------------------------------
// DatabaseError
// ---------------------------------------------------------------------------

/**
 * Returned when a database operation fails.
 * HTTP 500.
 */
export class DatabaseError extends AppError {
  private constructor(code: ErrorCode, message: string, options?: AppErrorOptions) {
    super(code, message, 500, options);
  }

  /**
   * Wraps any unknown value thrown by a database operation into a typed DatabaseError.
   * Safely extracts the message without exposing raw internals to callers.
   *
   * @param cause - The unknown value caught from a try/catch around a DB call.
   * @returns A DatabaseError with the cause attached for logging.
   */
  static fromUnknown(cause: unknown): DatabaseError {
    const message =
      cause instanceof Error
        ? `Database operation failed: ${cause.message}`
        : 'Database operation failed: unknown error';
    return new DatabaseError(
      ERROR_CODES.DATABASE.QUERY_FAILED,
      message,
      { cause },
    );
  }

  /** Creates a DatabaseError for a constraint violation (unique, FK, check). */
  static constraintViolation(detail: string, options?: AppErrorOptions): DatabaseError {
    return new DatabaseError(
      ERROR_CODES.DATABASE.CONSTRAINT_VIOLATION,
      `Database constraint violated: ${detail}`,
      options,
    );
  }

  /** Creates a DatabaseError for a transaction rollback. */
  static transactionFailed(options?: AppErrorOptions): DatabaseError {
    return new DatabaseError(
      ERROR_CODES.DATABASE.TRANSACTION_FAILED,
      'Database transaction failed and was rolled back.',
      options,
    );
  }
}

// ---------------------------------------------------------------------------
// ConfigError
// ---------------------------------------------------------------------------

/**
 * Thrown at startup when required environment variables are missing or invalid.
 * HTTP 500.
 *
 * This error is NOT user-facing. It causes `process.exit(1)` in server context.
 * It is never returned via the API — by the time any request arrives, config
 * must already be valid.
 */
export class ConfigError extends AppError {
  /** The names (not values) of the missing or invalid variables. */
  readonly missingVars: readonly string[];

  constructor(missingVars: readonly string[]) {
    super(
      ERROR_CODES.CONFIG.MISSING_ENV_VARS,
      `Missing or invalid environment variables: ${missingVars.join(', ')}`,
      500,
      { context: { missingVars } },
    );
    this.missingVars = missingVars;
  }
}

// ---------------------------------------------------------------------------
// ExportError
// ---------------------------------------------------------------------------

/**
 * Returned when PDF or HTML report generation fails.
 * HTTP 500.
 */
export class ExportError extends AppError {
  constructor(message: string, options?: AppErrorOptions & { code?: ErrorCode }) {
    super(
      options?.code ?? ERROR_CODES.EXPORT.PDF_GENERATION_FAILED,
      message,
      500,
      options,
    );
  }
}
