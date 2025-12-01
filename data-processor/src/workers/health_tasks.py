"""
Health check and monitoring tasks for Celery workers.

Tasks:
- health_check: Verify all services are operational
- collect_metrics: Collect system metrics for monitoring
"""

import logging
from datetime import datetime
from typing import Any, Dict
import asyncio

from celery import Task

from .celery_app import celery_app
from src.config import get_settings
from src.storage.timescale_client import TimescaleClient
from src.storage.redis_cache import RedisCache
from src.integrations.weatherxm_client import WeatherXMClient

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize clients
timescale_client = TimescaleClient()
redis_cache = RedisCache()
weatherxm_client = WeatherXMClient()


class HealthTask(Task):
    """Base task class for health checks."""
    
    _connections_initialized = False
    
    def before_start(self, task_id, args, kwargs):
        """Initialize connections before task starts."""
        if not self._connections_initialized:
            asyncio.run(self._init_connections())
            self._connections_initialized = True
    
    async def _init_connections(self):
        """Initialize all client connections."""
        try:
            await timescale_client.connect()
            await redis_cache.connect()
            await weatherxm_client.connect()
            logger.info("Health task connections initialized")
        except Exception as e:
            logger.error(f"Failed to initialize health task connections: {e}")


@celery_app.task(
    name="src.workers.health_tasks.health_check",
    base=HealthTask,
    bind=True,
)
def health_check(self) -> Dict[str, Any]:
    """
    Perform health check on all services.
    
    Scheduled: Every minute
    
    Returns:
        Dict with health status for each service
    """
    try:
        result = asyncio.run(_health_check())
        
        # Log if any service is unhealthy
        unhealthy = [k for k, v in result["services"].items() if not v["healthy"]]
        if unhealthy:
            logger.warning(f"Unhealthy services detected: {', '.join(unhealthy)}")
        
        return result
    except Exception as exc:
        logger.error(f"Health check failed: {exc}", exc_info=True)
        return {
            "healthy": False,
            "error": str(exc),
            "timestamp": datetime.now().isoformat(),
        }


async def _health_check() -> Dict[str, Any]:
    """Internal async implementation."""
    results = {
        "healthy": True,
        "timestamp": datetime.now().isoformat(),
        "services": {},
    }
    
    # Check TimescaleDB
    try:
        await timescale_client.execute_query("SELECT 1")
        results["services"]["timescaledb"] = {
            "healthy": True,
            "response_time_ms": 0,
        }
    except Exception as e:
        results["services"]["timescaledb"] = {
            "healthy": False,
            "error": str(e),
        }
        results["healthy"] = False
    
    # Check Redis
    try:
        await redis_cache.set("health_check", "ok", ttl=60)
        value = await redis_cache.get("health_check")
        results["services"]["redis"] = {
            "healthy": value == "ok",
        }
        if value != "ok":
            results["healthy"] = False
    except Exception as e:
        results["services"]["redis"] = {
            "healthy": False,
            "error": str(e),
        }
        results["healthy"] = False

    # Check WeatherXM (non-blocking)
    try:
        # Just check if client is configured
        results["services"]["weatherxm"] = {
            "healthy": weatherxm_client._http_client is not None,
            "note": "Limited check - not making API call",
        }
    except Exception as e:
        results["services"]["weatherxm"] = {
            "healthy": False,
            "error": str(e),
        }

    return results


@celery_app.task(
    name="src.workers.health_tasks.collect_metrics",
    base=HealthTask,
    bind=True,
)
def collect_metrics(self) -> Dict[str, Any]:
    """
    Collect system metrics for monitoring.
    
    Returns:
        Dict with system metrics
    """
    try:
        result = asyncio.run(_collect_metrics())
        return result
    except Exception as exc:
        logger.error(f"Metrics collection failed: {exc}", exc_info=True)
        return {
            "error": str(exc),
            "timestamp": datetime.now().isoformat(),
        }


async def _collect_metrics() -> Dict[str, Any]:
    """Internal async implementation."""
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "counts": {},
        "rates": {},
    }
    
    try:
        # Count weather data points (last 24 hours)
        query = "SELECT COUNT(*) as count FROM weather_data WHERE timestamp > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["counts"]["weather_data_24h"] = result[0]["count"] if result else 0
        
        # Count satellite images (last 24 hours)
        query = "SELECT COUNT(*) as count FROM satellite_images WHERE capture_date > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["counts"]["satellite_images_24h"] = result[0]["count"] if result else 0
        
        # Count damage assessments (last 24 hours)
        query = "SELECT COUNT(*) as count FROM damage_assessments WHERE created_at > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["counts"]["damage_assessments_24h"] = result[0]["count"] if result else 0
        
        # Count pending payouts
        query = "SELECT COUNT(*) as count FROM damage_assessments WHERE payout_status = 'pending'"
        result = await timescale_client.execute_query(query)
        metrics["counts"]["pending_payouts"] = result[0]["count"] if result else 0
        
        # Count active plots
        query = "SELECT COUNT(DISTINCT plot_id) as count FROM weather_data WHERE timestamp > NOW() - INTERVAL '7 days'"
        result = await timescale_client.execute_query(query)
        metrics["counts"]["active_plots"] = result[0]["count"] if result else 0
        
    except Exception as e:
        logger.error(f"Failed to collect metrics: {e}", exc_info=True)
        metrics["error"] = str(e)
    
    return metrics
