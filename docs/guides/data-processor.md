# Claude Code Prompt for MicroCrop Data Processor (Python)

## Data Processor Context

You are building the data processing pipeline for **MicroCrop** that handles weather data analysis, satellite imagery processing, NDVI calculations, damage assessment, and real-time event streaming. This system must process data for 100,000+ plots, calculate parametric triggers, and generate verifiable proofs for blockchain payouts.

## Technical Architecture

**Data Processing Stack:**
- Python 3.10+ with async support
- Celery for distributed task processing
- NumPy/Pandas for data analysis
- Rasterio/GDAL for satellite imagery
- Scikit-learn for ML models
- Apache Kafka for event streaming
- TimescaleDB for time-series storage
- MinIO for object storage
- Docker for containerization

**Processing Requirements:**
- Handle 10,000+ weather updates per minute
- Process satellite imagery for 50,000 plots daily
- Calculate damage indices in real-time
- Generate cryptographic proofs
- Support batch and stream processing

## Detailed Implementation Requirements

### Project Structure
```
data-processor/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── logging_config.py
│   ├── processors/
│   │   ├── __init__.py
│   │   ├── weather_processor.py
│   │   ├── satellite_processor.py
│   │   ├── damage_calculator.py
│   │   └── oracle_processor.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── weather_models.py
│   │   ├── vegetation_models.py
│   │   ├── risk_models.py
│   │   └── ml_models.py
│   ├── analyzers/
│   │   ├── __init__.py
│   │   ├── drought_analyzer.py
│   │   ├── flood_analyzer.py
│   │   ├── ndvi_analyzer.py
│   │   └── time_series_analyzer.py
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── weather_tasks.py
│   │   ├── satellite_tasks.py
│   │   ├── damage_tasks.py
│   │   └── notification_tasks.py
│   ├── streaming/
│   │   ├── __init__.py
│   │   ├── kafka_consumer.py
│   │   ├── kafka_producer.py
│   │   └── event_handlers.py
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── timescale_client.py
│   │   ├── minio_client.py
│   │   ├── redis_cache.py
│   │   └── ipfs_client.py
│   ├── integrations/
│   │   ├── __init__.py
│   │   ├── weatherxm_client.py
│   │   ├── spexi_client.py
│   │   ├── blockchain_client.py
│   │   └── notification_client.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── geo_utils.py
│   │   ├── crypto_utils.py
│   │   ├── validators.py
│   │   └── constants.py
│   └── api/
│       ├── __init__.py
│       ├── app.py
│       ├── routes.py
│       └── websocket.py
├── notebooks/
│   ├── ndvi_analysis.ipynb
│   ├── weather_patterns.ipynb
│   ├── damage_model_training.ipynb
│   └── threshold_optimization.ipynb
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── scripts/
│   ├── train_models.py
│   ├── backfill_data.py
│   └── performance_test.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### 1. Core Configuration

```python
# src/config/settings.py
import os
from typing import Dict, Any
from pydantic import BaseSettings, Field, validator
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Application
    APP_NAME: str = "MicroCrop Data Processor"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")
    DEBUG: bool = Field(False, env="DEBUG")
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")
    
    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    TIMESCALE_URL: str = Field(..., env="TIMESCALE_URL")
    DB_POOL_SIZE: int = Field(20, env="DB_POOL_SIZE")
    DB_MAX_OVERFLOW: int = Field(40, env="DB_MAX_OVERFLOW")
    
    # Redis
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_MAX_CONNECTIONS: int = Field(50, env="REDIS_MAX_CONNECTIONS")
    CACHE_TTL: int = Field(3600, env="CACHE_TTL")
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = Field(..., env="KAFKA_BOOTSTRAP_SERVERS")
    KAFKA_CONSUMER_GROUP: str = Field("microcrop-processor", env="KAFKA_CONSUMER_GROUP")
    KAFKA_TOPICS: Dict[str, str] = {
        "weather": "weather-events",
        "satellite": "satellite-data",
        "damage": "damage-assessments",
        "payouts": "payout-triggers"
    }
    
    # MinIO
    MINIO_ENDPOINT: str = Field(..., env="MINIO_ENDPOINT")
    MINIO_ACCESS_KEY: str = Field(..., env="MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY: str = Field(..., env="MINIO_SECRET_KEY")
    MINIO_BUCKET: str = Field("microcrop-data", env="MINIO_BUCKET")
    MINIO_USE_SSL: bool = Field(False, env="MINIO_USE_SSL")
    
    # WeatherXM
    WEATHERXM_API_KEY: str = Field(..., env="WEATHERXM_API_KEY")
    WEATHERXM_API_URL: str = Field("https://api.weatherxm.com/v1", env="WEATHERXM_API_URL")
    WEATHERXM_RATE_LIMIT: int = Field(100, env="WEATHERXM_RATE_LIMIT")
    
    # Spexi
    SPEXI_API_KEY: str = Field(..., env="SPEXI_API_KEY")
    SPEXI_API_URL: str = Field("https://api.spexi.com/v1", env="SPEXI_API_URL")
    SPEXI_RESOLUTION: int = Field(10, env="SPEXI_RESOLUTION")  # meters
    
    # Processing Parameters
    NDVI_BASELINE_WINDOW: int = Field(90, env="NDVI_BASELINE_WINDOW")  # days
    DROUGHT_THRESHOLD_MM: float = Field(20.0, env="DROUGHT_THRESHOLD_MM")
    FLOOD_THRESHOLD_MM: float = Field(150.0, env="FLOOD_THRESHOLD_MM")
    HEAT_THRESHOLD_CELSIUS: float = Field(35.0, env="HEAT_THRESHOLD_CELSIUS")
    DAMAGE_INDEX_WEIGHTS: Dict[str, float] = {
        "weather": 0.6,
        "satellite": 0.4
    }
    
    # Celery
    CELERY_BROKER_URL: str = Field(..., env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field(..., env="CELERY_RESULT_BACKEND")
    CELERY_TASK_TIME_LIMIT: int = Field(300, env="CELERY_TASK_TIME_LIMIT")
    
    # Blockchain
    BLOCKCHAIN_RPC_URL: str = Field(..., env="BLOCKCHAIN_RPC_URL")
    ORACLE_PRIVATE_KEY: str = Field(..., env="ORACLE_PRIVATE_KEY")
    ORACLE_ADDRESS: str = Field(..., env="ORACLE_ADDRESS")
    CONTRACT_ADDRESS: str = Field(..., env="CONTRACT_ADDRESS")
    
    # IPFS
    IPFS_API_URL: str = Field("https://ipfs.infura.io:5001", env="IPFS_API_URL")
    PINATA_API_KEY: str = Field(..., env="PINATA_API_KEY")
    PINATA_SECRET_KEY: str = Field(..., env="PINATA_SECRET_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# src/config/logging_config.py
import logging
import sys
from pythonjsonlogger import jsonlogger
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

def setup_logging(settings: Settings) -> None:
    """Configure structured logging"""
    
    # Create formatters
    json_formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        filename="logs/processor.log",
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(json_formatter)
    
    # Error file handler
    error_handler = TimedRotatingFileHandler(
        filename="logs/errors.log",
        when="midnight",
        interval=1,
        backupCount=30
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(json_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    
    # Set third-party loggers to WARNING
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("kafka").setLevel(logging.WARNING)
```

### 2. Weather Processing

```python
# src/processors/weather_processor.py
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from dataclasses import dataclass
from scipy import stats

logger = logging.getLogger(__name__)

@dataclass
class WeatherData:
    """Weather data point"""
    station_id: str
    timestamp: datetime
    temperature: Optional[float]  # Celsius
    rainfall: Optional[float]  # mm
    humidity: Optional[float]  # percentage
    wind_speed: Optional[float]  # km/h
    solar_radiation: Optional[float]  # W/m²
    latitude: float
    longitude: float

@dataclass
class WeatherIndex:
    """Calculated weather indices"""
    drought_index: float  # 0-1
    flood_index: float  # 0-1
    heat_stress_index: float  # 0-1
    composite_stress_index: float  # 0-1
    confidence_score: float  # 0-1

class WeatherProcessor:
    """Process weather data and calculate stress indices"""
    
    def __init__(self, settings, db_client, cache_client):
        self.settings = settings
        self.db = db_client
        self.cache = cache_client
        self.station_cache = {}
        
    async def process_weather_update(self, data: Dict) -> WeatherData:
        """Process incoming weather data from WeatherXM"""
        try:
            # Parse and validate data
            weather_data = self._parse_weather_data(data)
            
            # Quality check
            if not self._validate_weather_data(weather_data):
                raise ValueError(f"Invalid weather data from station {weather_data.station_id}")
            
            # Store raw data
            await self._store_weather_data(weather_data)
            
            # Update rolling statistics
            await self._update_statistics(weather_data)
            
            # Check for anomalies
            anomalies = await self._detect_anomalies(weather_data)
            if anomalies:
                await self._handle_anomalies(weather_data, anomalies)
            
            # Map to affected plots
            affected_plots = await self._get_affected_plots(weather_data)
            
            # Calculate indices for each plot
            for plot_id in affected_plots:
                indices = await self.calculate_weather_indices(
                    plot_id, 
                    weather_data.station_id
                )
                
                # Check trigger thresholds
                if self._check_triggers(indices, plot_id):
                    await self._queue_damage_assessment(plot_id, indices)
            
            return weather_data
            
        except Exception as e:
            logger.error(f"Weather processing error: {e}", exc_info=True)
            raise
    
    def _parse_weather_data(self, data: Dict) -> WeatherData:
        """Parse raw weather data"""
        return WeatherData(
            station_id=data['station_id'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            temperature=data.get('temperature'),
            rainfall=data.get('rainfall', 0),
            humidity=data.get('humidity'),
            wind_speed=data.get('wind_speed'),
            solar_radiation=data.get('solar_radiation'),
            latitude=data['location']['lat'],
            longitude=data['location']['lng']
        )
    
    def _validate_weather_data(self, data: WeatherData) -> bool:
        """Validate weather data ranges"""
        validations = [
            data.temperature is None or -50 <= data.temperature <= 60,
            data.rainfall is None or 0 <= data.rainfall <= 500,
            data.humidity is None or 0 <= data.humidity <= 100,
            data.wind_speed is None or 0 <= data.wind_speed <= 200
        ]
        return all(validations)
    
    async def calculate_weather_indices(
        self, 
        plot_id: str, 
        station_id: str,
        window_days: int = 30
    ) -> WeatherIndex:
        """Calculate weather stress indices for a plot"""
        
        # Get historical data
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=window_days)
        
        weather_df = await self._get_weather_data(
            station_id, 
            start_date, 
            end_date
        )
        
        if weather_df.empty:
            logger.warning(f"No weather data for station {station_id}")
            return WeatherIndex(0, 0, 0, 0, 0)
        
        # Calculate drought index
        drought_index = self._calculate_drought_index(weather_df)
        
        # Calculate flood index
        flood_index = self._calculate_flood_index(weather_df)
        
        # Calculate heat stress index
        heat_index = self._calculate_heat_stress_index(weather_df)
        
        # Calculate composite index
        composite = self._calculate_composite_index(
            drought_index, 
            flood_index, 
            heat_index
        )
        
        # Calculate confidence score based on data completeness
        confidence = self._calculate_confidence_score(weather_df, window_days)
        
        return WeatherIndex(
            drought_index=drought_index,
            flood_index=flood_index,
            heat_stress_index=heat_index,
            composite_stress_index=composite,
            confidence_score=confidence
        )
    
    def _calculate_drought_index(self, df: pd.DataFrame) -> float:
        """
        Calculate drought index based on:
        - Cumulative rainfall deficit
        - Consecutive dry days
        - Soil moisture estimates
        """
        # Calculate cumulative rainfall
        total_rainfall = df['rainfall'].sum()
        expected_rainfall = self.settings.DROUGHT_THRESHOLD_MM * len(df)
        
        # Calculate rainfall deficit
        deficit_ratio = max(0, 1 - (total_rainfall / expected_rainfall))
        
        # Count consecutive dry days
        dry_days = 0
        max_dry_days = 0
        for rain in df['rainfall'].values:
            if rain < 1:  # Less than 1mm considered dry
                dry_days += 1
                max_dry_days = max(max_dry_days, dry_days)
            else:
                dry_days = 0
        
        dry_days_ratio = min(1, max_dry_days / 14)  # 14 days severe
        
        # Estimate soil moisture depletion
        evapotranspiration_rate = 5  # mm/day average
        moisture_balance = total_rainfall - (evapotranspiration_rate * len(df))
        moisture_stress = max(0, min(1, -moisture_balance / 100))
        
        # Weighted average
        drought_index = (
            deficit_ratio * 0.4 +
            dry_days_ratio * 0.3 +
            moisture_stress * 0.3
        )
        
        return min(1, drought_index)
    
    def _calculate_flood_index(self, df: pd.DataFrame) -> float:
        """
        Calculate flood index based on:
        - Maximum daily rainfall
        - Cumulative rainfall over short periods
        - Rainfall intensity
        """
        # Maximum daily rainfall
        max_daily = df['rainfall'].max()
        max_daily_ratio = min(1, max_daily / self.settings.FLOOD_THRESHOLD_MM)
        
        # Rolling 3-day cumulative
        df['rain_3d'] = df['rainfall'].rolling(window=3, min_periods=1).sum()
        max_3day = df['rain_3d'].max()
        cumulative_ratio = min(1, max_3day / (self.settings.FLOOD_THRESHOLD_MM * 1.5))
        
        # Rainfall intensity (mm/hour estimation)
        hourly_intensity = df['rainfall'].max() / 6  # Assume 6-hour event
        intensity_ratio = min(1, hourly_intensity / 25)  # 25mm/hr is severe
        
        # Check for sustained rainfall
        wet_days = (df['rainfall'] > 10).sum()
        sustained_ratio = min(1, wet_days / 10)  # 10 wet days is concerning
        
        # Weighted average
        flood_index = (
            max_daily_ratio * 0.3 +
            cumulative_ratio * 0.3 +
            intensity_ratio * 0.2 +
            sustained_ratio * 0.2
        )
        
        return min(1, flood_index)
    
    def _calculate_heat_stress_index(self, df: pd.DataFrame) -> float:
        """
        Calculate heat stress index based on:
        - Maximum temperatures
        - Consecutive hot days
        - Heat degree days
        """
        if 'temperature' not in df.columns or df['temperature'].isna().all():
            return 0.0
        
        # Maximum temperature
        max_temp = df['temperature'].max()
        max_temp_ratio = max(0, min(1, 
            (max_temp - self.settings.HEAT_THRESHOLD_CELSIUS) / 10
        ))
        
        # Consecutive days above threshold
        hot_days = 0
        max_hot_days = 0
        for temp in df['temperature'].values:
            if temp > self.settings.HEAT_THRESHOLD_CELSIUS:
                hot_days += 1
                max_hot_days = max(max_hot_days, hot_days)
            else:
                hot_days = 0
        
        consecutive_ratio = min(1, max_hot_days / 7)  # 7 days is severe
        
        # Heat degree days
        heat_dd = df[df['temperature'] > self.settings.HEAT_THRESHOLD_CELSIUS]['temperature'].apply(
            lambda x: x - self.settings.HEAT_THRESHOLD_CELSIUS
        ).sum()
        heat_dd_ratio = min(1, heat_dd / 50)  # 50 degree-days is severe
        
        # Night temperature stress (if available)
        if 'min_temperature' in df.columns:
            night_stress = (df['min_temperature'] > 25).sum() / len(df)
        else:
            night_stress = 0
        
        # Weighted average
        heat_index = (
            max_temp_ratio * 0.3 +
            consecutive_ratio * 0.3 +
            heat_dd_ratio * 0.3 +
            night_stress * 0.1
        )
        
        return min(1, heat_index)
    
    def _calculate_composite_index(
        self, 
        drought: float, 
        flood: float, 
        heat: float
    ) -> float:
        """Calculate composite stress index"""
        # Take the maximum stress as primary driver
        max_stress = max(drought, flood, heat)
        
        # Add compounding effects
        compound_effect = 0
        if drought > 0.3 and heat > 0.3:
            compound_effect = 0.1  # Drought + heat compound
        if flood > 0.5 and drought > 0.5:
            compound_effect = 0.15  # Flood after drought is worse
        
        return min(1, max_stress + compound_effect)
    
    def _calculate_confidence_score(
        self, 
        df: pd.DataFrame, 
        expected_days: int
    ) -> float:
        """Calculate confidence based on data completeness"""
        # Data availability
        availability = len(df) / expected_days
        
        # Data quality (non-null values)
        quality = 1 - df[['temperature', 'rainfall']].isna().sum().sum() / (len(df) * 2)
        
        # Recency (weight recent data more)
        if not df.empty:
            latest_data = df.iloc[-1]['timestamp']
            hours_old = (datetime.utcnow() - latest_data).total_seconds() / 3600
            recency = max(0, 1 - (hours_old / 48))  # 48 hours old = 0 confidence
        else:
            recency = 0
        
        return (availability * 0.4 + quality * 0.3 + recency * 0.3)
    
    async def _detect_anomalies(self, data: WeatherData) -> List[str]:
        """Detect weather anomalies"""
        anomalies = []
        
        # Get historical statistics
        stats = await self._get_station_statistics(
            data.station_id, 
            data.timestamp.month
        )
        
        if not stats:
            return anomalies
        
        # Check temperature anomaly
        if data.temperature:
            z_score = abs((data.temperature - stats['temp_mean']) / stats['temp_std'])
            if z_score > 3:
                anomalies.append(f"temperature_anomaly:{z_score:.2f}")
        
        # Check rainfall anomaly
        if data.rainfall:
            if data.rainfall > stats['rain_p99']:
                anomalies.append(f"extreme_rainfall:{data.rainfall:.1f}mm")
            elif data.rainfall > stats['rain_p95']:
                anomalies.append(f"heavy_rainfall:{data.rainfall:.1f}mm")
        
        return anomalies
    
    async def _get_affected_plots(
        self, 
        weather_data: WeatherData,
        radius_km: float = 50
    ) -> List[str]:
        """Get plots within radius of weather station"""
        query = """
            SELECT id FROM plots
            WHERE ST_DWithin(
                location::geography,
                ST_MakePoint(%s, %s)::geography,
                %s
            )
        """
        
        results = await self.db.fetch_all(
            query,
            weather_data.longitude,
            weather_data.latitude,
            radius_km * 1000  # Convert to meters
        )
        
        return [r['id'] for r in results]
```

### 3. Satellite Processing

```python
# src/processors/satellite_processor.py
import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.warp import calculate_default_transform, reproject, Resampling
import cv2
from shapely.geometry import box, mapping
from dataclasses import dataclass
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class SatelliteData:
    """Satellite imagery data"""
    plot_id: str
    capture_date: datetime
    ndvi: float
    evi: float
    lai: float  # Leaf Area Index
    cloud_cover: float
    image_url: str
    resolution: float  # meters
    confidence: float

@dataclass
class VegetationIndex:
    """Vegetation health indices"""
    ndvi_current: float
    ndvi_baseline: float
    ndvi_change: float
    evi: float
    lai: float
    vegetation_stress_index: float
    growth_stage: str

class SatelliteProcessor:
    """Process satellite imagery and calculate vegetation indices"""
    
    def __init__(self, settings, db_client, storage_client):
        self.settings = settings
        self.db = db_client
        self.storage = storage_client
        self.spexi_client = SpexiClient(settings)
        
    async def process_satellite_capture(
        self, 
        plot_id: str,
        image_data: Dict
    ) -> SatelliteData:
        """Process new satellite capture for a plot"""
        try:
            # Download imagery
            image_path = await self._download_imagery(image_data)
            
            # Get plot boundaries
            plot_bounds = await self._get_plot_boundaries(plot_id)
            
            # Extract plot area from image
            plot_image = await self._extract_plot_area(image_path, plot_bounds)
            
            # Calculate indices
            indices = await self._calculate_vegetation_indices(plot_image)
            
            # Assess cloud cover
            cloud_cover = await self._assess_cloud_cover(plot_image)
            
            # Quality check
            if cloud_cover > 0.3:  # 30% cloud cover
                logger.warning(f"High cloud cover ({cloud_cover:.1%}) for plot {plot_id}")
                indices['confidence'] *= (1 - cloud_cover)
            
            # Store processed image
            processed_url = await self._store_processed_image(
                plot_id, 
                plot_image, 
                indices
            )
            
            # Create satellite data record
            satellite_data = SatelliteData(
                plot_id=plot_id,
                capture_date=datetime.fromisoformat(image_data['capture_date']),
                ndvi=indices['ndvi'],
                evi=indices['evi'],
                lai=indices['lai'],
                cloud_cover=cloud_cover,
                image_url=processed_url,
                resolution=image_data.get('resolution', 10),
                confidence=indices['confidence']
            )
            
            # Store in database
            await self._store_satellite_data(satellite_data)
            
            # Calculate vegetation stress
            vegetation_index = await self.calculate_vegetation_stress(plot_id)
            
            # Check for significant changes
            if abs(vegetation_index.ndvi_change) > 0.25:
                await self._trigger_damage_assessment(plot_id, vegetation_index)
            
            return satellite_data
            
        except Exception as e:
            logger.error(f"Satellite processing error for plot {plot_id}: {e}")
            raise
    
    async def _calculate_vegetation_indices(
        self, 
        image: np.ndarray
    ) -> Dict[str, float]:
        """Calculate NDVI, EVI, and LAI from multispectral imagery"""
        
        # Extract bands (assuming standard order)
        # Band order: Blue, Green, Red, NIR, SWIR
        if len(image.shape) == 3:
            blue = image[:, :, 0].astype(float)
            green = image[:, :, 1].astype(float)
            red = image[:, :, 2].astype(float)
            nir = image[:, :, 3].astype(float)
            
            if image.shape[2] > 4:
                swir = image[:, :, 4].astype(float)
            else:
                swir = None
        else:
            raise ValueError("Invalid image shape for vegetation index calculation")
        
        # Normalize bands to reflectance (0-1)
        blue = blue / 10000
        green = green / 10000
        red = red / 10000
        nir = nir / 10000
        if swir is not None:
            swir = swir / 10000
        
        # Calculate NDVI (Normalized Difference Vegetation Index)
        ndvi = self._calculate_ndvi(red, nir)
        
        # Calculate EVI (Enhanced Vegetation Index)
        evi = self._calculate_evi(blue, red, nir)
        
        # Calculate LAI (Leaf Area Index)
        lai = self._calculate_lai(ndvi)
        
        # Calculate SAVI (Soil Adjusted Vegetation Index)
        savi = self._calculate_savi(red, nir)
        
        # Calculate moisture index if SWIR available
        if swir is not None:
            ndwi = self._calculate_ndwi(nir, swir)
        else:
            ndwi = None
        
        # Calculate mean values excluding clouds/shadows
        valid_pixels = (ndvi > -0.2) & (ndvi < 1.0)
        
        indices = {
            'ndvi': float(np.nanmean(ndvi[valid_pixels])),
            'evi': float(np.nanmean(evi[valid_pixels])),
            'lai': float(np.nanmean(lai[valid_pixels])),
            'savi': float(np.nanmean(savi[valid_pixels])),
            'ndwi': float(np.nanmean(ndwi[valid_pixels])) if ndwi is not None else None,
            'ndvi_std': float(np.nanstd(ndvi[valid_pixels])),
            'valid_pixels': float(np.sum(valid_pixels) / valid_pixels.size),
            'confidence': float(np.sum(valid_pixels) / valid_pixels.size)
        }
        
        return indices
    
    def _calculate_ndvi(self, red: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Calculate NDVI = (NIR - Red) / (NIR + Red)"""
        denominator = nir + red
        # Avoid division by zero
        denominator[denominator == 0] = np.nan
        ndvi = (nir - red) / denominator
        return np.clip(ndvi, -1, 1)
    
    def _calculate_evi(
        self, 
        blue: np.ndarray, 
        red: np.ndarray, 
        nir: np.ndarray
    ) -> np.ndarray:
        """
        Calculate EVI = G * ((NIR - Red) / (NIR + C1*Red - C2*Blue + L))
        Where G=2.5, C1=6, C2=7.5, L=1
        """
        G = 2.5
        C1 = 6
        C2 = 7.5
        L = 1
        
        denominator = nir + C1 * red - C2 * blue + L
        denominator[denominator == 0] = np.nan
        evi = G * ((nir - red) / denominator)
        return np.clip(evi, -1, 1)
    
    def _calculate_lai(self, ndvi: np.ndarray) -> np.ndarray:
        """
        Calculate LAI using empirical relationship
        LAI = -log((0.69 - NDVI) / 0.59) / 0.91
        """
        # Avoid log of negative numbers
        lai_input = (0.69 - ndvi) / 0.59
        lai_input[lai_input <= 0] = 0.001
        lai_input[lai_input > 1] = 1
        
        lai = -np.log(lai_input) / 0.91
        return np.clip(lai, 0, 8)  # Realistic LAI range
    
    def _calculate_savi(
        self, 
        red: np.ndarray, 
        nir: np.ndarray,
        L: float = 0.5
    ) -> np.ndarray:
        """
        Calculate SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)
        L is soil brightness correction factor (0.5 for medium vegetation)
        """
        denominator = nir + red + L
        denominator[denominator == 0] = np.nan
        savi = ((nir - red) / denominator) * (1 + L)
        return np.clip(savi, -1, 1)
    
    def _calculate_ndwi(self, nir: np.ndarray, swir: np.ndarray) -> np.ndarray:
        """
        Calculate NDWI = (NIR - SWIR) / (NIR + SWIR)
        Normalized Difference Water Index for vegetation water content
        """
        denominator = nir + swir
        denominator[denominator == 0] = np.nan
        ndwi = (nir - swir) / denominator
        return np.clip(ndwi, -1, 1)
    
    async def _assess_cloud_cover(self, image: np.ndarray) -> float:
        """Assess cloud cover percentage using spectral analysis"""
        
        # Simple cloud detection based on high reflectance in all bands
        if len(image.shape) == 3:
            # Calculate brightness
            brightness = np.mean(image[:, :, :3], axis=2) / 10000
            
            # Clouds are typically very bright
            cloud_mask = brightness > 0.3
            
            # Refined detection using band ratios
            if image.shape[2] >= 4:
                blue = image[:, :, 0] / 10000
                nir = image[:, :, 3] / 10000
                
                # Clouds have similar reflectance across bands
                ratio = blue / (nir + 0.01)
                cloud_mask = cloud_mask | ((ratio > 0.8) & (ratio < 1.2))
            
            cloud_percentage = np.sum(cloud_mask) / cloud_mask.size
            
        else:
            cloud_percentage = 0.0
        
        return float(cloud_percentage)
    
    async def calculate_vegetation_stress(
        self, 
        plot_id: str,
        days_back: int = 30
    ) -> VegetationIndex:
        """Calculate vegetation stress index comparing current to baseline"""
        
        # Get recent NDVI values
        recent_data = await self._get_recent_satellite_data(plot_id, days_back)
        
        if not recent_data:
            logger.warning(f"No satellite data for plot {plot_id}")
            return VegetationIndex(0, 0, 0, 0, 0, 0, "unknown")
        
        # Get current values
        current = recent_data[0]  # Most recent
        
        # Get baseline (seasonal average or pre-season)
        baseline = await self._get_vegetation_baseline(plot_id)
        
        # Calculate change
        ndvi_change = current['ndvi'] - baseline['ndvi']
        ndvi_change_percent = ndvi_change / baseline['ndvi'] if baseline['ndvi'] > 0 else 0
        
        # Determine growth stage based on calendar
        growth_stage = await self._determine_growth_stage(plot_id)
        
        # Calculate stress index based on growth stage
        stress_index = self._calculate_stress_index(
            ndvi_change_percent,
            growth_stage,
            current
        )
        
        return VegetationIndex(
            ndvi_current=current['ndvi'],
            ndvi_baseline=baseline['ndvi'],
            ndvi_change=ndvi_change,
            evi=current.get('evi', 0),
            lai=current.get('lai', 0),
            vegetation_stress_index=stress_index,
            growth_stage=growth_stage
        )
    
    def _calculate_stress_index(
        self,
        ndvi_change_percent: float,
        growth_stage: str,
        current_indices: Dict
    ) -> float:
        """Calculate vegetation stress index based on growth stage"""
        
        # Growth stage sensitivity factors
        sensitivity = {
            'germination': 0.8,
            'vegetative': 1.0,
            'flowering': 1.2,  # Most sensitive
            'grain_filling': 1.1,
            'maturity': 0.6,
            'harvest': 0.3
        }
        
        stage_factor = sensitivity.get(growth_stage, 1.0)
        
        # Base stress from NDVI change
        if ndvi_change_percent < -0.1:  # More than 10% decline
            base_stress = min(1.0, abs(ndvi_change_percent) * 2)
        else:
            base_stress = 0
        
        # Adjust for absolute NDVI values
        if current_indices['ndvi'] < 0.3:  # Very low vegetation
            ndvi_stress = 0.8
        elif current_indices['ndvi'] < 0.5:
            ndvi_stress = 0.4
        else:
            ndvi_stress = 0
        
        # Combine stresses
        total_stress = min(1.0, (base_stress * stage_factor + ndvi_stress) / 2)
        
        return total_stress
    
    async def _get_vegetation_baseline(self, plot_id: str) -> Dict:
        """Get vegetation baseline for comparison"""
        
        # Try to get seasonal average (last 3 years, same month)
        current_month = datetime.utcnow().month
        
        query = """
            SELECT 
                AVG(ndvi) as ndvi,
                AVG(evi) as evi,
                AVG(lai) as lai
            FROM satellite_data
            WHERE plot_id = %s
                AND EXTRACT(MONTH FROM capture_date) = %s
                AND capture_date >= NOW() - INTERVAL '3 years'
                AND capture_date < NOW() - INTERVAL '1 month'
                AND cloud_cover < 0.2
        """
        
        result = await self.db.fetch_one(query, plot_id, current_month)
        
        if result and result['ndvi']:
            return dict(result)
        
        # Fallback to pre-season baseline
        query = """
            SELECT 
                AVG(ndvi) as ndvi,
                AVG(evi) as evi,
                AVG(lai) as lai
            FROM satellite_data
            WHERE plot_id = %s
                AND capture_date >= %s
                AND capture_date <= %s
                AND cloud_cover < 0.2
        """
        
        # Get planting date
        plot = await self.db.fetch_one(
            "SELECT planting_date FROM plots WHERE id = %s",
            plot_id
        )
        
        if plot and plot['planting_date']:
            start_date = plot['planting_date'] - timedelta(days=30)
            end_date = plot['planting_date']
            
            result = await self.db.fetch_one(query, plot_id, start_date, end_date)
            if result and result['ndvi']:
                return dict(result)
        
        # Default baseline
        return {'ndvi': 0.6, 'evi': 0.4, 'lai': 2.0}
```

### 4. Damage Calculator

```python
# src/processors/damage_calculator.py
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from dataclasses import dataclass
import hashlib
import json

logger = logging.getLogger(__name__)

@dataclass
class DamageAssessment:
    """Complete damage assessment"""
    policy_id: str
    plot_id: str
    assessment_date: datetime
    weather_stress_index: float
    vegetation_stress_index: float
    damage_index: float
    payout_percentage: float
    confidence_score: float
    evidence_hash: str
    triggers_activated: List[str]

class DamageCalculator:
    """Calculate damage index and determine payouts"""
    
    def __init__(self, settings, db_client, blockchain_client):
        self.settings = settings
        self.db = db_client
        self.blockchain = blockchain_client
        self.weights = settings.DAMAGE_INDEX_WEIGHTS
        
    async def calculate_damage(
        self,
        policy_id: str,
        weather_index: WeatherIndex,
        vegetation_index: VegetationIndex
    ) -> DamageAssessment:
        """Calculate comprehensive damage assessment"""
        
        try:
            # Get policy details
            policy = await self._get_policy_details(policy_id)
            if not policy:
                raise ValueError(f"Policy {policy_id} not found")
            
            # Check if policy is active
            if not self._is_policy_active(policy):
                logger.info(f"Policy {policy_id} is not active")
                return None
            
            # Normalize indices to 0-1 scale
            weather_stress = self._normalize_weather_stress(weather_index)
            vegetation_stress = self._normalize_vegetation_stress(vegetation_index)
            
            # Apply crop-specific adjustments
            weather_stress = self._apply_crop_adjustment(
                weather_stress,
                policy['crop_type'],
                'weather'
            )
            vegetation_stress = self._apply_crop_adjustment(
                vegetation_stress,
                policy['crop_type'],
                'vegetation'
            )
            
            # Calculate weighted damage index
            damage_index = self._calculate_weighted_damage(
                weather_stress,
                vegetation_stress,
                policy['coverage_type']
            )
            
            # Apply temporal adjustments (growth stage)
            damage_index = await self._apply_temporal_adjustment(
                damage_index,
                policy['plot_id']
            )
            
            # Determine payout percentage
            payout_percentage = self._calculate_payout_percentage(
                damage_index,
                policy['coverage_type']
            )
            
            # Calculate confidence score
            confidence = self._calculate_confidence(
                weather_index.confidence_score,
                vegetation_index.confidence if hasattr(vegetation_index, 'confidence') else 0.8
            )
            
            # Check which triggers activated
            triggers = self._check_triggers(
                weather_index,
                vegetation_index,
                policy['thresholds']
            )
            
            # Generate evidence package
            evidence_hash = await self._generate_evidence_hash(
                policy_id,
                weather_index,
                vegetation_index,
                damage_index
            )
            
            # Create assessment
            assessment = DamageAssessment(
                policy_id=policy_id,
                plot_id=policy['plot_id'],
                assessment_date=datetime.utcnow(),
                weather_stress_index=weather_stress,
                vegetation_stress_index=vegetation_stress,
                damage_index=damage_index,
                payout_percentage=payout_percentage,
                confidence_score=confidence,
                evidence_hash=evidence_hash,
                triggers_activated=triggers
            )
            
            # Store assessment
            await self._store_assessment(assessment)
            
            # If payout triggered, initiate payout process
            if payout_percentage > 0 and confidence > 0.7:
                await self._initiate_payout(assessment, policy)
            
            return assessment
            
        except Exception as e:
            logger.error(f"Damage calculation error: {e}", exc_info=True)
            raise
    
    def _calculate_weighted_damage(
        self,
        weather_stress: float,
        vegetation_stress: float,
        coverage_type: str
    ) -> float:
        """Calculate weighted damage index based on coverage type"""
        
        # Adjust weights based on coverage type
        if coverage_type == 'DROUGHT':
            # Drought relies more on weather data
            weather_weight = 0.7
            vegetation_weight = 0.3
        elif coverage_type == 'FLOOD':
            # Flood relies more on immediate weather
            weather_weight = 0.8
            vegetation_weight = 0.2
        else:  # MULTI_PERIL
            # Use default weights
            weather_weight = self.weights['weather']
            vegetation_weight = self.weights['satellite']
        
        # Calculate weighted average
        damage_index = (
            weather_stress * weather_weight +
            vegetation_stress * vegetation_weight
        )
        
        # Apply non-linear transformation for extreme events
        if damage_index > 0.7:
            # Amplify severe damage
            damage_index = damage_index ** 0.9
        elif damage_index < 0.3:
            # Dampen minor damage
            damage_index = damage_index ** 1.2
        
        return min(1.0, damage_index)
    
    def _calculate_payout_percentage(
        self,
        damage_index: float,
        coverage_type: str
    ) -> float:
        """Determine payout percentage based on damage index"""
        
        # Coverage-specific thresholds
        thresholds = {
            'DROUGHT': {
                'none': 0.3,
                'partial': 0.5,
                'full': 0.7
            },
            'FLOOD': {
                'none': 0.4,
                'partial': 0.6,
                'full': 0.8
            },
            'MULTI_PERIL': {
                'none': 0.35,
                'partial': 0.55,
                'full': 0.75
            }
        }
        
        levels = thresholds.get(coverage_type, thresholds['MULTI_PERIL'])
        
        if damage_index < levels['none']:
            return 0.0
        elif damage_index < levels['partial']:
            # Linear interpolation between 30% and 70% payout
            range_size = levels['partial'] - levels['none']
            position = (damage_index - levels['none']) / range_size
            return 0.3 + (position * 0.4)  # 30% to 70%
        elif damage_index < levels['full']:
            # Linear interpolation between 70% and 100% payout
            range_size = levels['full'] - levels['partial']
            position = (damage_index - levels['partial']) / range_size
            return 0.7 + (position * 0.3)  # 70% to 100%
        else:
            return 1.0  # 100% payout
    
    def _apply_crop_adjustment(
        self,
        stress_index: float,
        crop_type: str,
        index_type: str
    ) -> float:
        """Apply crop-specific adjustments to stress indices"""
        
        # Crop sensitivity factors
        crop_factors = {
            'MAIZE': {
                'weather': 1.1,  # More sensitive to drought
                'vegetation': 0.9
            },
            'BEANS': {
                'weather': 0.9,
                'vegetation': 1.0
            },
            'WHEAT': {
                'weather': 1.0,
                'vegetation': 1.0
            },
            'RICE': {
                'weather': 1.2,  # Very sensitive to water
                'vegetation': 0.8
            },
            'VEGETABLES': {
                'weather': 1.15,
                'vegetation': 1.1
            }
        }
        
        factors = crop_factors.get(crop_type, {'weather': 1.0, 'vegetation': 1.0})
        adjusted = stress_index * factors[index_type]
        
        return min(1.0, adjusted)
    
    async def _generate_evidence_hash(
        self,
        policy_id: str,
        weather_index: WeatherIndex,
        vegetation_index: VegetationIndex,
        damage_index: float
    ) -> str:
        """Generate cryptographic hash of evidence for blockchain"""
        
        evidence = {
            'policy_id': policy_id,
            'timestamp': datetime.utcnow().isoformat(),
            'weather': {
                'drought_index': weather_index.drought_index,
                'flood_index': weather_index.flood_index,
                'heat_stress_index': weather_index.heat_stress_index,
                'composite_stress_index': weather_index.composite_stress_index,
                'confidence': weather_index.confidence_score
            },
            'vegetation': {
                'ndvi_current': vegetation_index.ndvi_current,
                'ndvi_baseline': vegetation_index.ndvi_baseline,
                'ndvi_change': vegetation_index.ndvi_change,
                'vegetation_stress_index': vegetation_index.vegetation_stress_index
            },
            'damage_index': damage_index
        }
        
        # Convert to canonical JSON
        evidence_json = json.dumps(evidence, sort_keys=True, separators=(',', ':'))
        
        # Generate SHA256 hash
        evidence_hash = hashlib.sha256(evidence_json.encode()).hexdigest()
        
        # Store evidence in IPFS
        ipfs_hash = await self._store_evidence_ipfs(evidence_json)
        
        # Return combined hash
        return f"{evidence_hash}:{ipfs_hash}"
```

### 5. Celery Workers

```python
# src/workers/celery_app.py
from celery import Celery
from celery.schedules import crontab
from kombu import Queue, Exchange
from config.settings import get_settings

settings = get_settings()

# Create Celery app
app = Celery('microcrop-processor')

# Configure Celery
app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_TIME_LIMIT - 10,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Define exchanges
default_exchange = Exchange('default', type='direct')
weather_exchange = Exchange('weather', type='topic')
satellite_exchange = Exchange('satellite', type='topic')
damage_exchange = Exchange('damage', type='topic')

# Define queues
app.conf.task_queues = (
    Queue('default', default_exchange, routing_key='default'),
    Queue('weather.process', weather_exchange, routing_key='weather.process'),
    Queue('weather.analyze', weather_exchange, routing_key='weather.analyze'),
    Queue('satellite.fetch', satellite_exchange, routing_key='satellite.fetch'),
    Queue('satellite.process', satellite_exchange, routing_key='satellite.process'),
    Queue('damage.calculate', damage_exchange, routing_key='damage.calculate'),
    Queue('damage.payout', damage_exchange, routing_key='damage.payout'),
)

# Route tasks to queues
app.conf.task_routes = {
    'workers.weather_tasks.*': {'queue': 'weather.process'},
    'workers.satellite_tasks.*': {'queue': 'satellite.process'},
    'workers.damage_tasks.*': {'queue': 'damage.calculate'},
}

# Define beat schedule for periodic tasks
app.conf.beat_schedule = {
    'fetch-weather-updates': {
        'task': 'workers.weather_tasks.fetch_weather_updates',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'fetch-satellite-imagery': {
        'task': 'workers.satellite_tasks.fetch_satellite_imagery',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
    'calculate-daily-indices': {
        'task': 'workers.damage_tasks.calculate_daily_indices',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    'process-pending-payouts': {
        'task': 'workers.damage_tasks.process_pending_payouts',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    'cleanup-old-data': {
        'task': 'workers.maintenance_tasks.cleanup_old_data',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

# src/workers/weather_tasks.py
from celery import Task
from workers.celery_app import app
from processors.weather_processor import WeatherProcessor
import logging

logger = logging.getLogger(__name__)

class WeatherTask(Task):
    """Base task with database connection"""
    _processor = None
    
    @property
    def processor(self):
        if self._processor is None:
            settings = get_settings()
            db_client = get_db_client()
            cache_client = get_cache_client()
            self._processor = WeatherProcessor(settings, db_client, cache_client)
        return self._processor

@app.task(base=WeatherTask, bind=True, max_retries=3)
def process_weather_update(self, station_data):
    """Process weather station update"""
    try:
        logger.info(f"Processing weather update from station {station_data['station_id']}")
        
        # Process weather data
        result = asyncio.run(
            self.processor.process_weather_update(station_data)
        )
        
        # Trigger dependent tasks
        if result:
            check_weather_triggers.delay(result.station_id)
        
        return {
            'status': 'success',
            'station_id': result.station_id,
            'timestamp': result.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Weather processing failed: {e}")
        raise self.retry(exc=e, countdown=60)

@app.task
def fetch_weather_updates():
    """Fetch weather updates from all active stations"""
    try:
        stations = get_active_stations()
        
        for station in stations:
            # Queue processing for each station
            process_weather_update.delay({
                'station_id': station['id'],
                'fetch': True
            })
        
        return {'stations_queued': len(stations)}
        
    except Exception as e:
        logger.error(f"Failed to fetch weather updates: {e}")
        raise

@app.task
def check_weather_triggers(station_id):
    """Check if weather triggers are met for policies"""
    try:
        processor = WeatherProcessor(get_settings(), get_db_client(), get_cache_client())
        
        # Get affected plots
        plots = asyncio.run(processor._get_affected_plots_by_station(station_id))
        
        for plot_id in plots:
            # Calculate indices
            indices = asyncio.run(
                processor.calculate_weather_indices(plot_id, station_id)
            )
            
            # Check if triggers met
            if indices.composite_stress_index > 0.5:
                calculate_damage.delay(plot_id)
        
        return {'plots_checked': len(plots)}
        
    except Exception as e:
        logger.error(f"Trigger check failed: {e}")
        raise
```

### 6. Requirements File

```txt
# requirements.txt

# Core
python-dotenv==1.0.0
pydantic==2.5.0
python-json-logger==2.0.7

# Async
asyncio==3.4.3
aiohttp==3.9.1
aiokafka==0.10.0

# Data Processing
numpy==1.24.3
pandas==2.1.4
scipy==1.11.4
scikit-learn==1.3.2

# Geospatial
rasterio==1.3.9
shapely==2.0.2
pyproj==3.6.1
geopandas==0.14.1
GDAL==3.8.0

# Image Processing
opencv-python==4.8.1
Pillow==10.1.0
scikit-image==0.22.0

# Database
asyncpg==0.29.0
psycopg2-binary==2.9.9
redis==5.0.1
motor==3.3.2

# Message Queue
celery==5.3.4
kombu==5.3.4
flower==2.0.1
kafka-python==2.0.2

# Storage
minio==7.2.0
boto3==1.34.0

# Blockchain
web3==6.11.4
eth-account==0.10.0
eth-utils==4.0.0

# API
fastapi==0.104.1
uvicorn==0.24.0
websockets==12.0
httpx==0.25.2

# ML/Statistics
statsmodels==0.14.0
prophet==1.1.5
xgboost==2.0.2

# Monitoring
prometheus-client==0.19.0
opentelemetry-api==1.21.0
opentelemetry-sdk==1.21.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
faker==20.1.0

# Development
black==23.11.0
flake8==6.1.0
mypy==1.7.1
ipython==8.18.1
jupyter==1.0.0
```

## Success Criteria

The data processor is complete when:
- Processing 10,000+ weather updates per minute
- Satellite imagery processed within 5 minutes of receipt
- Damage calculations completed in < 1 minute
- 99.9% accuracy in index calculations
- Cryptographic proofs generated and stored on IPFS
- Kafka streaming handling 100,000 events/hour
- Celery workers auto-scaling based on load
- ML models trained and deployed for prediction
- Complete audit trail for all calculations
- Integration with blockchain oracle system
- Real-time WebSocket updates for monitoring
- Comprehensive test coverage (>90%)
- Documentation for all algorithms

This data processor forms the analytical core of MicroCrop, ensuring accurate, timely, and verifiable damage assessments that trigger automatic payouts to farmers.