"""
Redis cache client for caching and rate limiting.

Provides:
- Key-value caching with TTL
- Distributed locking
- Rate limiting
- Session management
"""

import asyncio
import logging
from typing import Optional, Any, Dict, TYPE_CHECKING
from datetime import timedelta
import json
import redis.asyncio as redis
from redis.asyncio import Redis

if TYPE_CHECKING:
    from redis.asyncio.lock import Lock as RedisLock
else:
    RedisLock = Any  # For runtime, use Any to avoid import issues

from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RedisCache:
    """Client for Redis caching operations."""
    
    def __init__(self):
        """Initialize Redis cache client."""
        self.settings = settings
        self.logger = logger
        
        # Redis configuration
        self.redis_url = settings.REDIS_URL
        self.max_connections = settings.REDIS_MAX_CONNECTIONS
        
        # TTL settings
        self.default_ttl = settings.CACHE_TTL
        self.weather_ttl = settings.CACHE_WEATHER_TTL
        self.satellite_ttl = settings.CACHE_SATELLITE_TTL
        
        self.client: Optional[Redis] = None
        
        self.logger.info("RedisCache initialized")
    
    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.logger.info("Connecting to Redis")
            
            self.client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self.max_connections,
            )
            
            # Test connection
            await self.client.ping()
            
            self.logger.info("Connected to Redis successfully")
            
        except Exception as e:
            self.logger.error(f"Error connecting to Redis: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.client:
            await self.client.close()
            self.logger.info("Disconnected from Redis")
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set a value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (None for no expiration)
            
        Returns:
            True if successful
        """
        try:
            # Serialize value
            if not isinstance(value, str):
                value = json.dumps(value)
            
            if ttl:
                await self.client.setex(key, ttl, value)
            else:
                await self.client.set(key, value)
            
            self.logger.debug(f"Cached value for key: {key}", extra={"ttl": ttl})
            return True
            
        except Exception as e:
            self.logger.error(f"Error setting cache key {key}: {e}", exc_info=True)
            return False
    
    async def get(
        self,
        key: str,
        deserialize: bool = True,
    ) -> Optional[Any]:
        """
        Get a value from cache.
        
        Args:
            key: Cache key
            deserialize: Whether to JSON deserialize the value
            
        Returns:
            Cached value or None if not found
        """
        try:
            value = await self.client.get(key)
            
            if value is None:
                return None
            
            if deserialize and isinstance(value, str):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            
            return value
            
        except Exception as e:
            self.logger.error(f"Error getting cache key {key}: {e}", exc_info=True)
            return None
    
    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        try:
            result = await self.client.delete(key)
            self.logger.debug(f"Deleted cache key: {key}")
            return result > 0
            
        except Exception as e:
            self.logger.error(f"Error deleting cache key {key}: {e}", exc_info=True)
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        try:
            result = await self.client.exists(key)
            return result > 0
            
        except Exception as e:
            self.logger.error(f"Error checking key existence {key}: {e}", exc_info=True)
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration on an existing key."""
        try:
            result = await self.client.expire(key, ttl)
            return result
            
        except Exception as e:
            self.logger.error(f"Error setting expiration for key {key}: {e}", exc_info=True)
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter."""
        try:
            result = await self.client.incrby(key, amount)
            return result
            
        except Exception as e:
            self.logger.error(f"Error incrementing key {key}: {e}", exc_info=True)
            return None
    
    async def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """Decrement a counter."""
        try:
            result = await self.client.decrby(key, amount)
            return result
            
        except Exception as e:
            self.logger.error(f"Error decrementing key {key}: {e}", exc_info=True)
            return None
    
    async def get_many(self, keys: list[str]) -> Dict[str, Any]:
        """Get multiple values from cache."""
        try:
            values = await self.client.mget(keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        result[key] = value
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting multiple keys: {e}", exc_info=True)
            return {}
    
    async def set_many(
        self,
        mapping: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> bool:
        """Set multiple values in cache."""
        try:
            # Serialize values
            serialized = {
                key: json.dumps(value) if not isinstance(value, str) else value
                for key, value in mapping.items()
            }
            
            await self.client.mset(serialized)
            
            # Set TTL if provided
            if ttl:
                for key in mapping.keys():
                    await self.client.expire(key, ttl)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error setting multiple keys: {e}", exc_info=True)
            return False
    
    async def acquire_lock(
        self,
        lock_name: str,
        timeout: int = 10,
        blocking_timeout: Optional[int] = None,
    ) -> Optional[RedisLock]:
        """
        Acquire a distributed lock.
        
        Args:
            lock_name: Name of the lock
            timeout: Lock timeout in seconds
            blocking_timeout: How long to wait for lock acquisition
            
        Returns:
            Lock object if acquired, None otherwise
        """
        try:
            lock = self.client.lock(
                lock_name,
                timeout=timeout,
                blocking_timeout=blocking_timeout,
            )
            
            acquired = await lock.acquire(blocking=blocking_timeout is not None)
            
            if acquired:
                self.logger.debug(f"Acquired lock: {lock_name}")
                return lock
            else:
                self.logger.warning(f"Failed to acquire lock: {lock_name}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error acquiring lock {lock_name}: {e}", exc_info=True)
            return None
    
    async def release_lock(self, lock: RedisLock) -> bool:
        """Release a distributed lock."""
        try:
            await lock.release()
            self.logger.debug("Released lock")
            return True
            
        except Exception as e:
            self.logger.error(f"Error releasing lock: {e}", exc_info=True)
            return False
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
    ) -> bool:
        """
        Check if rate limit is exceeded.
        
        Args:
            key: Rate limit key (e.g., user_id, ip_address)
            limit: Maximum number of requests
            window: Time window in seconds
            
        Returns:
            True if within limit, False if exceeded
        """
        try:
            rate_key = f"rate_limit:{key}"
            
            # Increment counter
            current = await self.increment(rate_key)
            
            if current == 1:
                # First request, set expiration
                await self.expire(rate_key, window)
            
            # Check if limit exceeded
            is_within_limit = current <= limit
            
            if not is_within_limit:
                self.logger.warning(
                    f"Rate limit exceeded for {key}",
                    extra={"current": current, "limit": limit}
                )
            
            return is_within_limit
            
        except Exception as e:
            self.logger.error(f"Error checking rate limit: {e}", exc_info=True)
            return True  # Allow on error
    
    async def cache_weather_data(
        self,
        plot_id: str,
        data: Any,
    ) -> bool:
        """Cache weather data for a plot."""
        key = f"weather:{plot_id}"
        return await self.set(key, data, ttl=self.weather_ttl)
    
    async def get_cached_weather_data(
        self,
        plot_id: str,
    ) -> Optional[Any]:
        """Get cached weather data for a plot."""
        key = f"weather:{plot_id}"
        return await self.get(key)
    
    async def cache_satellite_data(
        self,
        plot_id: str,
        data: Any,
    ) -> bool:
        """Cache satellite data for a plot."""
        key = f"satellite:{plot_id}"
        return await self.set(key, data, ttl=self.satellite_ttl)
    
    async def get_cached_satellite_data(
        self,
        plot_id: str,
    ) -> Optional[Any]:
        """Get cached satellite data for a plot."""
        key = f"satellite:{plot_id}"
        return await self.get(key)
    
    async def invalidate_plot_cache(self, plot_id: str) -> None:
        """Invalidate all cache for a plot."""
        try:
            keys_to_delete = [
                f"weather:{plot_id}",
                f"satellite:{plot_id}",
                f"damage:{plot_id}",
            ]
            
            for key in keys_to_delete:
                await self.delete(key)
            
            self.logger.info(f"Invalidated cache for plot {plot_id}")
            
        except Exception as e:
            self.logger.error(f"Error invalidating cache: {e}", exc_info=True)
    
    async def flush_all(self) -> bool:
        """Flush all keys from Redis (use with caution!)."""
        try:
            await self.client.flushall()
            self.logger.warning("Flushed all keys from Redis")
            return True
        except Exception as e:
            self.logger.error(f"Error flushing Redis: {e}", exc_info=True)
            return False


# Singleton instance
_redis_cache: Optional[RedisCache] = None


async def get_redis_cache() -> RedisCache:
    """Get or create singleton RedisCache instance."""
    global _redis_cache
    
    if _redis_cache is None:
        _redis_cache = RedisCache()
        await _redis_cache.connect()
    
    return _redis_cache
