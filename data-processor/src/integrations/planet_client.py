"""
Planet Labs API client for MicroCrop parametric insurance.

Manages Planet Labs Crop Biomass subscriptions for automated damage assessment.

Key Features:
- Create subscriptions when policies activate
- Fetch biomass timeseries data for CRE workflow
- Cancel subscriptions when policies expire
- Handle subscription lifecycle and monitoring

Planet Product: BIOMASS-PROXY_V4.0_10
Documentation: https://developers.planet.com/docs/subscriptions/
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import httpx
from pydantic import BaseModel, Field

from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class BiomassDataPoint(BaseModel):
    """Single biomass measurement."""
    date: str
    biomass_proxy: float  # 0-1 scale
    data_quality: str  # 'high', 'medium', 'low'
    cloud_cover: Optional[float] = None


class BiomassTimeseries(BaseModel):
    """Biomass timeseries response."""
    plot_id: int
    subscription_id: str
    current_biomass: float
    baseline_biomass: float
    min_biomass: float
    max_biomass: float
    biomass_trend: float  # -1 to +1
    deviation_percent: float
    last_updated: str
    data_quality: str
    timeseries: List[BiomassDataPoint]


class SubscriptionRequest(BaseModel):
    """Planet subscription creation request."""
    name: str = Field(..., description="Subscription name")
    source_type: str = Field(default="biomass", description="Data source type")
    geometry: Dict = Field(..., description="GeoJSON geometry")
    start_time: str = Field(..., description="Start date ISO format")
    end_time: str = Field(..., description="End date ISO format")
    publishing_stages: List[str] = Field(
        default=["finalized"], 
        description="Publishing stages to include"
    )
    delivery: Dict = Field(..., description="Delivery configuration")


class PlanetClient:
    """
    Client for Planet Labs Subscriptions API.
    
    Manages Crop Biomass subscriptions for parametric insurance.
    """
    
    def __init__(self):
        """Initialize Planet Labs client."""
        self.api_key = settings.PLANET_API_KEY
        self.base_url = "https://api.planet.com/subscriptions/v1"
        self.data_url = "https://api.planet.com/data/v1"
        
        # HTTP client with authentication
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=60.0,
        )
        
        # Biomass product configuration
        self.biomass_product = "BIOMASS-PROXY_V4.0_10"
        
        logger.info("PlanetClient initialized")
    
    async def create_biomass_subscription(
        self,
        policy_id: str,
        plot_id: int,
        field_geometry: Dict,
        start_date: datetime,
        end_date: datetime,
    ) -> str:
        """
        Create a Planet Biomass subscription for a policy.
        
        Args:
            policy_id: Policy identifier
            plot_id: Plot identifier
            field_geometry: GeoJSON polygon of field boundaries
            start_date: Policy start date
            end_date: Policy end date
            
        Returns:
            subscription_id: Planet subscription ID
        """
        try:
            logger.info(
                f"Creating Planet Biomass subscription for policy {policy_id}",
                extra={
                    "policy_id": policy_id,
                    "plot_id": plot_id,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                }
            )
            
            # Prepare subscription request
            subscription = {
                "name": f"microcrop-policy-{policy_id}-plot-{plot_id}",
                "source": {
                    "type": "biomass",
                    "parameters": {
                        "geometry": field_geometry,
                        "start_time": start_date.isoformat(),
                        "end_time": end_date.isoformat(),
                    },
                    "asset_types": [self.biomass_product],
                },
                "delivery": {
                    "type": "google_cloud_storage",
                    "parameters": {
                        "bucket": settings.GCS_BUCKET_NAME,
                        "credentials": settings.GCS_CREDENTIALS,
                    },
                },
                "clip_to_source": True,
            }
            
            # Create subscription
            response = await self.client.post(
                f"{self.base_url}/subscriptions",
                json=subscription,
            )
            response.raise_for_status()
            
            result = response.json()
            subscription_id = result["id"]
            
            logger.info(
                f"Created Planet subscription {subscription_id}",
                extra={
                    "policy_id": policy_id,
                    "subscription_id": subscription_id,
                }
            )
            
            return subscription_id
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to create Planet subscription: {e.response.status_code}",
                extra={"response": e.response.text},
            )
            raise
        except Exception as e:
            logger.error(f"Error creating Planet subscription: {str(e)}")
            raise
    
    async def get_biomass_timeseries(
        self,
        subscription_id: str,
        plot_id: int,
    ) -> BiomassTimeseries:
        """
        Fetch biomass timeseries data from a subscription.
        
        Args:
            subscription_id: Planet subscription ID
            plot_id: Plot identifier for response
            
        Returns:
            BiomassTimeseries with current, baseline, and historical data
        """
        try:
            logger.info(
                f"Fetching biomass data for subscription {subscription_id}",
                extra={"subscription_id": subscription_id, "plot_id": plot_id},
            )
            
            # Fetch subscription results
            response = await self.client.get(
                f"{self.base_url}/subscriptions/{subscription_id}/results"
            )
            response.raise_for_status()
            
            results = response.json()
            
            # Parse biomass data from CSV results
            timeseries_data = []
            for result in results.get("results", []):
                # Download CSV file
                csv_url = result["location"]
                csv_response = await self.client.get(csv_url)
                csv_response.raise_for_status()
                
                # Parse CSV (simplified - you'll want to use pandas)
                csv_lines = csv_response.text.strip().split("\n")
                headers = csv_lines[0].split(",")
                
                for line in csv_lines[1:]:
                    values = line.split(",")
                    data_dict = dict(zip(headers, values))
                    
                    # Extract biomass value
                    biomass_value = float(data_dict.get("biomass_proxy", 0))
                    date_str = data_dict.get("date", "")
                    cloud_cover = float(data_dict.get("cloud_cover", 0))
                    
                    # Assess data quality
                    if cloud_cover < 0.1:
                        quality = "high"
                    elif cloud_cover < 0.3:
                        quality = "medium"
                    else:
                        quality = "low"
                    
                    timeseries_data.append(
                        BiomassDataPoint(
                            date=date_str,
                            biomass_proxy=biomass_value,
                            data_quality=quality,
                            cloud_cover=cloud_cover,
                        )
                    )
            
            # Sort by date
            timeseries_data.sort(key=lambda x: x.date)
            
            # Calculate statistics
            if not timeseries_data:
                raise ValueError(f"No biomass data found for subscription {subscription_id}")
            
            biomass_values = [d.biomass_proxy for d in timeseries_data]
            current_biomass = biomass_values[-1]
            min_biomass = min(biomass_values)
            max_biomass = max(biomass_values)
            
            # Calculate baseline (first 30 days or first 5 observations)
            baseline_data = biomass_values[:min(5, len(biomass_values))]
            baseline_biomass = sum(baseline_data) / len(baseline_data)
            
            # Calculate trend (simple linear regression)
            if len(biomass_values) > 1:
                x = list(range(len(biomass_values)))
                y = biomass_values
                n = len(x)
                sum_x = sum(x)
                sum_y = sum(y)
                sum_xy = sum(xi * yi for xi, yi in zip(x, y))
                sum_x2 = sum(xi ** 2 for xi in x)
                
                slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
                biomass_trend = max(-1.0, min(1.0, slope * 10))  # Normalize to -1 to +1
            else:
                biomass_trend = 0.0
            
            # Calculate deviation from baseline
            deviation_percent = ((baseline_biomass - current_biomass) / baseline_biomass) * 100
            
            # Overall data quality
            quality_scores = {"high": 3, "medium": 2, "low": 1}
            avg_quality_score = sum(quality_scores[d.data_quality] for d in timeseries_data) / len(timeseries_data)
            
            if avg_quality_score >= 2.5:
                overall_quality = "high"
            elif avg_quality_score >= 1.5:
                overall_quality = "medium"
            else:
                overall_quality = "low"
            
            result = BiomassTimeseries(
                plot_id=plot_id,
                subscription_id=subscription_id,
                current_biomass=current_biomass,
                baseline_biomass=baseline_biomass,
                min_biomass=min_biomass,
                max_biomass=max_biomass,
                biomass_trend=biomass_trend,
                deviation_percent=deviation_percent,
                last_updated=timeseries_data[-1].date,
                data_quality=overall_quality,
                timeseries=timeseries_data,
            )
            
            logger.info(
                f"Retrieved biomass data for plot {plot_id}",
                extra={
                    "plot_id": plot_id,
                    "current_biomass": current_biomass,
                    "baseline_biomass": baseline_biomass,
                    "deviation_percent": deviation_percent,
                    "data_quality": overall_quality,
                },
            )
            
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to fetch biomass data: {e.response.status_code}",
                extra={"response": e.response.text},
            )
            raise
        except Exception as e:
            logger.error(f"Error fetching biomass data: {str(e)}")
            raise
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Cancel a Planet subscription.
        
        Args:
            subscription_id: Planet subscription ID
            
        Returns:
            True if successfully cancelled
        """
        try:
            logger.info(f"Cancelling Planet subscription {subscription_id}")
            
            # Update subscription status to cancelled
            response = await self.client.patch(
                f"{self.base_url}/subscriptions/{subscription_id}",
                json={"status": "cancelled"},
            )
            response.raise_for_status()
            
            logger.info(f"Successfully cancelled subscription {subscription_id}")
            return True
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to cancel subscription: {e.response.status_code}",
                extra={"response": e.response.text},
            )
            return False
        except Exception as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            return False
    
    async def get_subscription_status(self, subscription_id: str) -> Dict:
        """
        Get subscription status and metadata.
        
        Args:
            subscription_id: Planet subscription ID
            
        Returns:
            Subscription details
        """
        try:
            response = await self.client.get(
                f"{self.base_url}/subscriptions/{subscription_id}"
            )
            response.raise_for_status()
            
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Failed to get subscription status: {e.response.status_code}",
                extra={"response": e.response.text},
            )
            raise
        except Exception as e:
            logger.error(f"Error getting subscription status: {str(e)}")
            raise
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
        logger.info("PlanetClient closed")


# Global client instance
_planet_client: Optional[PlanetClient] = None


def get_planet_client() -> PlanetClient:
    """Get or create global Planet client instance."""
    global _planet_client
    if _planet_client is None:
        _planet_client = PlanetClient()
    return _planet_client


async def close_planet_client():
    """Close global Planet client."""
    global _planet_client
    if _planet_client is not None:
        await _planet_client.close()
        _planet_client = None
