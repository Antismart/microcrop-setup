"""
Weather data processing tasks for Celery workers.

Tasks:
- fetch_all_weather_updates: Fetch weather data for all active plots
- fetch_weather_updates: Fetch weather data for specific plot
- process_weather_indices: Calculate weather indices for plot
- check_weather_triggers: Check for damage assessment triggers
- calculate_daily_indices: Calculate daily aggregated indices
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import asyncio

from celery import Task

from .celery_app import celery_app
from config import get_settings
from processors.weather_processor import WeatherProcessor
from storage.timescale_client import TimescaleClient
from storage.redis_cache import RedisCache
from integrations.weatherxm_client import WeatherXMClient
from models.weather import WeatherData, WeatherIndices

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize clients (reused across tasks)
weather_processor = WeatherProcessor()
timescale_client = TimescaleClient()
redis_cache = RedisCache()
weatherxm_client = WeatherXMClient()


class WeatherTask(Task):
    """Base task class with connection management."""
    
    _connections_initialized = False
    
    def before_start(self, task_id, args, kwargs):
        """Initialize connections before task starts."""
        if not self._connections_initialized:
            asyncio.run(self._init_connections())
            self._connections_initialized = True
    
    async def _init_connections(self):
        """Initialize all client connections."""
        await timescale_client.connect()
        await redis_cache.connect()
        await weatherxm_client.connect()
        logger.info("Weather task connections initialized")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f"Weather task failed: {self.name}",
            extra={
                "task_id": task_id,
                "exception": str(exc),
                "args": args,
                "kwargs": kwargs,
            },
            exc_info=einfo,
        )


@celery_app.task(
    name="src.workers.weather_tasks.fetch_all_weather_updates",
    base=WeatherTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def fetch_all_weather_updates(self) -> Dict[str, int]:
    """
    Fetch weather updates for all active plots.
    
    Scheduled: Every 5 minutes
    
    Returns:
        Dict with success/failure counts
    """
    logger.info("Starting weather updates for all plots")
    
    try:
        result = asyncio.run(_fetch_all_weather_updates())
        logger.info(
            f"Weather updates completed: {result['success']} succeeded, {result['failed']} failed"
        )
        return result
    except Exception as exc:
        logger.error(f"Failed to fetch weather updates: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _fetch_all_weather_updates() -> Dict[str, int]:
    """Internal async implementation."""
    # Get all active plots from database
    query = """
        SELECT DISTINCT plot_id, policy_id, latitude, longitude
        FROM weather_data
        WHERE timestamp > NOW() - INTERVAL '30 days'
        UNION
        SELECT DISTINCT plot_id, policy_id, latitude, longitude
        FROM damage_assessments
        WHERE status IN ('pending', 'in_progress')
    """
    
    plots = await timescale_client.execute_query(query)
    
    success_count = 0
    failed_count = 0
    
    # Process each plot
    for plot in plots:
        try:
            # Check if we recently fetched data (rate limiting)
            cache_key = f"weather_fetch:{plot['plot_id']}"
            if await redis_cache.exists(cache_key):
                logger.debug(f"Skipping plot {plot['plot_id']} - recently fetched")
                continue
            
            # Fetch weather data
            weather_data = await weatherxm_client.get_current_weather(
                latitude=plot["latitude"],
                longitude=plot["longitude"],
            )
            
            if weather_data:
                # Store in database
                await timescale_client.store_weather_data(
                    weather_data=weather_data,
                    plot_id=plot["plot_id"],
                    policy_id=plot["policy_id"],
                )
                
                # Cache weather data
                await redis_cache.cache_weather_data(
                    plot_id=plot["plot_id"],
                    data=weather_data.model_dump(),
                )
                
                # Set rate limit marker (5 minutes)
                await redis_cache.set(cache_key, "1", ttl=300)
                
                success_count += 1
                logger.debug(f"Weather data stored for plot {plot['plot_id']}")
            else:
                logger.warning(f"No weather data available for plot {plot['plot_id']}")
                failed_count += 1
                
        except Exception as e:
            logger.error(f"Failed to process plot {plot['plot_id']}: {e}", exc_info=True)
            failed_count += 1
    
    return {
        "success": success_count,
        "failed": failed_count,
        "total": len(plots),
    }


@celery_app.task(
    name="src.workers.weather_tasks.fetch_weather_updates",
    base=WeatherTask,
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def fetch_weather_updates(
    self,
    plot_id: str,
    policy_id: str,
    latitude: float,
    longitude: float,
) -> Dict[str, any]:
    """
    Fetch weather updates for specific plot.
    
    Args:
        plot_id: Plot identifier
        policy_id: Policy identifier
        latitude: Plot latitude
        longitude: Plot longitude
    
    Returns:
        Dict with weather data
    """
    logger.info(f"Fetching weather updates for plot {plot_id}")
    
    try:
        result = asyncio.run(
            _fetch_weather_updates(plot_id, policy_id, latitude, longitude)
        )
        return result
    except Exception as exc:
        logger.error(f"Failed to fetch weather for plot {plot_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _fetch_weather_updates(
    plot_id: str,
    policy_id: str,
    latitude: float,
    longitude: float,
) -> Dict[str, any]:
    """Internal async implementation."""
    # Fetch current weather
    weather_data = await weatherxm_client.get_current_weather(latitude, longitude)
    
    if not weather_data:
        raise ValueError(f"No weather data available for plot {plot_id}")
    
    # Store in database
    await timescale_client.store_weather_data(
        weather_data=weather_data,
        plot_id=plot_id,
        policy_id=policy_id,
    )
    
    # Cache weather data
    await redis_cache.cache_weather_data(
        plot_id=plot_id,
        data=weather_data.model_dump(),
    )
    
    logger.info(f"Weather data stored for plot {plot_id}")
    
    return {
        "plot_id": plot_id,
        "timestamp": weather_data.timestamp.isoformat(),
        "temperature": weather_data.temperature,
        "rainfall": weather_data.rainfall,
    }


@celery_app.task(
    name="src.workers.weather_tasks.process_weather_indices",
    base=WeatherTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def process_weather_indices(
    self,
    plot_id: str,
    policy_id: str,
    start_date: str,
    end_date: Optional[str] = None,
) -> Dict[str, any]:
    """
    Calculate weather indices for plot.
    
    Args:
        plot_id: Plot identifier
        policy_id: Policy identifier
        start_date: Start date (ISO format)
        end_date: End date (ISO format, default: now)
    
    Returns:
        Dict with calculated indices
    """
    logger.info(f"Processing weather indices for plot {plot_id}")
    
    try:
        result = asyncio.run(
            _process_weather_indices(plot_id, policy_id, start_date, end_date)
        )
        return result
    except Exception as exc:
        logger.error(
            f"Failed to process weather indices for plot {plot_id}: {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)


async def _process_weather_indices(
    plot_id: str,
    policy_id: str,
    start_date: str,
    end_date: Optional[str] = None,
) -> Dict[str, any]:
    """Internal async implementation."""
    # Parse dates
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date) if end_date else datetime.now()
    
    # Get weather data from database
    weather_data = await timescale_client.get_weather_data(
        plot_id=plot_id,
        start_date=start,
        end_date=end,
    )
    
    if not weather_data:
        raise ValueError(f"No weather data available for plot {plot_id}")
    
    logger.info(f"Processing {len(weather_data)} weather records for plot {plot_id}")
    
    # Calculate indices
    indices = await weather_processor.calculate_weather_indices(
        plot_id=plot_id,
        policy_id=policy_id,
        start_date=start,
        end_date=end,
        weather_data=weather_data,
    )
    
    # Store indices in database
    await timescale_client.store_weather_indices(
        plot_id=plot_id,
        policy_id=policy_id,
        indices=indices,
    )
    
    # Cache indices
    cache_key = f"weather_indices:{plot_id}:{start_date}:{end_date}"
    await redis_cache.set(cache_key, indices.model_dump_json(), ttl=3600)
    
    logger.info(
        f"Weather indices calculated for plot {plot_id}: "
        f"composite_stress={indices.composite_stress_score:.2f}"
    )
    
    return {
        "plot_id": plot_id,
        "composite_stress_score": indices.composite_stress_score,
        "dominant_stress": indices.dominant_stress,
        "drought_score": indices.drought_index.drought_score if indices.drought_index else None,
        "flood_score": indices.flood_index.flood_score if indices.flood_index else None,
        "heat_score": indices.heat_stress_index.stress_score if indices.heat_stress_index else None,
    }


@celery_app.task(
    name="src.workers.weather_tasks.check_weather_triggers",
    base=WeatherTask,
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def check_weather_triggers(self) -> Dict[str, int]:
    """
    Check for weather-based damage assessment triggers.
    
    Scheduled: Every 10 minutes
    
    Returns:
        Dict with trigger counts
    """
    logger.info("Checking weather triggers for all plots")
    
    try:
        result = asyncio.run(_check_weather_triggers())
        logger.info(f"Weather triggers checked: {result['triggered']} assessments triggered")
        return result
    except Exception as exc:
        logger.error(f"Failed to check weather triggers: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _check_weather_triggers() -> Dict[str, int]:
    """Internal async implementation."""
    # Get recent weather indices that haven't been assessed
    query = """
        SELECT DISTINCT wi.plot_id, wi.policy_id, wi.composite_stress_score
        FROM weather_indices wi
        WHERE wi.timestamp > NOW() - INTERVAL '1 hour'
        AND wi.composite_stress_score >= $1
        AND NOT EXISTS (
            SELECT 1 FROM damage_assessments da
            WHERE da.plot_id = wi.plot_id
            AND da.assessment_end_date > NOW() - INTERVAL '1 day'
        )
    """
    
    triggered_plots = await timescale_client.execute_query(
        query,
        settings.WEATHER_DAMAGE_THRESHOLD,
    )
    
    triggered_count = 0
    
    # Trigger damage assessments
    from .damage_tasks import calculate_damage_assessment
    
    for plot in triggered_plots:
        try:
            # Trigger async damage assessment
            calculate_damage_assessment.delay(
                plot_id=plot["plot_id"],
                policy_id=plot["policy_id"],
                farmer_address="",  # Will be fetched from database
                assessment_period_days=7,
            )
            
            triggered_count += 1
            logger.info(
                f"Damage assessment triggered for plot {plot['plot_id']} "
                f"(stress score: {plot['composite_stress_score']:.2f})"
            )
            
        except Exception as e:
            logger.error(
                f"Failed to trigger assessment for plot {plot['plot_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "triggered": triggered_count,
        "total_checked": len(triggered_plots),
    }


@celery_app.task(
    name="src.workers.weather_tasks.calculate_daily_indices",
    base=WeatherTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def calculate_daily_indices(self) -> Dict[str, int]:
    """
    Calculate daily weather indices for all active plots.
    
    Scheduled: Daily at midnight
    
    Returns:
        Dict with calculation counts
    """
    logger.info("Calculating daily weather indices for all plots")
    
    try:
        result = asyncio.run(_calculate_daily_indices())
        logger.info(
            f"Daily indices calculated: {result['success']} succeeded, {result['failed']} failed"
        )
        return result
    except Exception as exc:
        logger.error(f"Failed to calculate daily indices: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _calculate_daily_indices() -> Dict[str, int]:
    """Internal async implementation."""
    # Get all active plots
    query = """
        SELECT DISTINCT plot_id, policy_id
        FROM weather_data
        WHERE timestamp > NOW() - INTERVAL '30 days'
    """
    
    plots = await timescale_client.execute_query(query)
    
    success_count = 0
    failed_count = 0
    
    # Calculate yesterday's indices for each plot
    yesterday = datetime.now() - timedelta(days=1)
    start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    for plot in plots:
        try:
            # Get weather data
            weather_data = await timescale_client.get_weather_data(
                plot_id=plot["plot_id"],
                start_date=start_date,
                end_date=end_date,
            )
            
            if not weather_data:
                logger.debug(f"No weather data for plot {plot['plot_id']} on {yesterday.date()}")
                continue
            
            # Calculate indices
            indices = await weather_processor.calculate_weather_indices(
                plot_id=plot["plot_id"],
                policy_id=plot["policy_id"],
                start_date=start_date,
                end_date=end_date,
                weather_data=weather_data,
            )
            
            # Store indices
            await timescale_client.store_weather_indices(
                plot_id=plot["plot_id"],
                policy_id=plot["policy_id"],
                indices=indices,
            )
            
            success_count += 1
            
        except Exception as e:
            logger.error(
                f"Failed to calculate daily indices for plot {plot['plot_id']}: {e}",
                exc_info=True,
            )
            failed_count += 1
    
    return {
        "success": success_count,
        "failed": failed_count,
        "total": len(plots),
        "date": yesterday.date().isoformat(),
    }
