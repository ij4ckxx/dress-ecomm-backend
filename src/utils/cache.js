import NodeCache from 'node-cache';

/**
 * Global In-Memory Cache (0-Cost Node.js Memory)
 * Default TTL: 60 seconds (prevents overwhelming free PostgreSQL tiers like Neon/Render)
 */
export const memoryCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

/**
 * Cache-aside helper: Returns cached data if present, otherwise calls fetcher function and caches the result.
 *
 * @param {string} key - Cache key identifier
 * @param {Function} fetcherFn - Async function returning fresh data if cache missed
 * @param {number} [ttlSeconds=60] - Optional TTL in seconds
 * @returns {Promise<{ data: any, fromCache: boolean }>}
 */
export const getOrSetCache = async (key, fetcherFn, ttlSeconds = 60) => {
  const cached = memoryCache.get(key);
  if (cached !== undefined) {
    return { data: cached, fromCache: true };
  }

  const freshData = await fetcherFn();
  memoryCache.set(key, freshData, ttlSeconds);
  return { data: freshData, fromCache: false };
};

/**
 * Invalidate a specific cache key or all keys matching a prefix
 *
 * @param {string} [prefix] - If provided, clears keys starting with prefix. Otherwise flushes all.
 */
export const purgeCache = (prefix) => {
  if (!prefix) {
    memoryCache.flushAll();
    return;
  }

  const keys = memoryCache.keys();
  const keysToDelete = keys.filter((k) => k.startsWith(prefix));
  if (keysToDelete.length > 0) {
    memoryCache.del(keysToDelete);
  }
};
