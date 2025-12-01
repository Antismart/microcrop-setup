"""
API routes for MicroCrop data processor.

Provides REST endpoints for:
- Weather data submission and retrieval
- Satellite image ordering and processing
- Damage assessment triggering and querying
- Oracle data submission
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Body, status
from pydantic import BaseModel, Field, validator

from src.config import get_settings
from src.workers.weather_tasks import (
    fetch_weather_updates,
    process_weather_indices,
)
from src.workers.damage_tasks import calculate_damage_assessment
from src.storage.timescale_client import TimescaleClient
from src.storage.redis_cache import RedisCache

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize storage clients
timescale_client = TimescaleClient()
redis_cache = RedisCache()

# Create router
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class WeatherSubmitRequest(BaseModel):
    """Request model for weather data submission."""
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    latitude: float = Field(..., ge=-90, le=90, description="Plot latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Plot longitude")
    
    @validator("plot_id", "policy_id")
    def validate_ids(cls, v):
        if not v or len(v) < 3:
            raise ValueError("ID must be at least 3 characters")
        return v


class WeatherIndicesRequest(BaseModel):
    """Request model for weather indices calculation."""
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    start_date: str = Field(..., description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")
    
    @validator("start_date", "end_date")
    def validate_dates(cls, v):
        if v:
            try:
                datetime.fromisoformat(v)
            except ValueError:
                raise ValueError("Date must be in ISO format")
        return v


class SatelliteOrderRequest(BaseModel):
    """Request model for satellite image ordering."""
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    latitude: float = Field(..., ge=-90, le=90, description="Plot center latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Plot center longitude")
    area_hectares: float = Field(..., gt=0, description="Plot area in hectares")
    priority: str = Field("normal", description="Order priority (low, normal, high)")
    
    @validator("priority")
    def validate_priority(cls, v):
        if v not in ["low", "normal", "high"]:
            raise ValueError("Priority must be low, normal, or high")
        return v


class DamageAssessmentRequest(BaseModel):
    """Request model for damage assessment."""
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    farmer_address: str = Field(..., description="Farmer's wallet address")
    assessment_period_days: int = Field(7, ge=1, le=30, description="Assessment period in days")
    sum_insured_usdc: Optional[float] = Field(None, gt=0, description="Sum insured in USDC")
    max_payout_usdc: Optional[float] = Field(None, gt=0, description="Maximum payout in USDC")
    
    @validator("farmer_address")
    def validate_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid Ethereum address")
        return v


class TaskResponse(BaseModel):
    """Response model for async task submission."""
    task_id: str = Field(..., description="Celery task ID")
    status: str = Field(..., description="Task status")
    message: str = Field(..., description="Status message")


class WeatherIndicesResponse(BaseModel):
    """Response model for weather indices."""
    plot_id: str
    composite_stress_score: float
    dominant_stress: str
    drought_score: Optional[float]
    flood_score: Optional[float]
    heat_score: Optional[float]
    confidence_score: float


class SatelliteImageResponse(BaseModel):
    """Response model for satellite image data."""
    image_id: str
    plot_id: str
    capture_date: str
    ndvi_mean: float
    cloud_cover: float
    quality_score: float


class DamageAssessmentResponse(BaseModel):
    """Response model for damage assessment."""
    assessment_id: str
    plot_id: str
    composite_damage_score: float
    damage_type: str
    payout_triggered: bool
    payout_amount_usdc: float
    ipfs_cid: Optional[str]
    requires_manual_review: bool


# ============================================================================
# Weather Endpoints
# ============================================================================

@router.post("/weather/submit", response_model=TaskResponse, tags=["Weather"])
async def submit_weather_data(request: WeatherSubmitRequest) -> TaskResponse:
    """
    Submit weather data fetch request for a plot.
    
    Triggers asynchronous weather data fetching from WeatherXM API.
    """
    try:
        # Check rate limit
        rate_limit_key = f"api_rate_limit:weather:{request.plot_id}"
        if not await redis_cache.check_rate_limit(rate_limit_key, limit=10, window=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Maximum 10 requests per minute per plot.",
            )
        
        # Trigger task
        task = fetch_weather_updates.delay(
            plot_id=request.plot_id,
            policy_id=request.policy_id,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        
        logger.info(f"Weather fetch task submitted: {task.id} for plot {request.plot_id}")
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message=f"Weather data fetch task submitted for plot {request.plot_id}",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit weather fetch task: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit weather fetch task: {str(e)}",
        )


@router.post("/weather/indices", response_model=TaskResponse, tags=["Weather"])
async def calculate_weather_indices(request: WeatherIndicesRequest) -> TaskResponse:
    """
    Calculate weather indices for a plot.
    
    Triggers calculation of drought, flood, and heat stress indices.
    """
    try:
        # Trigger task
        task = process_weather_indices.delay(
            plot_id=request.plot_id,
            policy_id=request.policy_id,
            start_date=request.start_date,
            end_date=request.end_date,
        )
        
        logger.info(f"Weather indices task submitted: {task.id} for plot {request.plot_id}")
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message=f"Weather indices calculation submitted for plot {request.plot_id}",
        )
        
    except Exception as e:
        logger.error(f"Failed to submit weather indices task: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit weather indices task: {str(e)}",
        )


@router.get("/weather/indices/{plot_id}", response_model=WeatherIndicesResponse, tags=["Weather"])
async def get_weather_indices(
    plot_id: str,
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
) -> WeatherIndicesResponse:
    """
    Get weather indices for a plot.
    
    Returns the most recent weather indices if dates not specified.
    """
    try:
        # Check cache first
        cache_key = f"weather_indices:{plot_id}:{start_date}:{end_date}"
        cached = await redis_cache.get(cache_key)
        
        if cached:
            return WeatherIndicesResponse(**cached)
        
        # Query from database
        if start_date and end_date:
            query = """
                SELECT data
                FROM weather_indices
                WHERE plot_id = $1
                AND timestamp BETWEEN $2 AND $3
                ORDER BY timestamp DESC
                LIMIT 1
            """
            result = await timescale_client.execute_query(
                query,
                plot_id,
                datetime.fromisoformat(start_date),
                datetime.fromisoformat(end_date),
            )
        else:
            query = """
                SELECT data
                FROM weather_indices
                WHERE plot_id = $1
                ORDER BY timestamp DESC
                LIMIT 1
            """
            result = await timescale_client.execute_query(query, plot_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No weather indices found for plot {plot_id}",
            )
        
        indices_data = result[0]["data"]
        
        response = WeatherIndicesResponse(
            plot_id=plot_id,
            composite_stress_score=indices_data.get("composite_stress_score", 0),
            dominant_stress=indices_data.get("dominant_stress", "none"),
            drought_score=indices_data.get("drought_index", {}).get("drought_score"),
            flood_score=indices_data.get("flood_index", {}).get("flood_score"),
            heat_score=indices_data.get("heat_stress_index", {}).get("stress_score"),
            confidence_score=indices_data.get("confidence_score", 0),
        )
        
        # Cache response
        await redis_cache.set(cache_key, response.model_dump(), ttl=3600)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get weather indices: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get weather indices: {str(e)}",
        )


# ============================================================================
# Satellite Endpoints
# ============================================================================
# NOTE: Satellite ordering deprecated - moved to Planet Labs API integration
# See src/api/routes/planet.py for new Planet Labs endpoints


@router.get("/satellite/images/{plot_id}", response_model=List[SatelliteImageResponse], tags=["Satellite"])
async def get_satellite_images(
    plot_id: str,
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of images"),
) -> List[SatelliteImageResponse]:
    """
    Get satellite images for a plot.
    
    Returns recent satellite images with NDVI data.
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query from database
        images = await timescale_client.get_satellite_images(
            plot_id=plot_id,
            start_date=start_date,
            end_date=end_date,
        )
        
        if not images:
            return []
        
        # Convert to response format
        responses = []
        for img in images[:limit]:
            responses.append(
                SatelliteImageResponse(
                    image_id=img.image_id,
                    plot_id=img.plot_id,
                    capture_date=img.capture_date.isoformat(),
                    ndvi_mean=img.vegetation_indices.ndvi_mean if img.vegetation_indices else 0,
                    cloud_cover=img.cloud_cover.cloud_cover_percentage if img.cloud_cover else 0,
                    quality_score=img.quality_score,
                )
            )
        
        return responses
        
    except Exception as e:
        logger.error(f"Failed to get satellite images: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get satellite images: {str(e)}",
        )


