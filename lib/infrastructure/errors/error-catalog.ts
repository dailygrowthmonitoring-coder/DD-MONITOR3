/**
 * Authoritative registry of every stable error code in the DD Monitor system.
 *
 * Rules:
 * - Before adding a new error class anywhere, register its code here first.
 * - Code format: DOMAIN_KEY (e.g. VALIDATION_INVALID_INPUT).
 * - Codes are strings at runtime and literal types at compile time.
 * - Never remove or rename a code that has been deployed — add a new one instead.
 */

/** All stable error codes, grouped by domain. */
export const ERROR_CODES = {
  /**
   * Validation failures: malformed input at trust boundaries.
   * HTTP 400.
   */
  VALIDATION: {
    /** Input data failed Zod schema validation. Cause: malformed request body or query params. */
    INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
    /** A date value is invalid or in an unexpected format. Cause: non-ISO string or future date where disallowed. */
    INVALID_DATE: 'VALIDATION_INVALID_DATE',
    /** A device hostname does not match the expected DD appliance pattern. Cause: hostname extracted from file is malformed. */
    INVALID_HOSTNAME: 'VALIDATION_INVALID_HOSTNAME',
    /** A required field is absent from the input. Cause: missing body field or absent parser section. */
    MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  },

  /**
   * Authentication and authorization failures.
   * HTTP 401 / 403.
   */
  AUTH: {
    /** The x-api-key header is missing or does not match INGEST_SECRET. HTTP 401. */
    INVALID_API_KEY: 'AUTH_INVALID_API_KEY',
    /** A valid Supabase session is required but absent. HTTP 401. */
    SESSION_REQUIRED: 'AUTH_SESSION_REQUIRED',
    /** The authenticated user lacks permission for this action. HTTP 403. */
    INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  },

  /**
   * Rate-limit violations.
   * HTTP 429.
   */
  RATE_LIMIT: {
    /** Caller exceeded RATE_LIMIT_REQUESTS_PER_HOUR in the current window. */
    TOO_MANY_REQUESTS: 'RATE_LIMIT_TOO_MANY_REQUESTS',
  },

  /**
   * Ingestion pipeline failures.
   * HTTP 422.
   */
  INGESTION: {
    /** Uploaded autosupport file exceeds MAX_FILE_SIZE_MB. */
    FILE_TOO_LARGE: 'INGESTION_FILE_TOO_LARGE',
    /** A report for this device+date already exists (idempotency guard). */
    DUPLICATE_REPORT: 'INGESTION_DUPLICATE_REPORT',
    /** Could not extract a valid hostname from the autosupport file. */
    HOSTNAME_EXTRACTION_FAILED: 'INGESTION_HOSTNAME_EXTRACTION_FAILED',
    /** Failed to find or create the device record. Cause: DB write error. */
    DEVICE_CREATE_FAILED: 'INGESTION_DEVICE_CREATE_FAILED',
    /** Failed to persist the parsed report. Cause: DB write error. */
    REPORT_SAVE_FAILED: 'INGESTION_REPORT_SAVE_FAILED',
    /** The ingestion transaction was rolled back due to a failure in any step. */
    TRANSACTION_FAILED: 'INGESTION_TRANSACTION_FAILED',
  },

  /**
   * Autosupport file parser failures.
   * HTTP 422.
   */
  PARSE: {
    /** A named section could not be located in the autosupport file. */
    SECTION_EXTRACTION_FAILED: 'PARSE_SECTION_EXTRACTION_FAILED',
    /** A specific field within a section could not be parsed. */
    FIELD_PARSE_FAILED: 'PARSE_FIELD_PARSE_FAILED',
    /** A date string in the file could not be converted to ISO 8601. */
    DATE_PARSE_FAILED: 'PARSE_DATE_PARSE_FAILED',
    /** A numeric value in the file could not be converted to a number. */
    NUMBER_PARSE_FAILED: 'PARSE_NUMBER_PARSE_FAILED',
    /** The file is empty or contains no parseable content. */
    EMPTY_FILE: 'PARSE_EMPTY_FILE',
  },

  /**
   * Database access failures.
   * HTTP 500 (except NOT_FOUND = 404).
   */
  DATABASE: {
    /** A database query failed. Cause: Supabase error, network issue, or bad query. HTTP 500. */
    QUERY_FAILED: 'DATABASE_QUERY_FAILED',
    /** Cannot connect to the database. Cause: Supabase unreachable or credentials invalid. HTTP 500. */
    CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
    /** A database transaction was rolled back. HTTP 500. */
    TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',
    /** A unique, foreign-key, or check constraint was violated. HTTP 500. */
    CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
    /** The requested row was not found. HTTP 404. */
    NOT_FOUND: 'DATABASE_NOT_FOUND',
  },

  /**
   * Configuration failures — startup only, never user-facing.
   * HTTP 500.
   */
  CONFIG: {
    /** Required environment variables are absent. Cause: missing .env.local or Vercel env config. */
    MISSING_ENV_VARS: 'CONFIG_MISSING_ENV_VARS',
    /** An environment variable has an invalid value. Cause: wrong type or out of allowed range. */
    INVALID_ENV_VALUE: 'CONFIG_INVALID_ENV_VALUE',
  },

  /**
   * PDF / report export failures.
   * HTTP 500.
   */
  EXPORT: {
    /** PDF generation failed. Cause: template error or missing data. */
    PDF_GENERATION_FAILED: 'EXPORT_PDF_GENERATION_FAILED',
    /** HTML template rendering failed. Cause: template syntax error or absent field. */
    TEMPLATE_RENDER_FAILED: 'EXPORT_TEMPLATE_RENDER_FAILED',
  },

  /**
   * Resource-not-found responses for specific aggregates.
   * HTTP 404.
   */
  NOT_FOUND: {
    /** A device with the given identifier does not exist in the fleet. */
    DEVICE: 'NOT_FOUND_DEVICE',
    /** No report was ingested for the given device+date combination. */
    REPORT: 'NOT_FOUND_REPORT',
    /** An alert with the given identifier does not exist or has been cleaned up. */
    ALERT: 'NOT_FOUND_ALERT',
    /** A user with the given identifier does not exist in Supabase Auth. */
    USER: 'NOT_FOUND_USER',
  },
} as const;

