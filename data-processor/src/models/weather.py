"""
Weather data models for MicroCrop.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator


class WeatherData(BaseModel):
    """Raw weather data from WeatherXM station."""
    
    station_id: str = Field(..., description="WeatherXM station identifier")
    timestamp: datetime = Field(..., description="Measurement timestamp")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    
    # Temperature (°C)
    temperature: float = Field(..., description="Air temperature in Celsius")
    feels_like: Optional[float] = Field(None, description="Feels like temperature")
    min_temperature: Optional[float] = Field(None, description="Minimum temperature")
    max_temperature: Optional[float] = Field(None, description="Maximum temperature")
    
    # Precipitation (mm)
    rainfall: float = Field(0.0, ge=0, description="Rainfall in mm")
    rainfall_rate: Optional[float] = Field(None, ge=0, description="Rainfall rate mm/h")
    
    # Humidity & Pressure
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity %")
    pressure: float = Field(..., description="Atmospheric pressure hPa")
    
    # Wind
    wind_speed: float = Field(..., ge=0, description="Wind speed m/s")
    wind_direction: Optional[float] = Field(None, ge=0, le=360, description="Wind direction degrees")
    wind_gust: Optional[float] = Field(None, ge=0, description="Wind gust m/s")
    
    # Solar & UV
    solar_radiation: Optional[float] = Field(None, ge=0, description="Solar radiation W/m²")
    uv_index: Optional[float] = Field(None, ge=0, description="UV index")
    
    # Soil (if available)
    soil_moisture: Optional[float] = Field(None, ge=0, le=100, description="Soil moisture %")
    soil_temperature: Optional[float] = Field(None, description="Soil temperature °C")
    
    # Data quality
    data_quality: float = Field(1.0, ge=0, le=1, description="Data quality score 0-1")
    
    class Config:
        json_schema_extra = {
            "example": {
                "station_id": "wx_station_123",
                "timestamp": "2024-01-15T12:00:00Z",
                "latitude": -1.2921,
                "longitude": 36.8219,
                "temperature": 28.5,
                "rainfall": 12.3,
                "humidity": 65.0,
                "pressure": 1013.25,
                "wind_speed": 3.5,
                "solar_radiation": 850.0,
                "data_quality": 0.98
            }
        }


class DroughtIndex(BaseModel):
    """Drought stress indicators."""
    
    # Rainfall metrics
    rainfall_deficit: float = Field(..., description="Cumulative rainfall deficit mm")
    consecutive_dry_days: int = Field(..., ge=0, description="Consecutive days with <1mm rain")
    days_since_significant_rain: int = Field(..., ge=0, description="Days since >10mm rain")
    
    # Soil moisture
    soil_moisture_level: Optional[float] = Field(None, ge=0, le=100, description="Current soil moisture %")
    soil_moisture_deficit: Optional[float] = Field(None, description="Deficit from field capacity")
    
    # Evapotranspiration
    et_demand: Optional[float] = Field(None, ge=0, description="Evapotranspiration demand mm/day")
    water_stress_ratio: Optional[float] = Field(None, ge=0, description="ET demand / water supply")
    
    # Composite score
    drought_score: float = Field(..., ge=0, le=1, description="0=no drought, 1=severe drought")
    severity_level: str = Field(..., description="none, mild, moderate, severe, extreme")
    
    # Period
    assessment_days: int = Field(..., ge=1, description="Number of days assessed")
    
    @validator("severity_level")
    def validate_severity(cls, v):
        allowed = ["none", "mild", "moderate", "severe", "extreme"]
        if v not in allowed:
            raise ValueError(f"Severity must be one of {allowed}")
        return v


class FloodIndex(BaseModel):
    """Flood risk indicators."""
    
    # Rainfall metrics
    max_daily_rainfall: float = Field(..., ge=0, description="Maximum daily rainfall in period mm")
    cumulative_3day_rainfall: float = Field(..., ge=0, description="3-day cumulative rainfall mm")
    cumulative_7day_rainfall: float = Field(..., ge=0, description="7-day cumulative rainfall mm")
    
    # Intensity
    max_rainfall_intensity: float = Field(..., ge=0, description="Maximum rainfall rate mm/h")
    heavy_rain_hours: int = Field(..., ge=0, description="Hours with >5mm/h rainfall")
    
    # Duration
    consecutive_wet_days: int = Field(..., ge=0, description="Consecutive days with >10mm rain")
    sustained_rainfall_hours: float = Field(..., ge=0, description="Continuous rainfall hours")
    
    # Soil saturation
    soil_saturation_level: Optional[float] = Field(None, ge=0, le=100, description="Soil saturation %")
    drainage_capacity: Optional[float] = Field(None, description="Soil drainage rate mm/h")
    
    # Composite score
    flood_score: float = Field(..., ge=0, le=1, description="0=no risk, 1=severe flood")
    risk_level: str = Field(..., description="none, low, moderate, high, critical")
    
    # Period
    assessment_days: int = Field(..., ge=1, description="Number of days assessed")
    
    @validator("risk_level")
    def validate_risk(cls, v):
        allowed = ["none", "low", "moderate", "high", "critical"]
        if v not in allowed:
            raise ValueError(f"Risk level must be one of {allowed}")
        return v


class HeatStressIndex(BaseModel):
    """Heat stress indicators."""
    
    # Temperature metrics
    max_temperature: float = Field(..., description="Maximum temperature in period °C")
    avg_max_temperature: float = Field(..., description="Average max temperature °C")
    consecutive_hot_days: int = Field(..., ge=0, description="Days with temp >35°C")
    extreme_heat_days: int = Field(..., ge=0, description="Days with temp >40°C")
    
    # Growing degree days
    heat_degree_days: float = Field(..., ge=0, description="Accumulated heat units above threshold")
    optimal_temp_days: int = Field(..., ge=0, description="Days in optimal temp range")
    
    # Combined stress
    heat_humidity_index: Optional[float] = Field(None, description="Combined heat-humidity stress")
    
    # Composite score
    heat_stress_score: float = Field(..., ge=0, le=1, description="0=no stress, 1=severe stress")
    stress_level: str = Field(..., description="none, mild, moderate, severe, extreme")
    
    # Period
    assessment_days: int = Field(..., ge=1, description="Number of days assessed")
    
    @validator("stress_level")
    def validate_stress(cls, v):
        allowed = ["none", "mild", "moderate", "severe", "extreme"]
        if v not in allowed:
            raise ValueError(f"Stress level must be one of {allowed}")
        return v


class WeatherIndices(BaseModel):
    """Complete weather stress assessment for a plot."""
    
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    assessment_start: datetime = Field(..., description="Assessment period start")
    assessment_end: datetime = Field(..., description="Assessment period end")
    
    # Individual indices
    drought: DroughtIndex = Field(..., description="Drought assessment")
    flood: FloodIndex = Field(..., description="Flood assessment")
    heat_stress: HeatStressIndex = Field(..., description="Heat stress assessment")
    
    # Composite metrics
    composite_stress_score: float = Field(..., ge=0, le=1, description="Overall weather stress")
    dominant_stress: str = Field(..., description="Primary stress factor: drought, flood, heat, or combined")
    
    # Data sources
    weather_stations: List[str] = Field(..., description="WeatherXM stations used")
    data_points: int = Field(..., ge=0, description="Number of weather measurements")
    data_quality: float = Field(..., ge=0, le=1, description="Overall data quality 0-1")
    
    # Confidence
    confidence_score: float = Field(..., ge=0, le=1, description="Assessment confidence 0-1")
    
    # Anomaly detection
    is_anomaly: bool = Field(False, description="Whether pattern is anomalous")
    anomaly_score: Optional[float] = Field(None, ge=0, le=1, description="Anomaly severity")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processor_version: str = Field(..., description="Processor version used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "plot_id": "plot_123",
                "policy_id": "policy_456",
                "assessment_start": "2024-01-01T00:00:00Z",
                "assessment_end": "2024-01-31T23:59:59Z",
                "drought": {
                    "rainfall_deficit": 45.0,
                    "consecutive_dry_days": 14,
                    "days_since_significant_rain": 21,
                    "drought_score": 0.65,
                    "severity_level": "moderate",
                    "assessment_days": 31
                },
                "composite_stress_score": 0.58,
                "dominant_stress": "drought",
                "weather_stations": ["wx_station_123"],
                "data_points": 8928,
                "data_quality": 0.96,
                "confidence_score": 0.92
            }
        }
