import Redis from 'ioredis';

let redisClient = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl && redisUrl.trim()) {
  try {
    redisClient = new Redis(redisUrl.trim(), {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ [REDIS] Max reconnect attempts reached. Falling back to high-speed in-memory cache.');
          return null; // stop reconnecting
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ [REDIS] Connected to Redis server successfully');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      console.warn(`⚠️ [REDIS WARNING]: ${err.message || 'Connection issue'}. Utilizing in-memory cache fallback.`);
      isConnected = false;
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ [REDIS INIT ERROR]:', err.message);
    redisClient = null;
    isConnected = false;
  }
} else {
  console.log('ℹ️ [CACHE] REDIS_URL not configured. Operating in high-speed In-Memory cache fallback mode.');
}

/**
 * Returns active Redis client instance or null
 * @returns {Redis|null}
 */
export const getRedisClient = () => redisClient;

/**
 * Checks if Redis client is connected and ready to process commands
 * @returns {boolean}
 */
export const isRedisReady = () => Boolean(redisClient && isConnected && redisClient.status === 'ready');

export default redisClient;
