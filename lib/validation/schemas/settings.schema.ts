/**
 * Validation schemas for settings endpoints.
 *
 * Covers:
 *   PATCH /api/settings/profile            — update own display name / email
 *   PATCH /api/settings/password           — change own password
 *   PATCH /api/settings/system             — system-wide notification settings
 *   GET   /api/settings/users              — list all users (admin only)
 *   POST  /api/settings/users              — invite / create a new user (admin only)
 *   PATCH /api/settings/users/[id]         — update a user's role / status (admin only)
 */

import { z } from 'zod';
import { uuidSchema } from './common.schema';

// ---------------------------------------------------------------------------
// PATCH /api/settings/profile
// ---------------------------------------------------------------------------

export const updateProfileBodySchema = z
  .object({
    /** New display name for the authenticated user. */
    display_name: z
      .string()
      .min(1, { message: 'display_name must not be empty.' })
      .max(120, { message: 'display_name must not exceed 120 characters.' })
      .optional(),

    /** New email address for the authenticated user. */
    email: z
      .string()
      .email({ message: 'Must be a valid email address.' })
      .optional(),
  })
  .refine(
    ({ display_name, email }) => display_name !== undefined || email !== undefined,
    { message: 'At least one of display_name or email must be provided.' },
  );

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/settings/password
// ---------------------------------------------------------------------------

export const updatePasswordBodySchema = z
  .object({
    /** The user's current password for re-authentication before changing. */
    current_password: z
      .string({ required_error: 'current_password is required.' })
      .min(1, { message: 'current_password must not be empty.' }),

    /** The desired new password. Minimum 8 characters. */
    new_password: z
      .string({ required_error: 'new_password is required.' })
      .min(8, { message: 'new_password must be at least 8 characters.' })
      .max(128, { message: 'new_password must not exceed 128 characters.' }),
  })
  .refine(
    ({ current_password, new_password }) => current_password !== new_password,
    {
      message: 'new_password must differ from current_password.',
      path: ['new_password'],
    },
  );

export type UpdatePasswordBody = z.infer<typeof updatePasswordBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/settings/system
// ---------------------------------------------------------------------------

export const updateSystemSettingsBodySchema = z
  .object({
    /**
     * Email address that receives alert and missing-report notifications.
     * Stored in dd_devices.admin_email for per-device routing; system-wide
     * default falls back to env ADMIN_EMAIL.
     */
    admin_notification_email: z
      .string()
      .email({ message: 'Must be a valid email address.' })
      .optional(),

    /** How many days of ingested reports to retain before cleanup. */
    report_retention_days: z
      .number({ invalid_type_error: 'report_retention_days must be a number.' })
      .int({ message: 'report_retention_days must be an integer.' })
      .min(30,  { message: 'report_retention_days must be at least 30 days.' })
      .max(3650, { message: 'report_retention_days must be at most 3,650 days (10 years).' })
      .optional(),

    /** Whether to send alert-triggered email notifications. */
    alert_email_enabled: z
      .boolean({ invalid_type_error: 'alert_email_enabled must be a boolean.' })
      .optional(),

    /** Whether to send weekly fleet-health digest emails. */
    weekly_report_enabled: z
      .boolean({ invalid_type_error: 'weekly_report_enabled must be a boolean.' })
      .optional(),
  })
  .refine(
    (body) => Object.values(body).some((v) => v !== undefined),
    { message: 'At least one setting must be provided.' },
  );

export type UpdateSystemSettingsBody = z.infer<typeof updateSystemSettingsBodySchema>;

// ---------------------------------------------------------------------------
// POST /api/settings/users
// ---------------------------------------------------------------------------

const USER_ROLES = ['admin', 'operator', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const createUserBodySchema = z.object({
  /** Email address for the new user account (Supabase Auth invite). */
  email: z
    .string({ required_error: 'email is required.' })
    .email({ message: 'Must be a valid email address.' }),

  /** Role assigned to the new user. Defaults to viewer if omitted. */
  role: z
    .enum(USER_ROLES, {
      errorMap: () => ({ message: 'role must be one of: admin, operator, viewer.' }),
    })
    .default('viewer'),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/settings/users/[id]
// ---------------------------------------------------------------------------

export const updateUserBodySchema = z
  .object({
    /** New role for the user. */
    role: z
      .enum(USER_ROLES, {
        errorMap: () => ({ message: 'role must be one of: admin, operator, viewer.' }),
      })
      .optional(),

    /** Deactivate (false) or re-activate (true) the user account. */
    is_active: z
      .boolean({ invalid_type_error: 'is_active must be a boolean.' })
      .optional(),
  })
  .refine(
    ({ role, is_active }) => role !== undefined || is_active !== undefined,
    { message: 'At least one of role or is_active must be provided.' },
  );

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

/** Validates the [id] path param for /api/settings/users/[id]. */
export const userIdParamSchema = z.object({
  id: uuidSchema,
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
