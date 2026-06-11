/**
 * Validation schemas for device-related endpoints.
 *
 * Covers:
 *   GET /api/devices               — list all devices
 *   GET /api/devices/[id]          — path param validation
 */

import { z } from 'zod';
import { uuidSchema, booleanParam } from './common.schema';

// ---------------------------------------------------------------------------
// GET /api/devices
// ---------------------------------------------------------------------------

export const devicesQuerySchema = z.object({
  /** When omitted, defaults to true (only active devices are returned). */
  active: booleanParam(true),
});

export type DevicesQuery = z.infer<typeof devicesQuerySchema>;

// ---------------------------------------------------------------------------
// Path params
// ---------------------------------------------------------------------------

/** Validates the [id] path segment present in /api/devices/[id]/... routes. */
export const deviceIdParamSchema = z.object({
  id: uuidSchema,
});

export type DeviceIdParam = z.infer<typeof deviceIdParamSchema>;
