"""
Satellite imagery and vegetation index models for MicroCrop.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class GrowthStage(str, Enum):
    """Crop growth stages."""
    GERMINATION = "germination"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    FRUITING = "fruiting"
    MATURITY = "maturity"
    SENESCENCE = "senescence"
    UNKNOWN = "unknown"


class CloudCoverAssessment(BaseModel):
    """Cloud cover analysis for satellite image."""
    
    cloud_cover_percentage: float = Field(..., ge=0, le=100, description="Cloud cover %")
    shadow_percentage: float = Field(..., ge=0, le=100, description="Shadow cover %")
    usable_area_percentage: float = Field(..., ge=0, le=100, description="Usable area %")
    quality_score: float = Field(..., ge=0, le=1, description="Image quality 0-1")
    is_usable: bool = Field(..., description="Whether image is usable for analysis")
    
    # Detection details
    cloud_mask_confidence: float = Field(..., ge=0, le=1, description="Cloud detection confidence")
    method_used: str = Field(..., description="Cloud detection method")


class VegetationIndices(BaseModel):
    """Vegetation health indices from satellite imagery."""
    
    # NDVI (Normalized Difference Vegetation Index)
    ndvi_mean: float = Field(..., ge=-1, le=1, description="Mean NDVI for plot")
    ndvi_std: float = Field(..., ge=0, description="NDVI standard deviation")
    ndvi_min: float = Field(..., ge=-1, le=1, description="Minimum NDVI")
    ndvi_max: float = Field(..., ge=-1, le=1, description="Maximum NDVI")
    ndvi_median: float = Field(..., ge=-1, le=1, description="Median NDVI")
    
    # EVI (Enhanced Vegetation Index)
    evi_mean: Optional[float] = Field(None, ge=-1, le=1, description="Mean EVI")
    evi_std: Optional[float] = Field(None, ge=0, description="EVI standard deviation")
    
    # LAI (Leaf Area Index)
    lai_mean: Optional[float] = Field(None, ge=0, description="Mean LAI")
    lai_std: Optional[float] = Field(None, ge=0, description="LAI standard deviation")
    
    # SAVI (Soil Adjusted Vegetation Index)
    savi_mean: Optional[float] = Field(None, ge=-1, le=1, description="Mean SAVI")
    
    # NDWI (Normalized Difference Water Index) - if SWIR available
    ndwi_mean: Optional[float] = Field(None, ge=-1, le=1, description="Mean NDWI")
    
    # Vigor classification
    vigor_level: str = Field(..., description="poor, fair, good, excellent")
    
    # Spatial distribution
    healthy_pixels_percentage: float = Field(..., ge=0, le=100, description="% pixels with NDVI>0.6")
    stressed_pixels_percentage: float = Field(..., ge=0, le=100, description="% pixels with NDVI<0.4")
    bare_soil_percentage: float = Field(..., ge=0, le=100, description="% pixels with NDVI<0.2")
    
    @validator("vigor_level")
    def validate_vigor(cls, v):
        allowed = ["poor", "fair", "good", "excellent"]
        if v not in allowed:
            raise ValueError(f"Vigor level must be one of {allowed}")
        return v


class NDVIData(BaseModel):
    """NDVI-specific analysis data."""
    
    current_ndvi: float = Field(..., ge=-1, le=1, description="Current NDVI value")
    baseline_ndvi: float = Field(..., ge=-1, le=1, description="Historical baseline NDVI")
    
    # Change detection
    ndvi_change: float = Field(..., description="Change from baseline")
    ndvi_change_percentage: float = Field(..., description="% change from baseline")
    
    # Trend
    trend_direction: str = Field(..., description="increasing, stable, decreasing")
    trend_strength: float = Field(..., ge=0, le=1, description="Trend strength 0-1")
    
    # Stress detection
    is_stressed: bool = Field(..., description="Whether vegetation is stressed")
    stress_severity: float = Field(..., ge=0, le=1, description="Stress severity 0-1")
    stress_duration_days: int = Field(..., ge=0, description="Days below stress threshold")
    
    # Comparison with neighbors (if available)
    neighbor_ndvi_mean: Optional[float] = Field(None, description="Average NDVI of neighboring plots")
    relative_performance: Optional[float] = Field(None, description="Performance vs neighbors")
    
    @validator("trend_direction")
    def validate_trend(cls, v):
        allowed = ["increasing", "stable", "decreasing"]
        if v not in allowed:
            raise ValueError(f"Trend must be one of {allowed}")
        return v


class SatelliteImage(BaseModel):
    """Satellite image metadata and processed results."""
    
    # Image identification
    image_id: str = Field(..., description="Unique image identifier")
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    
    # Capture details
    capture_date: datetime = Field(..., description="Image capture timestamp")
    satellite_source: str = Field(..., description="Satellite/provider: Spexi, Sentinel, etc")
    resolution_meters: float = Field(..., gt=0, description="Spatial resolution in meters")
    
    # Image properties
    bands_available: list[str] = Field(..., description="Available spectral bands")
    image_width: int = Field(..., gt=0, description="Image width in pixels")
    image_height: int = Field(..., gt=0, description="Image height in pixels")
    
    # Geographic
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    plot_area_hectares: float = Field(..., gt=0, description="Plot area in hectares")
    
    # Cloud assessment
    cloud_assessment: CloudCoverAssessment = Field(..., description="Cloud cover analysis")
    
    # Vegetation indices
    vegetation_indices: Optional[VegetationIndices] = Field(None, description="Calculated vegetation indices")
    ndvi_analysis: Optional[NDVIData] = Field(None, description="Detailed NDVI analysis")
    
    # Growth stage
    estimated_growth_stage: GrowthStage = Field(..., description="Estimated crop growth stage")
    growth_stage_confidence: float = Field(..., ge=0, le=1, description="Growth stage confidence")
    
    # Storage
    raw_image_url: str = Field(..., description="MinIO URL for raw image")
    processed_image_url: Optional[str] = Field(None, description="MinIO URL for processed image")
    ndvi_raster_url: Optional[str] = Field(None, description="MinIO URL for NDVI raster")
    
    # Processing metadata
    processing_timestamp: datetime = Field(default_factory=datetime.utcnow)
    processor_version: str = Field(..., description="Processor version")
    processing_time_seconds: float = Field(..., ge=0, description="Processing duration")
    
    # Quality
    overall_quality_score: float = Field(..., ge=0, le=1, description="Overall image quality 0-1")
    is_valid_for_assessment: bool = Field(..., description="Whether usable for damage assessment")
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "image_id": "img_20240115_123456",
                "plot_id": "plot_123",
                "policy_id": "policy_456",
                "capture_date": "2024-01-15T10:30:00Z",
                "satellite_source": "Spexi",
                "resolution_meters": 0.5,
                "bands_available": ["red", "green", "blue", "nir"],
                "image_width": 2048,
                "image_height": 2048,
                "latitude": -1.2921,
                "longitude": 36.8219,
                "plot_area_hectares": 2.5,
                "cloud_assessment": {
                    "cloud_cover_percentage": 5.0,
                    "shadow_percentage": 2.0,
                    "usable_area_percentage": 93.0,
                    "quality_score": 0.95,
                    "is_usable": True,
                    "cloud_mask_confidence": 0.92,
                    "method_used": "spectral_threshold"
                },
                "estimated_growth_stage": "vegetative",
                "growth_stage_confidence": 0.85,
                "overall_quality_score": 0.93,
                "is_valid_for_assessment": True
            }
        }
