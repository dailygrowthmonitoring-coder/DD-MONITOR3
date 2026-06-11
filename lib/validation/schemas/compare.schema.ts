/**
 * Validation schema for GET /api/reports/compare.
 *
 * Compares storage and compression metrics across multiple devices on a
 * given date. The UI sends device_ids as repeated query params:
 *   ?device_ids=<uuid1>&device_ids=<uuid2>
 */

import { z } from 'zod';
import { uuidSchema, isoDateSchema } from './common.schema';

// The comparison view is meaningful with ≥2 devices and the UI supports up
// to 7 (Zain Iraq's full fleet). Allowing more than 7 would be an API misuse.
const MIN_DEVICES = 2;
const MAX_DEVICES = 7;

export const compareQuerySchema = z.object({
  /**
   * Array of device UUIDs to compare. Sent as repeated query param values:
   *   ?device_ids=<uuid1>&device_ids=<uuid2>
   * Between 2 and 7 devices are required.
   */
  device_ids: z
    .union([uuidSchema, z.array(uuidSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .pipe(
      z
        .array(uuidSchema)
        .min(MIN_DEVICES, {
          message: `At least ${MIN_DEVICES} device IDs are required for comparison.`,
        })
        .max(MAX_DEVICES, {
          message: `At most ${MAX_DEVICES} device IDs are supported per comparison.`,
        }),
    ),

  /**
   * Report date to compare across devices. When omitted, the most recent
   * available date for each device is used.
   */
  date: isoDateSchema.optional(),
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;
