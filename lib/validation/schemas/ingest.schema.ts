/**
 * Validation schema for POST /api/ingest.
 *
 * The ingest endpoint receives raw autosupport text from the Google Apps Script
 * that processes daily DD appliance emails. It is the only public write endpoint
 * and is guarded by x-api-key + rate limiting before this schema is evaluated.
 */

import { z } from 'zod';

// DD autosupport files are ~2.8 MiB each. 15 MiB gives generous headroom for
// any future growth without opening the door to runaway uploads.
const MAX_RAW_TEXT_CHARS = 15_000_000;

// A well-formed autosupport begins with "Data Domain Autosupport Report" and
// will always be several KiB. Anything shorter is noise or a mis-routed POST.
const MIN_RAW_TEXT_CHARS = 1_000;

export const ingestBodySchema = z.object({
  /**
   * Complete raw text of the autosupport file, as extracted from the email
   * attachment. Must be non-empty and within the 15-MiB ceiling.
   */
  raw_text: z
    .string({ required_error: 'raw_text is required.' })
    .min(MIN_RAW_TEXT_CHARS, {
      message: `raw_text is too short to be a valid autosupport file (minimum ${MIN_RAW_TEXT_CHARS.toLocaleString()} characters).`,
    })
    .max(MAX_RAW_TEXT_CHARS, {
      message: `raw_text exceeds the 15-MiB limit (${MAX_RAW_TEXT_CHARS.toLocaleString()} characters).`,
    }),

  /**
   * Original attachment file name, e.g. "DD6300BSR_autosupport_2025-03-10.txt".
   * Optional — logged for traceability but not used in parsing.
   */
  file_name: z
    .string()
    .min(1, { message: 'file_name must not be an empty string.' })
    .max(255, { message: 'file_name must not exceed 255 characters.' })
    .optional(),
});

export type IngestBody = z.infer<typeof ingestBodySchema>;
