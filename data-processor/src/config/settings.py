"""
MicroCrop Data Processor Settings

Production-grade configuration management with:
- Pydantic validation
- Environment variable support
- Type safety
- Default values
- Secret management
"""

import os
from typing import Dict, List, Optional
from functools import lru_cache
from pydantic import Field, field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with validation and environment variable support"""
    
    # ============ Application ============
    APP_NAME: str = "MicroCrop Data Processor"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")
    DEBUG: bool = Field(False, env="DEBUG")
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")
    
    # ============ Database ============
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    TIMESCALE_URL: str = Field(..., env="TIMESCALE_URL")
    DB_POOL_SIZE: int = Field(20, env="DB_POOL_SIZE")
    DB_MAX_OVERFLOW: int = Field(40, env="DB_MAX_OVERFLOW")
    DB_POOL_TIMEOUT: int = Field(30, env="DB_POOL_TIMEOUT")
    DB_ECHO: bool = Field(False, env="DB_ECHO")
    
    # ============ Redis Cache ============
    REDIS_URL: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    REDIS_MAX_CONNECTIONS: int = Field(50, env="REDIS_MAX_CONNECTIONS")
    REDIS_SOCKET_TIMEOUT: int = Field(5, env="REDIS_SOCKET_TIMEOUT")
    CACHE_TTL: int = Field(3600, env="CACHE_TTL")  # 1 hour default
    CACHE_WEATHER_TTL: int = Field(600, env="CACHE_WEATHER_TTL")  # 10 minutes
    CACHE_SATELLITE_TTL: int = Field(86400, env="CACHE_SATELLITE_TTL")  # 24 hours
    
    # ============ Kafka Streaming (DEPRECATED - Kept for backward compatibility) ============
    # NOTE: Kafka removed in favor of simpler HTTP API + WebSocket architecture
    # Uncomment if you need event streaming at scale
    # KAFKA_BOOTSTRAP_SERVERS: str = Field("localhost:9092", env="KAFKA_BOOTSTRAP_SERVERS")
    # KAFKA_CONSUMER_GROUP: str = Field("microcrop-processor", env="KAFKA_CONSUMER_GROUP")
    
    # ============ MinIO Object Storage (DEPRECATED) ============
    # NOTE: MinIO removed - no longer storing satellite images locally
    # Planet Labs hosts all imagery, we only fetch biomass CSVs
    # MINIO_ENDPOINT: str = Field("localhost:9000", env="MINIO_ENDPOINT")
    
    # ============ WeatherXM Integration ============
    WEATHERXM_API_KEY: str = Field(..., env="WEATHERXM_API_KEY")
    WEATHERXM_API_URL: str = Field("https://api.weatherxm.com/v1", env="WEATHERXM_API_URL")
    WEATHERXM_RATE_LIMIT: int = Field(100, env="WEATHERXM_RATE_LIMIT")  # requests/minute
    WEATHERXM_TIMEOUT: int = Field(30, env="WEATHERXM_TIMEOUT")
    WEATHERXM_RETRY_ATTEMPTS: int = Field(3, env="WEATHERXM_RETRY_ATTEMPTS")
    WEATHERXM_BATCH_SIZE: int = Field(50, env="WEATHERXM_BATCH_SIZE")
    
    # ============ Planet Labs Integration (NEW) ============
    PLANET_API_KEY: str = Field(..., env="PLANET_API_KEY")
    PLANET_API_URL: str = Field("https://api.planet.com/data/v1", env="PLANET_API_URL")
    PLANET_SUBSCRIPTIONS_URL: str = Field("https://api.planet.com/subscriptions/v1", env="PLANET_SUBSCRIPTIONS_URL")
    PLANET_TIMEOUT: int = Field(60, env="PLANET_TIMEOUT")
    PLANET_RETRY_ATTEMPTS: int = Field(3, env="PLANET_RETRY_ATTEMPTS")
    PLANET_BIOMASS_PRODUCT: str = Field("BIOMASS-PROXY_V4.0_10", env="PLANET_BIOMASS_PRODUCT")
    
    # Google Cloud Storage for Planet data delivery
    GCS_BUCKET_NAME: str = Field(..., env="GCS_BUCKET_NAME")
    GCS_CREDENTIALS: str = Field(..., env="GCS_CREDENTIALS")
    
    # ============ Weather Processing Parameters ============
    WEATHER_STATION_RADIUS_KM: float = Field(50.0, env="WEATHER_STATION_RADIUS_KM")
    WEATHER_MIN_STATIONS: int = Field(1, env="WEATHER_MIN_STATIONS")
    WEATHER_INTERPOLATION_METHOD: str = Field("idw", env="WEATHER_INTERPOLATION_METHOD")  # inverse distance weighting
    
    # Drought parameters
    DROUGHT_THRESHOLD_MM: float = Field(20.0, env="DROUGHT_THRESHOLD_MM")  # mm per day
    DROUGHT_DRY_DAY_THRESHOLD: float = Field(1.0, env="DROUGHT_DRY_DAY_THRESHOLD")  # mm
    DROUGHT_SEVERE_DAYS: int = Field(14, env="DROUGHT_SEVERE_DAYS")  # consecutive days
    
    # Flood parameters
    FLOOD_THRESHOLD_MM: float = Field(150.0, env="FLOOD_THRESHOLD_MM")  # daily rainfall
    FLOOD_SEVERE_MM: float = Field(200.0, env="FLOOD_SEVERE_MM")
    FLOOD_EXTREME_MM: float = Field(300.0, env="FLOOD_EXTREME_MM")
    FLOOD_CUMULATIVE_3DAY: float = Field(200.0, env="FLOOD_CUMULATIVE_3DAY")
    
    # Heat stress parameters
    HEAT_THRESHOLD_CELSIUS: float = Field(35.0, env="HEAT_THRESHOLD_CELSIUS")
    HEAT_SEVERE_CELSIUS: float = Field(40.0, env="HEAT_SEVERE_CELSIUS")
    HEAT_NIGHT_MIN_CELSIUS: float = Field(25.0, env="HEAT_NIGHT_MIN_CELSIUS")
    HEAT_DEGREE_DAYS_SEVERE: float = Field(50.0, env="HEAT_DEGREE_DAYS_SEVERE")
    
    # ============ Biomass Processing Parameters (NEW) ============
    # Planet Labs Crop Biomass thresholds
    BIOMASS_BASELINE_WINDOW_DAYS: int = Field(30, env="BIOMASS_BASELINE_WINDOW_DAYS")
    BIOMASS_MIN_OBSERVATIONS: int = Field(3, env="BIOMASS_MIN_OBSERVATIONS")
    BIOMASS_HEALTHY_THRESHOLD: float = Field(0.65, env="BIOMASS_HEALTHY_THRESHOLD")
    BIOMASS_MODERATE_STRESS: float = Field(0.50, env="BIOMASS_MODERATE_STRESS")
    BIOMASS_SEVERE_STRESS: float = Field(0.35, env="BIOMASS_SEVERE_STRESS")
    BIOMASS_MAX_CLOUD_COVER: float = Field(0.3, env="BIOMASS_MAX_CLOUD_COVER")  # 30%
    
    # ============ Damage Assessment Parameters (MOVED TO CRE) ============
    # NOTE: Damage calculation now happens in Chainlink CRE workflow
    # These values kept for reference and historical data analysis only
    DAMAGE_WEATHER_WEIGHT: float = Field(0.6, env="DAMAGE_WEATHER_WEIGHT")  # Reference only
    DAMAGE_BIOMASS_WEIGHT: float = Field(0.4, env="DAMAGE_BIOMASS_WEIGHT")  # Reference only
    DAMAGE_ASSESSMENT_WINDOW_DAYS: int = Field(30, env="DAMAGE_ASSESSMENT_WINDOW_DAYS")
    
    # ============ Celery Configuration ============
    CELERY_BROKER_URL: str = Field("redis://localhost:6379/1", env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field("redis://localhost:6379/2", env="CELERY_RESULT_BACKEND")
    CELERY_TASK_TIME_LIMIT: int = Field(300, env="CELERY_TASK_TIME_LIMIT")  # 5 minutes
    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(240, env="CELERY_TASK_SOFT_TIME_LIMIT")
    CELERY_WORKER_CONCURRENCY: int = Field(4, env="CELERY_WORKER_CONCURRENCY")
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = Field(4, env="CELERY_WORKER_PREFETCH_MULTIPLIER")
    CELERY_TASK_ACKS_LATE: bool = Field(True, env="CELERY_TASK_ACKS_LATE")
    CELERY_TASK_REJECT_ON_WORKER_LOST: bool = Field(True, env="CELERY_TASK_REJECT_ON_WORKER_LOST")
    
    # ============ Blockchain Integration (DEPRECATED) ============
    # NOTE: Backend no longer submits to blockchain directly
    # Chainlink CRE workflow handles all on-chain interactions
    # Keeping for read-only queries only
    BLOCKCHAIN_RPC_URL: str = Field("https://mainnet.base.org", env="BLOCKCHAIN_RPC_URL")
    BLOCKCHAIN_CHAIN_ID: int = Field(8453, env="BLOCKCHAIN_CHAIN_ID")  # Base mainnet
    
    # Contract addresses (read-only)
    POLICY_MANAGER_CONTRACT: Optional[str] = Field(None, env="POLICY_MANAGER_CONTRACT")
    TREASURY_CONTRACT: Optional[str] = Field(None, env="TREASURY_CONTRACT")
    
    # ============ IPFS Storage ============
    IPFS_API_URL: str = Field("https://ipfs.infura.io:5001", env="IPFS_API_URL")
    IPFS_GATEWAY_URL: str = Field("https://ipfs.io/ipfs/", env="IPFS_GATEWAY_URL")
    PINATA_API_KEY: str = Field(..., env="API_KEY")  # Using API_KEY from .env
    PINATA_SECRET_KEY: str = Field(..., env="API_SECRET")  # Using API_SECRET from .env
    PINATA_JWT: Optional[str] = Field(None, env="PINATA_JWT")
    PINATA_GATEWAY: str = Field("gateway.pinata.cloud", env="PINATA_GATEWAY")  # Custom gateway
    
    # ============ API Configuration ============
    API_HOST: str = Field("0.0.0.0", env="API_HOST")
    API_PORT: int = Field(8000, env="API_PORT")
    API_WORKERS: int = Field(4, env="API_WORKERS")
    API_RELOAD: bool = Field(False, env="API_RELOAD")
    API_CORS_ORIGINS: List[str] = Field(["*"], env="API_CORS_ORIGINS")
    
    # Backend API Authentication (NEW - for CRE workflow)
    BACKEND_API_TOKEN_SECRET: str = Field(..., env="BACKEND_API_TOKEN_SECRET")
    BACKEND_API_TOKEN_ALGORITHM: str = Field("HS256", env="BACKEND_API_TOKEN_ALGORITHM")
    BACKEND_API_TOKEN_EXPIRE_MINUTES: int = Field(60, env="BACKEND_API_TOKEN_EXPIRE_MINUTES")
    
    # ============ Monitoring & Observability ============
    SENTRY_DSN: Optional[str] = Field(None, env="SENTRY_DSN")
    PROMETHEUS_PORT: int = Field(9090, env="PROMETHEUS_PORT")
    METRICS_ENABLED: bool = Field(True, env="METRICS_ENABLED")
    TRACING_ENABLED: bool = Field(False, env="TRACING_ENABLED")
    
    # ============ Performance & Limits ============
    MAX_CONCURRENT_PLOTS: int = Field(1000, env="MAX_CONCURRENT_PLOTS")
    MAX_BATCH_SIZE: int = Field(100, env="MAX_BATCH_SIZE")
    RATE_LIMIT_REQUESTS: int = Field(1000, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW_SECONDS: int = Field(60, env="RATE_LIMIT_WINDOW_SECONDS")
    
    # Data retention
    WEATHER_DATA_RETENTION_DAYS: int = Field(730, env="WEATHER_DATA_RETENTION_DAYS")  # 2 years
    BIOMASS_DATA_RETENTION_DAYS: int = Field(1095, env="BIOMASS_DATA_RETENTION_DAYS")  # 3 years
    LOG_RETENTION_DAYS: int = Field(90, env="LOG_RETENTION_DAYS")
    
    @field_validator("DAMAGE_WEATHER_WEIGHT", "DAMAGE_BIOMASS_WEIGHT")
    @classmethod
    def validate_weights(cls, v):
        """Ensure weights are between 0 and 1"""
        if not 0 <= v <= 1:
            raise ValueError("Weights must be between 0 and 1")
        return v
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v):
        """Ensure environment is valid"""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v):
        """Ensure log level is valid"""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v not in allowed:
            raise ValueError(f"Log level must be one of: {allowed}")
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.ENVIRONMENT == "development"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "allow"  # Allow extra fields for forward compatibility
    }


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Uses LRU cache to avoid re-reading environment variables on every call.
    Cache is cleared on module reload.
    
    Returns:
        Settings: Validated settings instance
    """
    try:
        settings = Settings()
        logger.info(f"Settings loaded for environment: {settings.ENVIRONMENT}")
        return settings
    except Exception as e:
        logger.error(f"Failed to load settings: {e}")
        raise


def get_database_url(settings: Optional[Settings] = None) -> str:
    """Get database URL for SQLAlchemy"""
    if settings is None:
        settings = get_settings()
    return settings.DATABASE_URL


def get_timescale_url(settings: Optional[Settings] = None) -> str:
    """Get TimescaleDB URL for time-series data"""
    if settings is None:
        settings = get_settings()
    return settings.TIMESCALE_URL
