"""
TimescaleDB client for time-series data storage.

Handles storage and retrieval of:
- Weather data (time-series)
- Satellite imagery metadata
- Damage assessments
- Historical baselines
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import asyncpg
from asyncpg import Pool
import json

from src.config import get_settings
from src.models.weather import WeatherData, WeatherIndices
from src.models.satellite import SatelliteImage
from src.models.damage import DamageAssessment

settings = get_settings()
logger = logging.getLogger(__name__)


class TimescaleClient:
    """Client for TimescaleDB operations."""
    
    def __init__(self):
        """Initialize TimescaleDB client."""
        self.settings = settings
        self.logger = logger
        self.pool: Optional[Pool] = None
        
        # Connection parameters
        self.database_url = settings.TIMESCALE_URL
        self.min_pool_size = 5
        self.max_pool_size = settings.DB_POOL_SIZE
        self.command_timeout = settings.DB_POOL_TIMEOUT
        
        self.logger.info("TimescaleClient initialized")
    
    async def connect(self) -> None:
        """Establish database connection pool."""
        try:
            self.logger.info("Connecting to TimescaleDB")
            
            self.pool = await asyncpg.create_pool(
                dsn=self.database_url,
                min_size=self.min_pool_size,
                max_size=self.max_pool_size,
                command_timeout=self.command_timeout,
            )
            
            # Enable TimescaleDB extension
            async with self.pool.acquire() as conn:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
            
            # Create hypertables if not exist
            await self._create_tables()
            
            self.logger.info("Connected to TimescaleDB successfully")
            
        except Exception as e:
            self.logger.error(f"Error connecting to TimescaleDB: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            self.logger.info("Disconnected from TimescaleDB")
    
    async def _create_tables(self) -> None:
        """Create database tables and hypertables."""
        async with self.pool.acquire() as conn:
            # Drop existing tables if they exist (for schema updates)
            # This ensures tables are created with correct composite primary keys
            await conn.execute("""
                DROP TABLE IF EXISTS damage_assessments CASCADE;
                DROP TABLE IF EXISTS satellite_images CASCADE;
                DROP TABLE IF EXISTS weather_indices CASCADE;
                DROP TABLE IF EXISTS weather_data CASCADE;
            """)

            # Weather data table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS weather_data (
                    time TIMESTAMPTZ NOT NULL,
                    plot_id TEXT NOT NULL,
                    policy_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    temperature DOUBLE PRECISION NOT NULL,
                    feels_like DOUBLE PRECISION,
                    min_temperature DOUBLE PRECISION,
                    max_temperature DOUBLE PRECISION,
                    rainfall DOUBLE PRECISION NOT NULL DEFAULT 0,
                    rainfall_rate DOUBLE PRECISION,
                    humidity DOUBLE PRECISION NOT NULL,
                    pressure DOUBLE PRECISION NOT NULL,
                    wind_speed DOUBLE PRECISION NOT NULL,
                    wind_direction DOUBLE PRECISION,
                    wind_gust DOUBLE PRECISION,
                    solar_radiation DOUBLE PRECISION,
                    uv_index DOUBLE PRECISION,
                    soil_moisture DOUBLE PRECISION,
                    soil_temperature DOUBLE PRECISION,
                    data_quality DOUBLE PRECISION NOT NULL DEFAULT 1.0
                );
            """)
            
            # Convert to hypertable
            await conn.execute("""
                SELECT create_hypertable('weather_data', 'time', 
                    if_not_exists => TRUE,
                    chunk_time_interval => INTERVAL '1 day'
                );
            """)
            
            # Create indices
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_weather_plot_time 
                ON weather_data (plot_id, time DESC);
            """)
            
            # Weather indices table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS weather_indices (
                    time TIMESTAMPTZ NOT NULL,
                    plot_id TEXT NOT NULL,
                    policy_id TEXT NOT NULL,
                    assessment_start TIMESTAMPTZ NOT NULL,
                    assessment_end TIMESTAMPTZ NOT NULL,
                    drought_score DOUBLE PRECISION NOT NULL,
                    flood_score DOUBLE PRECISION NOT NULL,
                    heat_stress_score DOUBLE PRECISION NOT NULL,
                    composite_stress_score DOUBLE PRECISION NOT NULL,
                    dominant_stress TEXT NOT NULL,
                    data_points INTEGER NOT NULL,
                    data_quality DOUBLE PRECISION NOT NULL,
                    confidence_score DOUBLE PRECISION NOT NULL,
                    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
                    anomaly_score DOUBLE PRECISION,
                    processor_version TEXT NOT NULL,
                    data JSONB NOT NULL
                );
            """)
            
            await conn.execute("""
                SELECT create_hypertable('weather_indices', 'time',
                    if_not_exists => TRUE,
                    chunk_time_interval => INTERVAL '7 days'
                );
            """)
            
            # Satellite images table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS satellite_images (
                    time TIMESTAMPTZ NOT NULL,
                    image_id TEXT NOT NULL,
                    plot_id TEXT NOT NULL,
                    policy_id TEXT NOT NULL,
                    capture_date TIMESTAMPTZ NOT NULL,
                    satellite_source TEXT NOT NULL,
                    resolution_meters DOUBLE PRECISION NOT NULL,
                    ndvi_mean DOUBLE PRECISION,
                    ndvi_baseline DOUBLE PRECISION,
                    ndvi_change DOUBLE PRECISION,
                    is_stressed BOOLEAN,
                    stress_severity DOUBLE PRECISION,
                    cloud_cover_percentage DOUBLE PRECISION NOT NULL,
                    overall_quality_score DOUBLE PRECISION NOT NULL,
                    is_valid_for_assessment BOOLEAN NOT NULL,
                    growth_stage TEXT NOT NULL,
                    raw_image_url TEXT NOT NULL,
                    processed_image_url TEXT,
                    ndvi_raster_url TEXT,
                    processor_version TEXT NOT NULL,
                    data JSONB NOT NULL,
                    PRIMARY KEY (image_id, time)
                );
            """)
            
            await conn.execute("""
                SELECT create_hypertable('satellite_images', 'time',
                    if_not_exists => TRUE,
                    chunk_time_interval => INTERVAL '7 days'
                );
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_satellite_plot_time
                ON satellite_images (plot_id, time DESC);
            """)
            
            # Damage assessments table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS damage_assessments (
                    time TIMESTAMPTZ NOT NULL,
                    assessment_id TEXT NOT NULL,
                    plot_id TEXT NOT NULL,
                    policy_id TEXT NOT NULL,
                    farmer_address TEXT NOT NULL,
                    assessment_start TIMESTAMPTZ NOT NULL,
                    assessment_end TIMESTAMPTZ NOT NULL,
                    composite_damage_score DOUBLE PRECISION NOT NULL,
                    damage_percentage DOUBLE PRECISION NOT NULL,
                    payable_damage_percentage DOUBLE PRECISION NOT NULL,
                    damage_type TEXT NOT NULL,
                    damage_severity TEXT NOT NULL,
                    is_triggered BOOLEAN NOT NULL,
                    payout_amount_usdc DOUBLE PRECISION NOT NULL,
                    actual_payout_usdc DOUBLE PRECISION NOT NULL,
                    confidence_score DOUBLE PRECISION NOT NULL,
                    status TEXT NOT NULL,
                    oracle_submission_required BOOLEAN NOT NULL,
                    ipfs_cid TEXT,
                    processor_version TEXT NOT NULL,
                    data JSONB NOT NULL,
                    PRIMARY KEY (assessment_id, time)
                );
            """)
            
            await conn.execute("""
                SELECT create_hypertable('damage_assessments', 'time',
                    if_not_exists => TRUE,
                    chunk_time_interval => INTERVAL '30 days'
                );
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_damage_plot_time
                ON damage_assessments (plot_id, time DESC);
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_damage_status
                ON damage_assessments (status, time DESC);
            """)
            
            self.logger.info("Database tables created/verified")
    
    async def store_weather_data(
        self,
        weather_data: WeatherData,
        plot_id: str,
        policy_id: str,
    ) -> None:
        """Store weather data point."""
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO weather_data (
                        time, plot_id, policy_id, station_id, latitude, longitude,
                        temperature, feels_like, min_temperature, max_temperature,
                        rainfall, rainfall_rate, humidity, pressure,
                        wind_speed, wind_direction, wind_gust,
                        solar_radiation, uv_index,
                        soil_moisture, soil_temperature, data_quality
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                    )
                """,
                    weather_data.timestamp, plot_id, policy_id,
                    weather_data.station_id, weather_data.latitude, weather_data.longitude,
                    weather_data.temperature, weather_data.feels_like,
                    weather_data.min_temperature, weather_data.max_temperature,
                    weather_data.rainfall, weather_data.rainfall_rate,
                    weather_data.humidity, weather_data.pressure,
                    weather_data.wind_speed, weather_data.wind_direction,
                    weather_data.wind_gust, weather_data.solar_radiation,
                    weather_data.uv_index, weather_data.soil_moisture,
                    weather_data.soil_temperature, weather_data.data_quality,
                )
                
        except Exception as e:
            self.logger.error(f"Error storing weather data: {e}", exc_info=True)
            raise
    
    async def get_weather_data(
        self,
        plot_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[WeatherData]:
        """Retrieve weather data for a plot and time range."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM weather_data
                    WHERE plot_id = $1
                    AND time >= $2
                    AND time <= $3
                    ORDER BY time ASC
                """, plot_id, start_date, end_date)
                
                weather_data_list = []
                for row in rows:
                    weather_data = WeatherData(
                        station_id=row['station_id'],
                        timestamp=row['time'],
                        latitude=row['latitude'],
                        longitude=row['longitude'],
                        temperature=row['temperature'],
                        feels_like=row['feels_like'],
                        min_temperature=row['min_temperature'],
                        max_temperature=row['max_temperature'],
                        rainfall=row['rainfall'],
                        rainfall_rate=row['rainfall_rate'],
                        humidity=row['humidity'],
                        pressure=row['pressure'],
                        wind_speed=row['wind_speed'],
                        wind_direction=row['wind_direction'],
                        wind_gust=row['wind_gust'],
                        solar_radiation=row['solar_radiation'],
                        uv_index=row['uv_index'],
                        soil_moisture=row['soil_moisture'],
                        soil_temperature=row['soil_temperature'],
                        data_quality=row['data_quality'],
                    )
                    weather_data_list.append(weather_data)
                
                return weather_data_list
                
        except Exception as e:
            self.logger.error(f"Error retrieving weather data: {e}", exc_info=True)
            raise
    
    async def store_satellite_image(self, image: SatelliteImage) -> None:
        """Store satellite image metadata."""
        try:
            async with self.pool.acquire() as conn:
                # Extract NDVI analysis data
                ndvi_mean = None
                ndvi_baseline = None
                ndvi_change = None
                is_stressed = None
                stress_severity = None
                
                if image.vegetation_indices:
                    ndvi_mean = image.vegetation_indices.ndvi_mean
                
                if image.ndvi_analysis:
                    ndvi_baseline = image.ndvi_analysis.baseline_ndvi
                    ndvi_change = image.ndvi_analysis.ndvi_change
                    is_stressed = image.ndvi_analysis.is_stressed
                    stress_severity = image.ndvi_analysis.stress_severity
                
                await conn.execute("""
                    INSERT INTO satellite_images (
                        time, image_id, plot_id, policy_id, capture_date,
                        satellite_source, resolution_meters,
                        ndvi_mean, ndvi_baseline, ndvi_change, is_stressed, stress_severity,
                        cloud_cover_percentage, overall_quality_score, is_valid_for_assessment,
                        growth_stage, raw_image_url, processed_image_url, ndvi_raster_url,
                        processor_version, data
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21
                    )
                """,
                    image.capture_date, image.image_id, image.plot_id, image.policy_id,
                    image.capture_date, image.satellite_source, image.resolution_meters,
                    ndvi_mean, ndvi_baseline, ndvi_change, is_stressed, stress_severity,
                    image.cloud_assessment.cloud_cover_percentage,
                    image.overall_quality_score, image.is_valid_for_assessment,
                    image.estimated_growth_stage.value,
                    image.raw_image_url, image.processed_image_url, image.ndvi_raster_url,
                    image.processor_version, json.dumps(image.dict()),
                )
                
        except Exception as e:
            self.logger.error(f"Error storing satellite image: {e}", exc_info=True)
            raise
    
    async def get_satellite_images(
        self,
        plot_id: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Retrieve satellite images for a plot and time range."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM satellite_images
                    WHERE plot_id = $1
                    AND time >= $2
                    AND time <= $3
                    ORDER BY time DESC
                """, plot_id, start_date, end_date)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            self.logger.error(f"Error retrieving satellite images: {e}", exc_info=True)
            raise
    
    async def store_damage_assessment(self, assessment: DamageAssessment) -> None:
        """Store damage assessment."""
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO damage_assessments (
                        time, assessment_id, plot_id, policy_id, farmer_address,
                        assessment_start, assessment_end,
                        composite_damage_score, damage_percentage, payable_damage_percentage,
                        damage_type, damage_severity,
                        is_triggered, payout_amount_usdc, actual_payout_usdc,
                        confidence_score, status, oracle_submission_required,
                        ipfs_cid, processor_version, data
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                        $16, $17, $18, $19, $20, $21
                    )
                """,
                    assessment.created_at, assessment.assessment_id,
                    assessment.plot_id, assessment.policy_id, assessment.farmer_address,
                    assessment.assessment_start, assessment.assessment_end,
                    assessment.damage_scores.composite_damage_score,
                    assessment.damage_scores.damage_percentage,
                    assessment.damage_scores.payable_damage_percentage,
                    assessment.damage_type.value, assessment.damage_severity,
                    assessment.payout_trigger.is_triggered,
                    assessment.payout_trigger.payout_amount_usdc,
                    assessment.payout_trigger.actual_payout_usdc,
                    assessment.confidence_score, assessment.status.value,
                    assessment.oracle_submission_required,
                    assessment.ipfs_cid, assessment.processor_version,
                    json.dumps(assessment.dict()),
                )
                
        except Exception as e:
            self.logger.error(f"Error storing damage assessment: {e}", exc_info=True)
            raise
    
    async def get_damage_assessments(
        self,
        plot_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Retrieve damage assessments with optional filters."""
        try:
            async with self.pool.acquire() as conn:
                query = "SELECT * FROM damage_assessments WHERE 1=1"
                params = []
                
                if plot_id:
                    params.append(plot_id)
                    query += f" AND plot_id = ${len(params)}"
                
                if status:
                    params.append(status)
                    query += f" AND status = ${len(params)}"
                
                query += f" ORDER BY time DESC LIMIT ${len(params) + 1}"
                params.append(limit)
                
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
                
        except Exception as e:
            self.logger.error(f"Error retrieving damage assessments: {e}", exc_info=True)
            raise
    
    async def get_baseline_ndvi(
        self,
        plot_id: str,
        reference_date: datetime,
        lookback_days: int = 365,
    ) -> Optional[float]:
        """Calculate baseline NDVI from historical data."""
        try:
            start_date = reference_date - timedelta(days=lookback_days)
            
            async with self.pool.acquire() as conn:
                result = await conn.fetchval("""
                    SELECT AVG(ndvi_mean) as baseline_ndvi
                    FROM satellite_images
                    WHERE plot_id = $1
                    AND time >= $2
                    AND time < $3
                    AND is_valid_for_assessment = TRUE
                    AND ndvi_mean IS NOT NULL
                """, plot_id, start_date, reference_date)
                
                return float(result) if result else None
                
        except Exception as e:
            self.logger.error(f"Error calculating baseline NDVI: {e}", exc_info=True)
            return None
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a custom query."""
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, *args)
                return [dict(row) for row in rows]
        except Exception as e:
            self.logger.error(f"Error executing query: {e}", exc_info=True)
            raise


# Singleton instance
_timescale_client: Optional[TimescaleClient] = None


async def get_timescale_client() -> TimescaleClient:
    """Get or create singleton TimescaleClient instance."""
    global _timescale_client
    
    if _timescale_client is None:
        _timescale_client = TimescaleClient()
        await _timescale_client.connect()
    
    return _timescale_client
