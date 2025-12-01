"""
Satellite image processing tasks for Celery workers.

Tasks:
- order_satellite_image: Order satellite image from Spexi
- process_satellite_image: Process downloaded satellite image
- process_pending_images: Process all pending satellite images
- calculate_daily_ndvi: Calculate daily NDVI aggregates
- update_ndvi_baselines: Update historical NDVI baselines
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio
import io

from celery import Task
import numpy as np
import rasterio

from .celery_app import celery_app
from src.config import get_settings
from src.processors.satellite_processor import SatelliteProcessor
from src.storage.timescale_client import TimescaleClient
from src.storage.redis_cache import RedisCache
from src.storage.minio_client import MinIOClient
from src.integrations.spexi_client import SpexiClient
from src.models.satellite import SatelliteImage

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize clients
satellite_processor = SatelliteProcessor()
timescale_client = TimescaleClient()
redis_cache = RedisCache()
minio_client = MinIOClient()
spexi_client = SpexiClient()


class SatelliteTask(Task):
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
        minio_client.connect()
        await spexi_client.connect()
        logger.info("Satellite task connections initialized")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f"Satellite task failed: {self.name}",
            extra={
                "task_id": task_id,
                "exception": str(exc),
                "args": args,
                "kwargs": kwargs,
            },
            exc_info=einfo,
        )


@celery_app.task(
    name="src.workers.satellite_tasks.order_satellite_image",
    base=SatelliteTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def order_satellite_image(
    self,
    plot_id: str,
    policy_id: str,
    latitude: float,
    longitude: float,
    area_hectares: float,
    priority: str = "normal",
) -> Dict[str, any]:
    """
    Order satellite image from Spexi.
    
    Args:
        plot_id: Plot identifier
        policy_id: Policy identifier
        latitude: Plot center latitude
        longitude: Plot center longitude
        area_hectares: Plot area in hectares
        priority: Order priority (low, normal, high)
    
    Returns:
        Dict with order details
    """
    logger.info(f"Ordering satellite image for plot {plot_id}")
    
    try:
        result = asyncio.run(
            _order_satellite_image(
                plot_id, policy_id, latitude, longitude, area_hectares, priority
            )
        )
        return result
    except Exception as exc:
        logger.error(
            f"Failed to order satellite image for plot {plot_id}: {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)


async def _order_satellite_image(
    plot_id: str,
    policy_id: str,
    latitude: float,
    longitude: float,
    area_hectares: float,
    priority: str,
) -> Dict[str, any]:
    """Internal async implementation."""
    # Check if we have a recent order
    cache_key = f"satellite_order:{plot_id}"
    recent_order = await redis_cache.get(cache_key)
    
    if recent_order:
        logger.info(f"Recent order exists for plot {plot_id}: {recent_order}")
        return recent_order
    
    # Place order
    order_id = await spexi_client.order_image(
        plot_id=plot_id,
        latitude=latitude,
        longitude=longitude,
        area_hectares=area_hectares,
        priority=priority,
    )
    
    # Store order metadata in database
    query = """
        INSERT INTO satellite_orders (
            order_id, plot_id, policy_id, latitude, longitude,
            area_hectares, priority, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    """
    
    await timescale_client.execute_query(
        query,
        order_id,
        plot_id,
        policy_id,
        latitude,
        longitude,
        area_hectares,
        priority,
        "pending",
        datetime.now(),
    )
    
    # Cache order
    order_info = {
        "order_id": order_id,
        "plot_id": plot_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
    }
    await redis_cache.set(cache_key, order_info, ttl=86400)  # 24 hours
    
    logger.info(f"Satellite image ordered for plot {plot_id}: {order_id}")
    
    # Schedule processing task
    process_satellite_image.apply_async(
        args=[order_id, plot_id, policy_id],
        countdown=1800,  # Check after 30 minutes
    )
    
    return order_info


@celery_app.task(
    name="src.workers.satellite_tasks.process_satellite_image",
    base=SatelliteTask,
    bind=True,
    max_retries=5,
    default_retry_delay=600,  # 10 minutes
)
def process_satellite_image(
    self,
    order_id: str,
    plot_id: str,
    policy_id: str,
) -> Dict[str, any]:
    """
    Process downloaded satellite image.
    
    Args:
        order_id: Spexi order identifier
        plot_id: Plot identifier
        policy_id: Policy identifier
    
    Returns:
        Dict with processing results
    """
    logger.info(f"Processing satellite image for order {order_id}")
    
    try:
        result = asyncio.run(
            _process_satellite_image(order_id, plot_id, policy_id)
        )
        return result
    except Exception as exc:
        logger.error(
            f"Failed to process satellite image for order {order_id}: {exc}",
            exc_info=True,
        )
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=min(self.default_retry_delay * (2 ** self.request.retries), 3600))


async def _process_satellite_image(
    order_id: str,
    plot_id: str,
    policy_id: str,
) -> Dict[str, any]:
    """Internal async implementation."""
    # Check order status
    status = await spexi_client.get_order_status(order_id)
    
    if status["status"] != "completed":
        raise ValueError(f"Order {order_id} not completed yet: {status['status']}")
    
    # Download image
    logger.info(f"Downloading image for order {order_id}")
    image_data = await spexi_client.download_image(order_id)
    
    # Upload raw image to MinIO
    image_id = f"{plot_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    raw_url = await minio_client.upload_raw_image(
        image_id=image_id,
        image_data=image_data,
        metadata={
            "plot_id": plot_id,
            "policy_id": policy_id,
            "order_id": order_id,
            "capture_date": datetime.now().isoformat(),
        },
    )
    
    # Read image with rasterio
    with rasterio.open(io.BytesIO(image_data)) as src:
        # Read all bands
        bands_data = src.read()
        transform = src.transform
        bounds = src.bounds
        crs = src.crs
        
        # Get metadata
        metadata = {
            "width": src.width,
            "height": src.height,
            "count": src.count,
            "dtype": str(src.dtypes[0]),
            "crs": str(crs),
        }
    
    logger.info(f"Image metadata: {metadata}")
    
    # Process image
    plot_bounds = {
        "min_lon": bounds.left,
        "min_lat": bounds.bottom,
        "max_lon": bounds.right,
        "max_lat": bounds.top,
    }
    
    satellite_image = await satellite_processor.process_satellite_capture(
        image_id=image_id,
        plot_id=plot_id,
        policy_id=policy_id,
        image_data=bands_data,
        capture_date=datetime.now(),
        satellite_source="spexi",
        plot_bounds=plot_bounds,
    )
    
    # Store in database
    await timescale_client.store_satellite_image(satellite_image)
    
    # Extract and upload NDVI raster
    if satellite_image.vegetation_indices:
        ndvi_data = satellite_image.vegetation_indices.ndvi_mean
        
        # Create NDVI raster (simplified - would need proper georeference)
        ndvi_raster = np.full((src.height, src.width), ndvi_data, dtype=np.float32)
        
        # Save to bytes
        ndvi_bytes = io.BytesIO()
        with rasterio.open(
            ndvi_bytes,
            "w",
            driver="GTiff",
            height=src.height,
            width=src.width,
            count=1,
            dtype=np.float32,
            crs=crs,
            transform=transform,
        ) as dst:
            dst.write(ndvi_raster, 1)
        
        # Upload NDVI raster
        await minio_client.upload_ndvi_raster(
            image_id=image_id,
            ndvi_data=ndvi_bytes.getvalue(),
            metadata={
                "plot_id": plot_id,
                "ndvi_mean": ndvi_data,
                "capture_date": datetime.now().isoformat(),
            },
        )
    
    # Cache satellite data
    await redis_cache.cache_satellite_data(
        plot_id=plot_id,
        data=satellite_image.model_dump(),
    )
    
    # Update order status
    query = """
        UPDATE satellite_orders
        SET status = 'completed', completed_at = $1, image_id = $2
        WHERE order_id = $3
    """
    await timescale_client.execute_query(query, datetime.now(), image_id, order_id)
    
    logger.info(
        f"Satellite image processed for plot {plot_id}: "
        f"NDVI={satellite_image.vegetation_indices.ndvi_mean:.3f}"
    )
    
    return {
        "image_id": image_id,
        "plot_id": plot_id,
        "ndvi_mean": satellite_image.vegetation_indices.ndvi_mean,
        "cloud_cover": satellite_image.cloud_cover.cloud_cover_percentage,
        "quality_score": satellite_image.quality_score,
    }


@celery_app.task(
    name="src.workers.satellite_tasks.process_pending_images",
    base=SatelliteTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def process_pending_images(self) -> Dict[str, int]:
    """
    Process all pending satellite image orders.
    
    Scheduled: Every 15 minutes
    
    Returns:
        Dict with processing counts
    """
    logger.info("Processing pending satellite images")
    
    try:
        result = asyncio.run(_process_pending_images())
        logger.info(
            f"Pending images processed: {result['processed']} completed, "
            f"{result['still_pending']} still pending"
        )
        return result
    except Exception as exc:
        logger.error(f"Failed to process pending images: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _process_pending_images() -> Dict[str, int]:
    """Internal async implementation."""
    # Get pending orders
    query = """
        SELECT order_id, plot_id, policy_id, created_at
        FROM satellite_orders
        WHERE status = 'pending'
        AND created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
    """
    
    pending_orders = await timescale_client.execute_query(query)
    
    processed_count = 0
    still_pending_count = 0
    
    for order in pending_orders:
        try:
            # Check status
            status = await spexi_client.get_order_status(order["order_id"])
            
            if status["status"] == "completed":
                # Trigger processing
                process_satellite_image.delay(
                    order_id=order["order_id"],
                    plot_id=order["plot_id"],
                    policy_id=order["policy_id"],
                )
                processed_count += 1
                
            elif status["status"] in ["pending", "processing"]:
                still_pending_count += 1
                
            elif status["status"] == "failed":
                # Update order status
                query = """
                    UPDATE satellite_orders
                    SET status = 'failed', completed_at = $1
                    WHERE order_id = $2
                """
                await timescale_client.execute_query(
                    query, datetime.now(), order["order_id"]
                )
                logger.warning(f"Order {order['order_id']} failed")
                
        except Exception as e:
            logger.error(
                f"Failed to check order {order['order_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "processed": processed_count,
        "still_pending": still_pending_count,
        "total": len(pending_orders),
    }


@celery_app.task(
    name="src.workers.satellite_tasks.calculate_daily_ndvi",
    base=SatelliteTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def calculate_daily_ndvi(self) -> Dict[str, int]:
    """
    Calculate daily NDVI aggregates for all plots.
    
    Scheduled: Daily at midnight + 15 minutes
    
    Returns:
        Dict with calculation counts
    """
    logger.info("Calculating daily NDVI for all plots")
    
    try:
        result = asyncio.run(_calculate_daily_ndvi())
        logger.info(f"Daily NDVI calculated: {result['success']} plots")
        return result
    except Exception as exc:
        logger.error(f"Failed to calculate daily NDVI: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _calculate_daily_ndvi() -> Dict[str, int]:
    """Internal async implementation."""
    # Get yesterday's images
    yesterday = datetime.now() - timedelta(days=1)
    start_date = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    query = """
        SELECT plot_id, AVG((data->>'ndvi_mean')::float) as avg_ndvi,
               COUNT(*) as image_count
        FROM satellite_images
        WHERE capture_date BETWEEN $1 AND $2
        GROUP BY plot_id
    """
    
    results = await timescale_client.execute_query(query, start_date, end_date)
    
    # Store daily aggregates
    for result in results:
        query = """
            INSERT INTO daily_ndvi (date, plot_id, avg_ndvi, image_count)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (date, plot_id) DO UPDATE
            SET avg_ndvi = $3, image_count = $4
        """
        await timescale_client.execute_query(
            query,
            yesterday.date(),
            result["plot_id"],
            result["avg_ndvi"],
            result["image_count"],
        )
    
    return {
        "success": len(results),
        "date": yesterday.date().isoformat(),
    }


@celery_app.task(
    name="src.workers.satellite_tasks.update_ndvi_baselines",
    base=SatelliteTask,
    bind=True,
    max_retries=3,
    default_retry_delay=600,
)
def update_ndvi_baselines(self) -> Dict[str, int]:
    """
    Update NDVI baselines for all plots.
    
    Scheduled: Weekly on Sundays at 2 AM
    
    Returns:
        Dict with update counts
    """
    logger.info("Updating NDVI baselines for all plots")
    
    try:
        result = asyncio.run(_update_ndvi_baselines())
        logger.info(f"NDVI baselines updated: {result['updated']} plots")
        return result
    except Exception as exc:
        logger.error(f"Failed to update NDVI baselines: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _update_ndvi_baselines() -> Dict[str, int]:
    """Internal async implementation."""
    # Get all plots with historical data
    query = """
        SELECT DISTINCT plot_id
        FROM satellite_images
        WHERE capture_date > NOW() - INTERVAL '90 days'
    """
    
    plots = await timescale_client.execute_query(query)
    
    updated_count = 0
    
    # Calculate baseline for each plot
    for plot in plots:
        try:
            # Get baseline NDVI (60-day lookback)
            baseline = await timescale_client.get_baseline_ndvi(
                plot_id=plot["plot_id"],
                reference_date=datetime.now(),
                lookback_days=60,
            )
            
            if baseline is not None:
                # Store baseline
                query = """
                    INSERT INTO ndvi_baselines (plot_id, baseline_ndvi, updated_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (plot_id) DO UPDATE
                    SET baseline_ndvi = $2, updated_at = $3
                """
                await timescale_client.execute_query(
                    query,
                    plot["plot_id"],
                    baseline,
                    datetime.now(),
                )
                
                # Invalidate cache
                await redis_cache.invalidate_plot_cache(plot["plot_id"])
                
                updated_count += 1
                logger.debug(f"Baseline updated for plot {plot['plot_id']}: {baseline:.3f}")
                
        except Exception as e:
            logger.error(
                f"Failed to update baseline for plot {plot['plot_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "updated": updated_count,
        "total": len(plots),
    }