# ============================================================================
# Damage Assessment Endpoints
# ============================================================================

@router.post("/damage/assess", response_model=TaskResponse, tags=["Damage"])
async def assess_damage(request: DamageAssessmentRequest) -> TaskResponse:
    """
    Trigger damage assessment for a plot.
    
    Calculates damage based on weather indices and satellite imagery.
    """
    try:
        # Check rate limit
        rate_limit_key = f"api_rate_limit:damage:{request.plot_id}"
        if not await redis_cache.check_rate_limit(rate_limit_key, limit=5, window=3600):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Maximum 5 assessments per hour per plot.",
            )
        
        # Trigger task
        task = calculate_damage_assessment.delay(
            plot_id=request.plot_id,
            policy_id=request.policy_id,
            farmer_address=request.farmer_address,
            assessment_period_days=request.assessment_period_days,
            sum_insured_usdc=request.sum_insured_usdc,
            max_payout_usdc=request.max_payout_usdc,
        )
        
        logger.info(f"Damage assessment task submitted: {task.id} for plot {request.plot_id}")
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message=f"Damage assessment submitted for plot {request.plot_id}",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit damage assessment task: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit damage assessment task: {str(e)}",
        )


@router.get("/damage/assessments/{plot_id}", response_model=List[DamageAssessmentResponse], tags=["Damage"])
async def get_damage_assessments(
    plot_id: str,
    status_filter: Optional[str] = Query(None, description="Filter by payout status"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of assessments"),
) -> List[DamageAssessmentResponse]:
    """
    Get damage assessments for a plot.
    
    Returns recent damage assessments with payout information.
    """
    try:
        # Query from database
        assessments = await timescale_client.get_damage_assessments(
            plot_id=plot_id,
            status=status_filter,
            limit=limit,
        )
        
        if not assessments:
            return []
        
        # Convert to response format
        responses = []
        for assessment in assessments:
            responses.append(
                DamageAssessmentResponse(
                    assessment_id=assessment.assessment_id,
                    plot_id=assessment.plot_id,
                    composite_damage_score=assessment.damage_scores.composite_damage_score,
                    damage_type=assessment.damage_type.value,
                    payout_triggered=assessment.payout_trigger.is_triggered,
                    payout_amount_usdc=assessment.payout_trigger.net_payout_usdc,
                    ipfs_cid=assessment.ipfs_cid,
                    requires_manual_review=assessment.requires_manual_review,
                )
            )
        
        return responses
        
    except Exception as e:
        logger.error(f"Failed to get damage assessments: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get damage assessments: {str(e)}",
        )


@router.get("/damage/assessment/{assessment_id}", response_model=DamageAssessmentResponse, tags=["Damage"])
async def get_damage_assessment(assessment_id: str) -> DamageAssessmentResponse:
    """
    Get specific damage assessment by ID.
    
    Returns complete damage assessment details.
    """
    try:
        # Check cache first
        cache_key = f"damage_assessment:{assessment_id}"
        cached = await redis_cache.get(cache_key)
        
        if cached:
            return DamageAssessmentResponse(**cached)
        
        # Query from database
        query = """
            SELECT *
            FROM damage_assessments
            WHERE assessment_id = $1
        """
        result = await timescale_client.execute_query(query, assessment_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment {assessment_id} not found",
            )
        
        assessment_data = result[0]
        
        response = DamageAssessmentResponse(
            assessment_id=assessment_data["assessment_id"],
            plot_id=assessment_data["plot_id"],
            composite_damage_score=assessment_data["data"]["damage_scores"]["composite_damage_score"],
            damage_type=assessment_data["data"]["damage_type"],
            payout_triggered=assessment_data["data"]["payout_trigger"]["is_triggered"],
            payout_amount_usdc=assessment_data["data"]["payout_trigger"]["net_payout_usdc"],
            ipfs_cid=assessment_data.get("ipfs_cid"),
            requires_manual_review=assessment_data["data"].get("requires_manual_review", False),
        )
        
        # Cache response
        await redis_cache.set(cache_key, response.model_dump(), ttl=86400)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get damage assessment: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get damage assessment: {str(e)}",
        )


# ============================================================================
# Task Status Endpoints
# ============================================================================

@router.get("/tasks/{task_id}", tags=["Tasks"])
async def get_task_status(task_id: str):
    """
    Get status of an async task.
    
    Returns task status and result if completed.
    """
    try:
        from celery.result import AsyncResult
        from workers.celery_app import celery_app
        
        task_result = AsyncResult(task_id, app=celery_app)
        
        if task_result.ready():
            if task_result.successful():
                return {
                    "task_id": task_id,
                    "status": "completed",
                    "result": task_result.result,
                }
            else:
                return {
                    "task_id": task_id,
                    "status": "failed",
                    "error": str(task_result.info),
                }
        else:
            return {
                "task_id": task_id,
                "status": "pending",
                "state": task_result.state,
            }
            
    except Exception as e:
        logger.error(f"Failed to get task status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task status: {str(e)}",
        )
