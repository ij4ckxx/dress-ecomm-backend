import NodeCache from 'node-cache';
import redisClient, { isRedisReady } from '../config/redis.js';

/**
 * Global In-Memory Cache (0-Cost Node.js Memory Fallback)
 * Default TTL: 60 seconds (prevents overwhelming free PostgreSQL tiers like Neon/Render)
 */
export const memoryCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

/**
 * Gets a cached item by key (checks Redis first, then memoryCache)
 * @param {string} key
 * @returns {Promise<any>}
 */
export const getCache = async (key) => {
  try {
    if (isRedisReady()) {
      const data = await redisClient.get(key);
      if (data !== null && data !== undefined) {
        return JSON.parse(data);
      }
      return null;
    }
  } catch (err) {
    console.warn(`[CACHE GET ERROR for "${key}"]:`, err.message);
  }

  const inMem = memoryCache.get(key);
  return inMem !== undefined ? inMem : null;
};

/**
 * Sets a cached item by key with TTL in seconds
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=60]
 * @returns {Promise<boolean>}
 */
export const setCache = async (key, value, ttlSeconds = 60) => {
  try {
    if (isRedisReady()) {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    }
  } catch (err) {
    console.warn(`[CACHE SET ERROR for "${key}"]:`, err.message);
  }

  return memoryCache.set(key, value, ttlSeconds);
};

/**
 * Deletes a cached item by key
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const deleteCache = async (key) => {
  try {
    if (isRedisReady()) {
      await redisClient.del(key);
    }
  } catch (err) {
    console.warn(`[CACHE DEL ERROR for "${key}"]:`, err.message);
  }

  memoryCache.del(key);
  return true;
};

/**
 * Invalidate a specific cache key or all keys matching a prefix
 * @param {string} [prefix] - If provided, clears keys starting with prefix. Otherwise flushes all.
 * @returns {Promise<void>}
 */
export const purgeCache = async (prefix) => {
  try {
    if (isRedisReady()) {
      if (!prefix) {
        await redisClient.flushdb();
      } else {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            await redisClient.del(...keys);
          }
        } while (cursor !== '0');
      }
    }
  } catch (err) {
    console.warn(`[CACHE PURGE ERROR for prefix "${prefix}"]:`, err.message);
  }

  if (!prefix) {
    memoryCache.flushAll();
    return;
  }

  const inMemKeys = memoryCache.keys();
  const keysToDelete = inMemKeys.filter((k) => k.startsWith(prefix));
  if (keysToDelete.length > 0) {
    memoryCache.del(keysToDelete);
  }
};

/**
 * Cache-aside helper: Returns cached data if present, otherwise calls fetcher function and caches the result.
 *
 * @param {string} key - Cache key identifier
 * @param {Function} fetcherFn - Async function returning fresh data if cache missed
 * @param {number} [ttlSeconds=60] - Optional TTL in seconds
 * @returns {Promise<{ data: any, fromCache: boolean }>}
 */
export const getOrSetCache = async (key, fetcherFn, ttlSeconds = 60) => {
  const cached = await getCache(key);
  if (cached !== null && cached !== undefined) {
    return { data: cached, fromCache: true };
  }

  const freshData = await fetcherFn();
  if (freshData !== undefined && freshData !== null) {
    await setCache(key, freshData, ttlSeconds);
  }
  return { data: freshData, fromCache: false };
};

/**
 * Invalidates a user's session cache across Redis and in-memory caches
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const invalidateUserSession = async (userId) => {
  if (!userId) return;
  await deleteCache(`auth:user:${userId}`);
};
