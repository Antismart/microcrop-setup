"""
Spexi satellite imagery API client.

Provides:
- Satellite image ordering
- Image download
- Status tracking
- Retry logic
- Error handling
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class SpexiClient:
    """Client for Spexi satellite API operations."""
    
    def __init__(self):
        """Initialize Spexi client."""
        self.settings = settings
        self.logger = logger
        
        # API configuration
        self.api_key = settings.SPEXI_API_KEY
        self.api_url = settings.SPEXI_API_URL
        self.resolution_meters = settings.SPEXI_RESOLUTION_METERS
        self.timeout = settings.SPEXI_TIMEOUT_SECONDS
        
        # HTTP client
        self.client: Optional[httpx.AsyncClient] = None
        
        self.logger.info("SpexiClient initialized")
    
    async def connect(self) -> None:
        """Initialize HTTP client."""
        try:
            self.logger.info("Connecting to Spexi API")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            self.client = httpx.AsyncClient(
                base_url=self.api_url,
                headers=headers,
                timeout=self.timeout,
            )
            
            # Test connection
            await self._test_connection()
            
            self.logger.info("Connected to Spexi API successfully")
            
        except Exception as e:
            self.logger.error(f"Error connecting to Spexi API: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
            self.logger.info("Disconnected from Spexi API")
    
    async def _test_connection(self) -> None:
        """Test API connection."""
        try:
            response = await self.client.get("/api/v1/status")
            response.raise_for_status()
            self.logger.info("Spexi API connection test successful")
        except Exception as e:
            self.logger.error(f"Spexi API connection test failed: {e}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def order_image(
        self,
        plot_id: str,
        latitude: float,
        longitude: float,
        area_hectares: float,
        priority: str = "normal",
    ) -> str:
        """
        Order a satellite image capture for a plot.
        
        Args:
            plot_id: Plot identifier
            latitude: Plot center latitude
            longitude: Plot center longitude
            area_hectares: Plot area in hectares
            priority: Order priority (low, normal, high)
            
        Returns:
            Order ID
        """
        try:
            self.logger.info(
                f"Ordering satellite image for plot {plot_id}",
                extra={
                    "plot_id": plot_id,
                    "lat": latitude,
                    "lon": longitude,
                    "area": area_hectares,
                }
            )
            
            payload = {
                "plot_id": plot_id,
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
                "area_hectares": area_hectares,
                "resolution_meters": self.resolution_meters,
                "priority": priority,
                "bands": ["red", "green", "blue", "nir"],  # Request RGB + NIR
            }
            
            response = await self.client.post(
                "/api/v1/orders",
                json=payload,
            )
            response.raise_for_status()
            
            data = response.json()
            order_id = data["order_id"]
            
            self.logger.info(
                f"Image order created for plot {plot_id}",
                extra={"plot_id": plot_id, "order_id": order_id}
            )
            
            return order_id
            
        except httpx.HTTPError as e:
            self.logger.error(
                f"HTTP error ordering image: {e}",
                extra={"plot_id": plot_id},
                exc_info=True
            )
            raise
        except Exception as e:
            self.logger.error(
                f"Error ordering image: {e}",
                extra={"plot_id": plot_id},
                exc_info=True
            )
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """
        Check the status of an image order.
        
        Args:
            order_id: Order identifier
            
        Returns:
            Order status information
        """
        try:
            response = await self.client.get(f"/api/v1/orders/{order_id}")
            response.raise_for_status()
            
            status_info = response.json()
            
            self.logger.info(
                f"Order status: {status_info['status']}",
                extra={"order_id": order_id, "status": status_info["status"]}
            )
            
            return status_info
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error getting order status: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error getting order status: {e}", exc_info=True)
            raise
    
    async def wait_for_order_completion(
        self,
        order_id: str,
        max_wait_minutes: int = 60,
        poll_interval_seconds: int = 30,
    ) -> bool:
        """
        Wait for an image order to complete.
        
        Args:
            order_id: Order identifier
            max_wait_minutes: Maximum time to wait
            poll_interval_seconds: How often to check status
            
        Returns:
            True if completed successfully, False if timed out or failed
        """
        try:
            start_time = datetime.utcnow()
            max_wait_time = timedelta(minutes=max_wait_minutes)
            
            self.logger.info(
                f"Waiting for order {order_id} to complete",
                extra={"order_id": order_id, "max_wait_minutes": max_wait_minutes}
            )
            
            while True:
                # Check if we've exceeded max wait time
                if datetime.utcnow() - start_time > max_wait_time:
                    self.logger.warning(
                        f"Order {order_id} timed out after {max_wait_minutes} minutes"
                    )
                    return False
                
                # Get order status
                status_info = await self.get_order_status(order_id)
                status = status_info["status"]
                
                if status == "completed":
                    self.logger.info(f"Order {order_id} completed successfully")
                    return True
                elif status in ["failed", "cancelled"]:
                    self.logger.error(
                        f"Order {order_id} failed with status: {status}"
                    )
                    return False
                
                # Wait before next poll
                await asyncio.sleep(poll_interval_seconds)
                
        except Exception as e:
            self.logger.error(
                f"Error waiting for order completion: {e}",
                extra={"order_id": order_id},
                exc_info=True
            )
            return False
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def download_image(self, order_id: str) -> bytes:
        """
        Download a completed satellite image.
        
        Args:
            order_id: Order identifier
            
        Returns:
            Image data as bytes
        """
        try:
            self.logger.info(
                f"Downloading satellite image for order {order_id}",
                extra={"order_id": order_id}
            )
            
            response = await self.client.get(
                f"/api/v1/orders/{order_id}/download",
                timeout=120.0,  # Longer timeout for downloads
            )
            response.raise_for_status()
            
            image_data = response.content
            
            self.logger.info(
                f"Downloaded satellite image for order {order_id}",
                extra={"order_id": order_id, "size_bytes": len(image_data)}
            )
            
            return image_data
            
        except httpx.HTTPError as e:
            self.logger.error(
                f"HTTP error downloading image: {e}",
                extra={"order_id": order_id},
                exc_info=True
            )
            raise
        except Exception as e:
            self.logger.error(
                f"Error downloading image: {e}",
                extra={"order_id": order_id},
                exc_info=True
            )
            raise
    
    async def order_and_download(
        self,
        plot_id: str,
        latitude: float,
        longitude: float,
        area_hectares: float,
        max_wait_minutes: int = 60,
    ) -> Optional[bytes]:
        """
        Order and download a satellite image (convenience method).
        
        Args:
            plot_id: Plot identifier
            latitude: Plot center latitude
            longitude: Plot center longitude
            area_hectares: Plot area in hectares
            max_wait_minutes: Maximum time to wait for capture
            
        Returns:
            Image data or None if failed
        """
        try:
            # Order image
            order_id = await self.order_image(
                plot_id, latitude, longitude, area_hectares
            )
            
            # Wait for completion
            completed = await self.wait_for_order_completion(
                order_id, max_wait_minutes
            )
            
            if not completed:
                self.logger.error(
                    f"Failed to complete image order for plot {plot_id}"
                )
                return None
            
            # Download image
            image_data = await self.download_image(order_id)
            
            return image_data
            
        except Exception as e:
            self.logger.error(
                f"Error in order_and_download for plot {plot_id}: {e}",
                exc_info=True
            )
            return None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_recent_images(
        self,
        plot_id: str,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Get recent images for a plot.
        
        Args:
            plot_id: Plot identifier
            days: Number of days to look back
            
        Returns:
            List of recent image metadata
        """
        try:
            params = {
                "plot_id": plot_id,
                "days": days,
            }
            
            response = await self.client.get(
                "/api/v1/images",
                params=params,
            )
            response.raise_for_status()
            
            data = response.json()
            images = data.get("images", [])
            
            self.logger.info(
                f"Found {len(images)} recent images for plot {plot_id}",
                extra={"plot_id": plot_id, "days": days, "count": len(images)}
            )
            
            return images
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error getting recent images: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error getting recent images: {e}", exc_info=True)
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_image_metadata(self, image_id: str) -> Dict[str, Any]:
        """
        Get metadata for a specific image.
        
        Args:
            image_id: Image identifier
            
        Returns:
            Image metadata
        """
        try:
            response = await self.client.get(f"/api/v1/images/{image_id}")
            response.raise_for_status()
            
            metadata = response.json()
            
            return metadata
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error getting image metadata: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error getting image metadata: {e}", exc_info=True)
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def cancel_order(self, order_id: str) -> bool:
        """
        Cancel a pending image order.
        
        Args:
            order_id: Order identifier
            
        Returns:
            True if cancelled successfully
        """
        try:
            response = await self.client.delete(f"/api/v1/orders/{order_id}")
            response.raise_for_status()
            
            self.logger.info(f"Cancelled order {order_id}")
            
            return True
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error cancelling order: {e}", exc_info=True)
            return False
        except Exception as e:
            self.logger.error(f"Error cancelling order: {e}", exc_info=True)
            return False
