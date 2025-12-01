"""
Celery tasks for Planet Labs subscription management.

Periodic tasks for:
- Checking subscription status
- Fetching new biomass data
- Handling subscription expiration
- Data quality monitoring
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict
import asyncio

from celery import shared_task
from config import get_settings
from integrations.planet_client import get_planet_client
from storage.timescale_client import get_db_client

settings = get_settings()
logger = logging.getLogger(__name__)


@shared_task(name="planet.check_active_subscriptions")
def check_active_subscriptions():
    """
    Check status of all active Planet subscriptions.
    
    Runs every 6 hours to verify subscriptions are working.
    Updates database with latest status.
    """
    logger.info("Checking active Planet subscriptions")
    
    try:
        # Run async function in sync context
        asyncio.run(_check_active_subscriptions_async())
        logger.info("Successfully checked all active subscriptions")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error checking active subscriptions: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _check_active_subscriptions_async():
    """Async implementation of subscription status check."""
    db = get_db_client()
    planet_client = get_planet_client()
    
    # Get all active subscriptions
    subscriptions = await db.fetch(
        """
        SELECT subscription_id, policy_id, plot_id, start_date, end_date
        FROM planet_subscriptions
        WHERE status = 'active'
        ORDER BY created_at DESC
        """
    )
    
    logger.info(f"Found {len(subscriptions)} active subscriptions to check")
    
    for sub in subscriptions:
        try:
            # Get status from Planet API
            status_data = await planet_client.get_subscription_status(
                sub["subscription_id"]
            )
            
            # Check if subscription should be expired
            if datetime.utcnow() > sub["end_date"]:
                await db.execute(
                    """
                    UPDATE planet_subscriptions
                    SET status = 'expired', updated_at = $1
                    WHERE subscription_id = $2
                    """,
                    datetime.utcnow(),
                    sub["subscription_id"],
                )
                logger.info(f"Marked subscription {sub['subscription_id']} as expired")
            
        except Exception as e:
            logger.error(
                f"Error checking subscription {sub['subscription_id']}: {str(e)}"
            )


@shared_task(name="planet.fetch_latest_biomass")
def fetch_latest_biomass():
    """
    Fetch latest biomass data for all active subscriptions.
    
    Runs daily to update biomass cache.
    CRE workflow reads from this cache for faster response.
    """
    logger.info("Fetching latest biomass data for all active subscriptions")
    
    try:
        asyncio.run(_fetch_latest_biomass_async())
        logger.info("Successfully fetched latest biomass data")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error fetching latest biomass: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _fetch_latest_biomass_async():
    """Async implementation of biomass data fetch."""
    db = get_db_client()
    planet_client = get_planet_client()
    
    # Get active subscriptions
    subscriptions = await db.fetch(
        """
        SELECT subscription_id, policy_id, plot_id
        FROM planet_subscriptions
        WHERE status = 'active'
        """
    )
    
    logger.info(f"Fetching biomass data for {len(subscriptions)} subscriptions")
    
    for sub in subscriptions:
        try:
            # Fetch biomass timeseries
            biomass_data = await planet_client.get_biomass_timeseries(
                subscription_id=sub["subscription_id"],
                plot_id=sub["plot_id"],
            )
            
            # Cache the latest observations
            for datapoint in biomass_data.timeseries[-10:]:  # Last 10 observations
                await db.execute(
                    """
                    INSERT INTO biomass_data_cache 
                    (plot_id, subscription_id, observation_date, biomass_proxy, 
                     cloud_cover, data_quality, raw_data, fetched_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (plot_id, observation_date) 
                    DO UPDATE SET 
                        biomass_proxy = EXCLUDED.biomass_proxy,
                        cloud_cover = EXCLUDED.cloud_cover,
                        data_quality = EXCLUDED.data_quality,
                        raw_data = EXCLUDED.raw_data,
                        fetched_at = EXCLUDED.fetched_at
                    """,
                    sub["plot_id"],
                    sub["subscription_id"],
                    datetime.fromisoformat(datapoint.date),
                    datapoint.biomass_proxy,
                    datapoint.cloud_cover,
                    datapoint.data_quality,
                    {"date": datapoint.date, "biomass": datapoint.biomass_proxy},
                    datetime.utcnow(),
                )
            
            logger.info(
                f"Cached {len(biomass_data.timeseries[-10:])} observations for plot {sub['plot_id']}"
            )
            
        except Exception as e:
            logger.error(
                f"Error fetching biomass for subscription {sub['subscription_id']}: {str(e)}"
            )


@shared_task(name="planet.cancel_expired_subscriptions")
def cancel_expired_subscriptions():
    """
    Cancel subscriptions that have passed their end date.
    
    Runs daily to clean up expired subscriptions and avoid charges.
    """
    logger.info("Cancelling expired Planet subscriptions")
    
    try:
        asyncio.run(_cancel_expired_subscriptions_async())
        logger.info("Successfully cancelled expired subscriptions")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error cancelling expired subscriptions: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _cancel_expired_subscriptions_async():
    """Async implementation of subscription cancellation."""
    db = get_db_client()
    planet_client = get_planet_client()
    
    # Find expired subscriptions still marked as active
    expired_subs = await db.fetch(
        """
        SELECT subscription_id, policy_id, end_date
        FROM planet_subscriptions
        WHERE status = 'active' AND end_date < $1
        """,
        datetime.utcnow(),
    )
    
    logger.info(f"Found {len(expired_subs)} expired subscriptions to cancel")
    
    for sub in expired_subs:
        try:
            # Cancel with Planet API
            success = await planet_client.cancel_subscription(sub["subscription_id"])
            
            if success:
                # Update database
                await db.execute(
                    """
                    UPDATE planet_subscriptions
                    SET status = 'cancelled', updated_at = $1, cancelled_at = $1
                    WHERE subscription_id = $2
                    """,
                    datetime.utcnow(),
                    sub["subscription_id"],
                )
                
                # Log to audit trail
                await db.execute(
                    """
                    INSERT INTO subscription_status_history
                    (subscription_id, old_status, new_status, reason, changed_by, changed_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    sub["subscription_id"],
                    "active",
                    "cancelled",
                    "Policy expired",
                    "system",
                    datetime.utcnow(),
                )
                
                logger.info(f"Cancelled expired subscription {sub['subscription_id']}")
            
        except Exception as e:
            logger.error(
                f"Error cancelling subscription {sub['subscription_id']}: {str(e)}"
            )


@shared_task(name="planet.monitor_data_quality")
def monitor_data_quality():
    """
    Monitor data quality of recent biomass observations.
    
    Alerts if too many low-quality observations for a plot.
    Runs daily.
    """
    logger.info("Monitoring biomass data quality")
    
    try:
        asyncio.run(_monitor_data_quality_async())
        logger.info("Successfully monitored data quality")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error monitoring data quality: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _monitor_data_quality_async():
    """Async implementation of data quality monitoring."""
    db = get_db_client()
    
    # Get plots with low data quality (last 7 days)
    low_quality_plots = await db.fetch(
        """
        SELECT 
            plot_id,
            subscription_id,
            COUNT(*) as total_obs,
            SUM(CASE WHEN data_quality = 'low' THEN 1 ELSE 0 END) as low_quality_count,
            AVG(cloud_cover) as avg_cloud_cover
        FROM biomass_data_cache
        WHERE fetched_at > NOW() - INTERVAL '7 days'
        GROUP BY plot_id, subscription_id
        HAVING SUM(CASE WHEN data_quality = 'low' THEN 1 ELSE 0 END) > 3
        """
    )
    
    if low_quality_plots:
        logger.warning(
            f"Found {len(low_quality_plots)} plots with low data quality",
            extra={"plots": [p["plot_id"] for p in low_quality_plots]},
        )
        
        # TODO: Send alert notifications
        for plot in low_quality_plots:
            logger.warning(
                f"Plot {plot['plot_id']}: {plot['low_quality_count']}/{plot['total_obs']} "
                f"low quality observations (avg cloud cover: {plot['avg_cloud_cover']:.2%})"
            )


@shared_task(name="planet.cleanup_old_cache")
def cleanup_old_cache():
    """
    Clean up old biomass cache data.
    
    Keeps last 90 days of data, removes older entries.
    Runs weekly.
    """
    logger.info("Cleaning up old biomass cache data")
    
    try:
        asyncio.run(_cleanup_old_cache_async())
        logger.info("Successfully cleaned up old cache data")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error cleaning up cache: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _cleanup_old_cache_async():
    """Async implementation of cache cleanup."""
    db = get_db_client()
    
    # Delete cache data older than 90 days
    result = await db.execute(
        """
        DELETE FROM biomass_data_cache
        WHERE fetched_at < $1
        """,
        datetime.utcnow() - timedelta(days=90),
    )
    
    logger.info(f"Deleted old cache entries: {result}")


# Celery Beat Schedule
# Add to celery_app.py:
"""
from celery.schedules import crontab

app.conf.beat_schedule = {
    'check-subscriptions-every-6-hours': {
        'task': 'planet.check_active_subscriptions',
        'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
    },
    'fetch-biomass-daily': {
        'task': 'planet.fetch_latest_biomass',
        'schedule': crontab(minute=0, hour=2),  # 2 AM daily
    },
    'cancel-expired-daily': {
        'task': 'planet.cancel_expired_subscriptions',
        'schedule': crontab(minute=0, hour=3),  # 3 AM daily
    },
    'monitor-quality-daily': {
        'task': 'planet.monitor_data_quality',
        'schedule': crontab(minute=0, hour=4),  # 4 AM daily
    },
    'cleanup-cache-weekly': {
        'task': 'planet.cleanup_old_cache',
        'schedule': crontab(minute=0, hour=5, day_of_week=0),  # Sunday 5 AM
    },
}
"""
