const Redis = require('ioredis');

// Check if Redis is configured (optional service)
const isRedisConfigured = process.env.REDIS_HOST || process.env.REDIS_URL;

let redis;

if (isRedisConfigured) {
  // Use REDIS_URL if available (Render/cloud), otherwise use individual config
  const redisConfig = process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  };

  redis = new Redis(redisConfig, {
    retryStrategy(times) {
      // Stop retrying after 3 attempts in production
      if (process.env.NODE_ENV === 'production' && times > 3) {
        console.warn('⚠ Redis unavailable - running without cache');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true, // Don't connect immediately
  });

  redis.on('connect', () => {
    console.log('✓ Redis connected successfully');
  });

  redis.on('error', (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('✗ Redis connection error:', err.message);
    } else {
      console.warn('⚠ Redis unavailable - running without cache');
    }
  });

  redis.on('close', () => {
    console.log('ℹ Redis connection closed');
  });

  // Try to connect, but don't fail if it doesn't work
  redis.connect().catch(() => {
    console.warn('⚠ Redis unavailable - running without cache');
  });

  // Graceful shutdown
  process.on('beforeExit', async () => {
    try {
      await redis.quit();
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
} else {
  console.log('ℹ Redis not configured - running without cache');
  // Mock Redis client that does nothing
  redis = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0,
    expire: async () => 1,
    exists: async () => 0,
    keys: async () => [],
    flushdb: async () => 'OK',
    quit: async () => 'OK',
  };
}

module.exports = redis;
