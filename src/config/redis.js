import Redis from 'ioredis';
import { ENV } from './env.js';

let redisClient = null;
let isConnected = false;

let redisUrl = ENV.REDIS_URL;

if (redisUrl && redisUrl.trim()) {
  try {
    let cleanUrl = redisUrl.trim();
    const isUpstash = cleanUrl.includes('upstash.io');
    if (isUpstash && cleanUrl.startsWith('redis://')) {
      cleanUrl = cleanUrl.replace('redis://', 'rediss://');
    }
    const isTls = cleanUrl.startsWith('rediss://');

    redisClient = new Redis(cleanUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 8000,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ [REDIS] Max reconnect attempts reached. Falling back to high-speed in-memory cache.');
          return null; // stop reconnecting
        }
        return Math.min(times * 200, 2000);
      },
    });

    let hasLoggedReady = false;

    redisClient.on('connect', () => {
      isConnected = true;
    });

    redisClient.on('ready', () => {
      isConnected = true;
      if (!hasLoggedReady) {
        console.log('✅ [REDIS] Connected to Redis server successfully (Ready)');
        hasLoggedReady = true;
      }
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
