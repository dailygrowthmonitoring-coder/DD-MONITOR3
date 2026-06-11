/**
 * Structured logger for DD Monitor.
 *
 * All log output is JSON (pino). In development, pino-pretty formats it for
 * human readability. In production, pure JSON lines are emitted to stdout and
 * captured by Vercel's logging pipeline.
 *
 * Rules:
 * - Never use console.log/warn/error in application code — use this logger.
 * - Never log secrets, raw file content, full autosupport text, or env values.
 * - Log field NAMES, not VALUES for anything sensitive.
 * - Structured context objects are always preferred over interpolated strings.
 *
 * Dependency: pino (external). No internal deps — infrastructure foundation.
 */

import pino from 'pino';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * Contextual fields that can accompany any log entry.
 * All fields are optional — include only what is relevant at each call site.
 */
export interface LogContext {
  /** Traces a single ingestion or request end-to-end across all log entries. */
  correlationId?: string;
  /** Which DD appliance this log entry concerns (e.g. DD6300BSR.iq.zain.com). */
  deviceHostname?: string;
  /** The ISO 8601 date of the report being processed (e.g. 2026-06-10). */
  reportDate?: string;
  /** The Supabase Auth user ID of the authenticated caller. */
  userId?: string;
  /** Wall-clock duration of the operation in milliseconds. */
  durationMs?: number;
  /** Extensible: any additional structured fields. */
  [key: string]: unknown;
}

/** Log levels from most to least severe. */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * The Logger interface implemented by both the singleton and correlated loggers.
 */
export interface Logger {
  /**
   * Log an error that needs attention.
   * @param message - Human-readable description of what failed.
   * @param context - Structured fields for tracing and diagnostics.
   * @param error - The underlying error/exception (extracted safely).
   */
  error(message: string, context?: LogContext, error?: unknown): void;

  /**
   * Log a recoverable or degraded condition.
   * @param message - Human-readable description.
   * @param context - Structured context fields.
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log a significant lifecycle event (ingestion start/end, alert fired, etc.).
   * @param message - Human-readable event description.
   * @param context - Structured context fields.
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log development-only detail. Never emitted in production.
   * @param message - Human-readable debug description.
   * @param context - Structured context fields.
   */
  debug(message: string, context?: LogContext): void;
}

// ---------------------------------------------------------------------------
// Pino instance setup
// ---------------------------------------------------------------------------

const isDevelopment = process.env['NODE_ENV'] !== 'production';
const logLevel: LogLevel = isDevelopment ? 'debug' : 'info';

// pino.Logger is the type from the pino namespace
type PinoInstance = ReturnType<typeof pino>;

/**
 * The pino base instance. One configuration branch per environment:
 * - development: pino-pretty transport for colorized, human-readable output
 * - production:  pure JSON to stdout, captured by Vercel's log drain
 */
const pinoBase: PinoInstance = isDevelopment
  ? pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
          messageKey: 'message',
        },
      },
      messageKey: 'message',
      timestamp: pino.stdTimeFunctions.isoTime,
    })
  : pino({
      level: logLevel,
      messageKey: 'message',
      timestamp: pino.stdTimeFunctions.isoTime,
      base: { env: 'production' },
    });

// ---------------------------------------------------------------------------
// Error serialization
// ---------------------------------------------------------------------------

/** Structured shape emitted when an error object is passed to logger.error(). */
interface SerializedError {
  readonly errorName: string;
  readonly errorMessage: string;
  readonly errorStack: string | undefined;
}

/**
 * Safely converts an unknown thrown value to a loggable shape.
 * Never passes raw unknown values into pino — always coerces to a plain object.
 */
function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }
  return {
    errorName: 'UnknownError',
    errorMessage: String(error),
    errorStack: undefined,
  };
}

// ---------------------------------------------------------------------------
// Logger factory (used for both the singleton and correlated children)
// ---------------------------------------------------------------------------

/**
 * Constructs a Logger implementation backed by the given pino instance.
 */
function buildLogger(pinoInstance: PinoInstance): Logger {
  return {
    error(message: string, context?: LogContext, error?: unknown): void {
      const errorFields: SerializedError | Record<string, never> =
        error !== undefined ? serializeError(error) : {};
      pinoInstance.error({ ...(context ?? {}), ...errorFields }, message);
    },

    warn(message: string, context?: LogContext): void {
      pinoInstance.warn(context ?? {}, message);
    },

    info(message: string, context?: LogContext): void {
      pinoInstance.info(context ?? {}, message);
    },

    debug(message: string, context?: LogContext): void {
      pinoInstance.debug(context ?? {}, message);
    },
  };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * The application-wide structured logger.
 *
 * Use this for log entries not associated with a single correlated operation.
 * For ingestion pipelines, prefer `createCorrelatedLogger`.
 *
 * @example
 * logger.info('Alert engine started', { deviceHostname: 'DD6300BSR.iq.zain.com' });
 * logger.error('Ingest failed', { fileName: 'dd6300.txt' }, caughtError);
 */
export const logger: Logger = buildLogger(pinoBase);

/**
 * Creates a child Logger with `correlationId` pre-bound to every log entry.
 *
 * Use this at the start of any operation that spans multiple layers.
 * Pass the returned logger down through all steps — every entry will carry
 * the same ID for end-to-end tracing in the Logs page.
 *
 * @param correlationId - A unique ID for the operation (e.g. crypto.randomUUID()).
 * @returns A Logger with correlationId attached to all log calls.
 *
 * @example
 * const log = createCorrelatedLogger(crypto.randomUUID());
 * log.info('Ingest started', { fileName, deviceHostname });
 */
export function createCorrelatedLogger(correlationId: string): Logger {
  return buildLogger(pinoBase.child({ correlationId }));
}
