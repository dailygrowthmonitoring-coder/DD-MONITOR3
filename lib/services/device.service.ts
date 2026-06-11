/**
 * DeviceService — read-side orchestration for devices.
 *
 * Thin wrapper over DeviceRepository that the API routes use for device
 * list and detail endpoints. Alert-rule updates live in a separate service
 * method below since they are called from the Settings page.
 */

import { type Device, type AlertRule, type UpdateAlertRule } from '@/lib/domain';
import {
  createServiceClient,
  DeviceRepository,
  AlertRuleRepository,
} from '@/lib/repositories';
import { type AsyncResult } from '@/lib/infrastructure/errors/result';

// ---------------------------------------------------------------------------
// Device reads
// ---------------------------------------------------------------------------

/**
 * Returns all active devices, ordered by hostname.
 * Used by the Overview page sidebar and the System Health device list.
 */
export async function listActiveDevices(): AsyncResult<Device[]> {
  const db = createServiceClient();
  return new DeviceRepository(db).findAllActive();
}

/**
 * Returns a single device by its UUID.
 *
 * @param id - Device UUID from dd_devices.id.
 * @returns Ok(Device) if found, Err(NotFoundError) if absent.
 */
export async function getDeviceById(id: string): AsyncResult<Device> {
  const db = createServiceClient();
  return new DeviceRepository(db).findById(id);
}

// ---------------------------------------------------------------------------
// Alert rule management (Settings page)
// ---------------------------------------------------------------------------

/**
 * Returns all alert rules (enabled and disabled).
 * Used by the Settings → Alert Rules page.
 */
export async function listAlertRules(): AsyncResult<AlertRule[]> {
  const db = createServiceClient();
  return new AlertRuleRepository(db).findAll();
}

/**
 * Applies a partial update to an alert rule.
 * Only threshold, is_enabled, and severity may be changed.
 *
 * @param id   - Alert rule UUID.
 * @param data - Fields to update (at least one must be supplied).
 * @returns Ok(AlertRule) with the updated row, Err(NotFoundError) if absent.
 */
export async function updateAlertRule(
  id: string,
  data: UpdateAlertRule,
): AsyncResult<AlertRule> {
  const db = createServiceClient();
  return new AlertRuleRepository(db).update(id, data);
}
