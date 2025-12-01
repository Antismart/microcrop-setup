"""
Planet Labs API routes for MicroCrop backend.

Provides endpoints for:
- Creating Planet Biomass subscriptions
- Fetching biomass data for CRE workflow
- Managing subscription lifecycle
- GPS coordinate → plotId mapping (privacy-preserving)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
import logging

from src.integrations.planet_client import get_planet_client, BiomassTimeseries
from src.storage.timescale_client import get_db_client
from api.auth import get_current_user, require_internal_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/planet", tags=["planet"])


class CreateSubscriptionRequest(BaseModel):
    """Request to create Planet subscription."""
    policy_id: str = Field(..., description="Policy identifier")
    plot_id: int = Field(..., description="Plot identifier")
    latitude: float = Field(..., ge=-90, le=90, description="Field latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Field longitude")
    field_geometry: Dict = Field(..., description="GeoJSON polygon of field")
    start_date: str = Field(..., description="Policy start date (ISO format)")
    end_date: str = Field(..., description="Policy end date (ISO format)")


class CreateSubscriptionResponse(BaseModel):
    """Response after creating subscription."""
    subscription_id: str
    policy_id: str
    plot_id: int
    status: str
    created_at: str


class BiomassDataResponse(BaseModel):
    """Biomass data response for CRE workflow."""
    plot_id: int
    subscription_id: str
    current_biomass: float
    baseline_biomass: float
    min_biomass: float
    biomass_trend: float
    deviation_percent: float
    last_updated: str
    data_quality: str


class SubscriptionStatusResponse(BaseModel):
    """Subscription status response."""
    subscription_id: str
    policy_id: str
    status: str
    created_at: str
    updated_at: str


@router.post(
    "/subscription",
    response_model=CreateSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Planet Biomass subscription",
    description="Creates a Planet Labs Crop Biomass subscription for a policy when it's activated",
)
async def create_subscription(
    request: CreateSubscriptionRequest,
    user=Depends(get_current_user),
):
    """
    Create a new Planet Biomass subscription.
    
    This endpoint is called when a policy is activated to set up
    continuous biomass monitoring for the insured field.
    
    Args:
        request: Subscription creation parameters
        user: Authenticated user (admin or system)
        
    Returns:
        Subscription details including subscription_id
    """
    try:
        logger.info(
            f"Creating Planet subscription for policy {request.policy_id}",
            extra={
                "policy_id": request.policy_id,
                "plot_id": request.plot_id,
                "user_id": user.get("user_id"),
            }
        )
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date.replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(request.end_date.replace("Z", "+00:00"))
        
        # Create Planet subscription
        planet_client = get_planet_client()
        subscription_id = await planet_client.create_biomass_subscription(
            policy_id=request.policy_id,
            plot_id=request.plot_id,
            field_geometry=request.field_geometry,
            start_date=start_date,
            end_date=end_date,
        )
        
        # Store subscription in database
        db = get_db_client()
        await db.execute(
            """
            INSERT INTO planet_subscriptions 
            (subscription_id, policy_id, plot_id, latitude, longitude, field_geometry, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            subscription_id,
            request.policy_id,
            request.plot_id,
            request.latitude,
            request.longitude,
            request.field_geometry,
            "active",
            datetime.utcnow(),
        )
        
        logger.info(
            f"Successfully created subscription {subscription_id}",
            extra={
                "subscription_id": subscription_id,
                "policy_id": request.policy_id,
            }
        )
        
        return CreateSubscriptionResponse(
            subscription_id=subscription_id,
            policy_id=request.policy_id,
            plot_id=request.plot_id,
            status="active",
            created_at=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        logger.error(
            f"Failed to create Planet subscription: {str(e)}",
            extra={"policy_id": request.policy_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subscription: {str(e)}",
        )


@router.get(
    "/biomass/{plot_id}",
    response_model=BiomassDataResponse,
    summary="Get biomass data for plot",
    description="Fetches latest Crop Biomass data for CRE workflow damage assessment",
)
async def get_biomass_data(
    plot_id: int,
    user=Depends(require_internal_api),
):
    """
    Get biomass data for a specific plot.
    
    This endpoint is called by the CRE workflow during damage assessment
    to fetch the latest biomass metrics from Planet Labs.
    
    Args:
        plot_id: Plot identifier
        user: Internal API authentication (CRE workflow)
        
    Returns:
        Biomass timeseries with current, baseline, and historical data
    """
    try:
        logger.info(
            f"Fetching biomass data for plot {plot_id}",
            extra={"plot_id": plot_id}
        )
        
        # Get subscription_id from database
        db = get_db_client()
        result = await db.fetchrow(
            """
            SELECT subscription_id, policy_id
            FROM planet_subscriptions
            WHERE plot_id = $1 AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
            """,
            plot_id,
        )
        
        if not result:
            logger.warning(f"No active subscription found for plot {plot_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active Planet subscription found for plot {plot_id}",
            )
        
        subscription_id = result["subscription_id"]
        
        # Fetch biomass data from Planet
        planet_client = get_planet_client()
        biomass_data = await planet_client.get_biomass_timeseries(
            subscription_id=subscription_id,
            plot_id=plot_id,
        )
        
        logger.info(
            f"Retrieved biomass data for plot {plot_id}",
            extra={
                "plot_id": plot_id,
                "current_biomass": biomass_data.current_biomass,
                "deviation_percent": biomass_data.deviation_percent,
            }
        )
        
        return BiomassDataResponse(
            plot_id=biomass_data.plot_id,
            subscription_id=biomass_data.subscription_id,
            current_biomass=biomass_data.current_biomass,
            baseline_biomass=biomass_data.baseline_biomass,
            min_biomass=biomass_data.min_biomass,
            biomass_trend=biomass_data.biomass_trend,
            deviation_percent=biomass_data.deviation_percent,
            last_updated=biomass_data.last_updated,
            data_quality=biomass_data.data_quality,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to fetch biomass data: {str(e)}",
            extra={"plot_id": plot_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch biomass data: {str(e)}",
        )


@router.get(
    "/subscription/{subscription_id}",
    response_model=SubscriptionStatusResponse,
    summary="Get subscription status",
    description="Retrieves status and metadata for a Planet subscription",
)
async def get_subscription_status(
    subscription_id: str,
    user=Depends(get_current_user),
):
    """
    Get subscription status and metadata.
    
    Args:
        subscription_id: Planet subscription ID
        user: Authenticated user
        
    Returns:
        Subscription status details
    """
    try:
        # Get from database
        db = get_db_client()
        result = await db.fetchrow(
            """
            SELECT subscription_id, policy_id, status, created_at, updated_at
            FROM planet_subscriptions
            WHERE subscription_id = $1
            """,
            subscription_id,
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription {subscription_id} not found",
            )
        
        return SubscriptionStatusResponse(
            subscription_id=result["subscription_id"],
            policy_id=result["policy_id"],
            status=result["status"],
            created_at=result["created_at"].isoformat(),
            updated_at=result["updated_at"].isoformat() if result["updated_at"] else result["created_at"].isoformat(),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get subscription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription status: {str(e)}",
        )


@router.delete(
    "/subscription/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel Planet subscription",
    description="Cancels a Planet subscription when a policy expires or is cancelled",
)
async def cancel_subscription(
    subscription_id: str,
    user=Depends(get_current_user),
):
    """
    Cancel a Planet subscription.
    
    This endpoint is called when a policy expires or is cancelled
    to stop biomass monitoring and avoid ongoing costs.
    
    Args:
        subscription_id: Planet subscription ID
        user: Authenticated user (admin only)
    """
    try:
        logger.info(
            f"Cancelling Planet subscription {subscription_id}",
            extra={"subscription_id": subscription_id}
        )
        
        # Cancel with Planet
        planet_client = get_planet_client()
        success = await planet_client.cancel_subscription(subscription_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription with Planet",
            )
        
        # Update database
        db = get_db_client()
        await db.execute(
            """
            UPDATE planet_subscriptions
            SET status = 'cancelled', updated_at = $1
            WHERE subscription_id = $2
            """,
            datetime.utcnow(),
            subscription_id,
        )
        
        logger.info(f"Successfully cancelled subscription {subscription_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}",
        )


@router.get(
    "/plot/{plot_id}/geometry",
    summary="Get plot geometry (internal use only)",
    description="Returns field geometry for a plot - internal API only",
)
async def get_plot_geometry(
    plot_id: int,
    user=Depends(require_internal_api),
):
    """
    Get field geometry for a plot.
    
    This is an internal endpoint used for creating subscriptions.
    GPS coordinates are kept private and not exposed publicly.
    
    Args:
        plot_id: Plot identifier
        user: Internal API authentication
        
    Returns:
        Field geometry and coordinates
    """
    try:
        db = get_db_client()
        result = await db.fetchrow(
            """
            SELECT plot_id, latitude, longitude, field_geometry
            FROM planet_subscriptions
            WHERE plot_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            plot_id,
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plot {plot_id} not found",
            )
        
        return {
            "plot_id": result["plot_id"],
            "latitude": float(result["latitude"]),
            "longitude": float(result["longitude"]),
            "field_geometry": result["field_geometry"],
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get plot geometry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get plot geometry: {str(e)}",
        )
