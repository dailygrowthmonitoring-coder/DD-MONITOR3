/**
 * Generic TTL-based in-memory cache for expensive, slow-changing reads.
 *
 * Used by the analytics service for fleet-wide aggregations (storage trends,
 * capacity comparisons) that would be costly to recompute on every dashboard
 * request. Cache hits serve pre-computed results; misses trigger a fetcher and
 * store the fresh result for the configured TTL.
 *
 * Implementation notes:
 * - Single-process, in-memory Map. No locking needed: JavaScript is single-threaded
 *   and all operations complete synchronously (except getOrSet which yields only
 *   during the fetcher call). No two synchronous paths can interleave.
 * - On Vercel serverless, each function invocation may have a cold cache (new
 *   process). The cache is warm only within a single function lifetime. This is
 *   acceptable: cache misses return correct data, just at higher latency.
 * - The periodic eviction sweep (setInterval every 5 minutes) removes entries
 *   that have expired but were never accessed. In serverless contexts the interval
 *   may not fire between short-lived invocations; this is fine — expired entries
 *   are also rejected lazily in get() and has().
 * - Memory: one entry ≈ key string + serialized value + 3 numbers. At 50 devices
 *   × 10 cached aggregations each, peak memory is negligible.
 *
 * Dependency: config.ts (for default TTL). No other internal deps.
 */

import { config } from '../config/config';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A single cache entry with its value and expiry metadata. */
interface CacheEntry<T> {
  readonly value: T;
  /** Epoch ms at which this entry expires and must be refetched. */
  readonly expiresAt: number;
  /** Epoch ms at which this entry was created (for diagnostics). */
  readonly createdAt: number;
}

// ---------------------------------------------------------------------------
// Cache class
// ---------------------------------------------------------------------------

/**
 * A generic, typed, TTL-based in-memory cache.
 *
 * @template T - The type of values stored in this cache.
 *
 * @example
 * const myCache = new Cache<FleetStats>();
 * myCache.set('fleet:overview', stats, 300);
 * const cached = myCache.get('fleet:overview'); // FleetStats | null
 */
export class Cache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  /**
   * Returns the cached value for `key`, or null if the entry is missing or expired.
   *
   * Expired entries are removed on access (lazy eviction).
   *
   * @param key - Cache key.
   * @returns The cached value, or null.
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (entry === undefined) {
      this.misses += 1;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value;
  }

  /**
   * Returns true if `key` exists in the cache AND the entry has not expired.
   *
   * @param key - Cache key.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (entry === undefined) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  /**
   * Stores a value under `key` with a TTL.
   *
   * Overwrites any existing entry for the same key.
   *
   * @param key - Cache key.
   * @param value - Value to cache.
   * @param ttlSeconds - Time-to-live in seconds. Defaults to config.CACHE_TTL_SECONDS.
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds ?? config.CACHE_TTL_SECONDS) * 1000;
    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
    });
  }

  /**
   * Removes the entry for `key`, if present.
   *
   * @param key - Cache key to delete.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Removes all entries from the cache and resets hit/miss counters.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Returns runtime statistics about this cache instance.
   *
   * `size` counts only entries that are present in the Map (may include expired
   * entries not yet evicted by the periodic sweep). `hitRate` is 0 when no
   * requests have been made.
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: eviction sweep
  // ---------------------------------------------------------------------------

  /**
   * Removes all expired entries from the store.
   * Called by the module-level setInterval; also callable directly in tests.
   */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Higher-order helper
// ---------------------------------------------------------------------------

/**
 * Returns the cached value for `key` if it is fresh; otherwise calls `fetcher`,
 * stores the result, and returns it.
 *
 * If `fetcher` throws, the error propagates without caching the failure.
 * This ensures a transient upstream error does not poison the cache.
 *
 * @param cache - The Cache instance to use.
 * @param key - Cache key.
 * @param fetcher - Async function that produces the value on a cache miss.
 * @param ttlSeconds - TTL override in seconds.
 * @returns The cached or freshly fetched value.
 *
 * @example
 * const stats = await getOrSet(analyticsCache, 'fleet:storage-trend', () =>
 *   analyticsService.getStorageTrend(), 300
 * );
 */
export async function getOrSet<T>(
  cache: Cache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  cache.set(key, fresh, ttlSeconds);
  return fresh;
}

// ---------------------------------------------------------------------------
// Singleton cache instances
// ---------------------------------------------------------------------------

/**
 * Cache for fleet-wide analytics data (storage trends, capacity comparisons,
 * backup-rate charts). These aggregations are expensive (materialized-view reads)
 * and change at most once per ingestion cycle.
 */
export const analyticsCache = new Cache<unknown>();

/**
 * Cache for the device list shown on the Overview page.
 * Invalidated (via `.delete()`) whenever a new device is created or a device
 * snapshot is refreshed.
 */
export const deviceListCache = new Cache<unknown>();

// ---------------------------------------------------------------------------
// Periodic eviction sweep
// ---------------------------------------------------------------------------

/**
 * Runs every 5 minutes to evict expired entries from all singleton caches.
 * Prevents unbounded memory growth from entries that are written but never
 * subsequently read (lazy eviction alone would not clean those up).
 *
 * In Vercel serverless, this interval may not fire between short invocations —
 * that is acceptable: the lazy-eviction path in Cache.get() handles correctness;
 * this sweep only manages memory.
 */
const EVICTION_INTERVAL_MS = 5 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    analyticsCache.evictExpired();
    deviceListCache.evictExpired();
  }, EVICTION_INTERVAL_MS);
}