/**
 * Union of every valid error code in the system.
 * Derived from ERROR_CODES so additions are automatically reflected here.
 */
export type ErrorCode = {
  [D in keyof typeof ERROR_CODES]: (typeof ERROR_CODES)[D][keyof (typeof ERROR_CODES)[D]];
}[keyof typeof ERROR_CODES];

// ---------------------------------------------------------------------------
// Human-readable descriptions (used in logs and developer tooling)
// ---------------------------------------------------------------------------

const ERROR_DESCRIPTIONS: Record<ErrorCode, string> = {
  // VALIDATION
  [ERROR_CODES.VALIDATION.INVALID_INPUT]: 'The request input failed validation.',
  [ERROR_CODES.VALIDATION.INVALID_DATE]: 'A date value is invalid or improperly formatted.',
  [ERROR_CODES.VALIDATION.INVALID_HOSTNAME]: 'The device hostname does not match the expected pattern.',
  [ERROR_CODES.VALIDATION.MISSING_FIELD]: 'A required field is missing from the input.',
  // AUTH
  [ERROR_CODES.AUTH.INVALID_API_KEY]: 'The provided API key is invalid or missing.',
  [ERROR_CODES.AUTH.SESSION_REQUIRED]: 'Authentication is required to access this resource.',
  [ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  // RATE_LIMIT
  [ERROR_CODES.RATE_LIMIT.TOO_MANY_REQUESTS]: 'Rate limit exceeded. Too many requests in the current window.',
  // INGESTION
  [ERROR_CODES.INGESTION.FILE_TOO_LARGE]: 'The uploaded file exceeds the maximum allowed size.',
  [ERROR_CODES.INGESTION.DUPLICATE_REPORT]: 'A report for this device and date already exists.',
  [ERROR_CODES.INGESTION.HOSTNAME_EXTRACTION_FAILED]: 'Could not extract a valid hostname from the autosupport file.',
  [ERROR_CODES.INGESTION.DEVICE_CREATE_FAILED]: 'Failed to create or locate the device record.',
  [ERROR_CODES.INGESTION.REPORT_SAVE_FAILED]: 'Failed to save the report to the database.',
  [ERROR_CODES.INGESTION.TRANSACTION_FAILED]: 'The ingestion transaction failed and was rolled back.',
  // PARSE
  [ERROR_CODES.PARSE.SECTION_EXTRACTION_FAILED]: 'A required section could not be extracted from the autosupport file.',
  [ERROR_CODES.PARSE.FIELD_PARSE_FAILED]: 'A field within the autosupport file could not be parsed.',
  [ERROR_CODES.PARSE.DATE_PARSE_FAILED]: 'A date value in the autosupport file could not be parsed.',
  [ERROR_CODES.PARSE.NUMBER_PARSE_FAILED]: 'A numeric value in the autosupport file could not be parsed.',
  [ERROR_CODES.PARSE.EMPTY_FILE]: 'The autosupport file is empty or contains no parseable content.',
  // DATABASE
  [ERROR_CODES.DATABASE.QUERY_FAILED]: 'A database query failed.',
  [ERROR_CODES.DATABASE.CONNECTION_FAILED]: 'Could not connect to the database.',
  [ERROR_CODES.DATABASE.TRANSACTION_FAILED]: 'A database transaction failed and was rolled back.',
  [ERROR_CODES.DATABASE.CONSTRAINT_VIOLATION]: 'A database constraint was violated.',
  [ERROR_CODES.DATABASE.NOT_FOUND]: 'The requested record was not found in the database.',
  // CONFIG
  [ERROR_CODES.CONFIG.MISSING_ENV_VARS]: 'Required environment variables are missing.',
  [ERROR_CODES.CONFIG.INVALID_ENV_VALUE]: 'An environment variable has an invalid value.',
  // EXPORT
  [ERROR_CODES.EXPORT.PDF_GENERATION_FAILED]: 'PDF generation failed.',
  [ERROR_CODES.EXPORT.TEMPLATE_RENDER_FAILED]: 'Report template rendering failed.',
  // NOT_FOUND
  [ERROR_CODES.NOT_FOUND.DEVICE]: 'The requested device was not found.',
  [ERROR_CODES.NOT_FOUND.REPORT]: 'The requested report was not found.',
  [ERROR_CODES.NOT_FOUND.ALERT]: 'The requested alert was not found.',
  [ERROR_CODES.NOT_FOUND.USER]: 'The requested user was not found.',
};

/**
 * Returns the human-readable description for a given error code.
 *
 * @param code - A valid ErrorCode from the catalog.
 * @returns A plain-English description suitable for logs and developer tooling.
 */
export function getErrorDescription(code: ErrorCode): string {
  // noUncheckedIndexedAccess: Record<K,V>[K] may be undefined at runtime despite
  // the type — guard defensively.
  const description: string | undefined = ERROR_DESCRIPTIONS[code];
  return description ?? `Unrecognized error code: ${code}`;
}
