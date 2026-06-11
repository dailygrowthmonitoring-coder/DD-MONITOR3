/**
 * Domain layer public API.
 *
 * Consumers of the domain (repositories, services, API routes, frontend)
 * import exclusively from this path:
 *   import { Device, DeviceStatus, StoragePercent, Gib } from '@/lib/domain'
 *
 * This barrel re-exports all enums, value objects, and entities.
 * No business logic, no I/O, no database types live here.
 */
export * from './enums';
export * from './value-objects';
export * from './entities';
