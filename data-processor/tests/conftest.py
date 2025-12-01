"""
Pytest Configuration and Shared Fixtures
Provides reusable test fixtures for all test modules
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, MagicMock
from typing import Dict, Any, List
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from config.settings import Settings
from models.weather import WeatherData, WeatherIndices
from models.satellite import SatelliteImage, VegetationIndices
from models.damage import DamageAssessment, PayoutDecision


# ============================================================================
# Event Loop Configuration
# ============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ============================================================================
# Configuration Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def test_settings():
    """Test-specific settings"""
    # Application
    os.environ["ENVIRONMENT"] = "test"
    os.environ["LOG_LEVEL"] = "DEBUG"
    
    # Database
    os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_microcrop"
    os.environ["TIMESCALE_URL"] = "postgresql://test:test@localhost:5432/test_timescale"
    os.environ["REDIS_URL"] = "redis://localhost:6379/1"
    os.environ["KAFKA_BOOTSTRAP_SERVERS"] = "localhost:9092"
    
    # Object Storage
    os.environ["MINIO_ENDPOINT"] = "localhost:9000"
    os.environ["MINIO_ACCESS_KEY"] = "test_access_key"
    os.environ["MINIO_SECRET_KEY"] = "test_secret_key"
    
    # IPFS/Pinata
    os.environ["API_KEY"] = "test_pinata_key"
    os.environ["API_SECRET"] = "test_pinata_secret"
    os.environ["PINATA_JWT"] = "test_jwt_token"
    os.environ["PINATA_GATEWAY"] = "test.gateway.com"
    
    # API Keys
    os.environ["WEATHERXM_API_KEY"] = "test_weatherxm_key"
    os.environ["SPEXI_API_KEY"] = "test_spexi_key"
    
    # Blockchain
    os.environ["BLOCKCHAIN_RPC_URL"] = "https://test-rpc.example.com"
    os.environ["ORACLE_PRIVATE_KEY"] = "0x" + "1" * 64
    os.environ["ORACLE_ADDRESS"] = "0x" + "a" * 40
    os.environ["WEATHER_ORACLE_CONTRACT"] = "0x" + "b" * 40
    os.environ["SATELLITE_ORACLE_CONTRACT"] = "0x" + "c" * 40
    os.environ["DAMAGE_CALCULATOR_CONTRACT"] = "0x" + "d" * 40
    
    return Settings()


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_weather_data():
    """Sample weather data for testing"""
    return WeatherData(
        plot_id="PLOT001",
        station_id="STATION001",
        timestamp=datetime.utcnow(),
        temperature=25.5,
        humidity=65.0,
        precipitation=2.5,
        wind_speed=3.2,
        wind_direction=180,
        pressure=1013.25,
        solar_radiation=850.0,
        soil_moisture=0.35,
        soil_temperature=22.0,
        data_quality=0.95
    )


@pytest.fixture
def sample_weather_indices():
    """Sample weather indices for testing"""
    return WeatherIndices(
        plot_id="PLOT001",
        date=datetime.utcnow().date(),
        drought_index=0.25,
        flood_index=0.15,
        heat_stress_index=0.10,
        composite_score=0.17,
        confidence=0.92,
        anomaly_flags=["low_soil_moisture"]
    )


@pytest.fixture
def sample_satellite_image():
    """Sample satellite image metadata for testing"""
    return SatelliteImage(
        plot_id="PLOT001",
        image_id="IMG001",
        capture_date=datetime.utcnow(),
        cloud_cover=5.0,
        resolution=3.0,
        bands=["red", "nir", "blue", "green"],
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
        storage_path="s3://bucket/path/to/image.tif",
        processing_status="completed"
    )


@pytest.fixture
def sample_vegetation_indices():
    """Sample vegetation indices for testing"""
    return VegetationIndices(
        plot_id="PLOT001",
        date=datetime.utcnow().date(),
        ndvi=0.75,
        evi=0.65,
        savi=0.70,
        lai=4.5,
        baseline_ndvi=0.80,
        ndvi_deviation=-0.05,
        health_status="healthy"
    )


@pytest.fixture
def sample_damage_assessment():
    """Sample damage assessment for testing"""
    return DamageAssessment(
        assessment_id="ASSESS001",
        plot_id="PLOT001",
        policy_id="POLICY001",
        assessment_date=datetime.utcnow(),
        weather_score=0.25,
        satellite_score=0.15,
        composite_score=0.20,
        confidence=0.90,
        growth_stage="flowering",
        trigger_threshold=0.30,
        payout_triggered=False,
        ipfs_cid=None,
        evidence_summary={"weather": "moderate_drought", "satellite": "slight_stress"}
    )


@pytest.fixture
def sample_payout_decision():
    """Sample payout decision for testing"""
    return PayoutDecision(
        decision_id="PAYOUT001",
        assessment_id="ASSESS001",
        plot_id="PLOT001",
        policy_id="POLICY001",
        decision_date=datetime.utcnow(),
        payout_triggered=True,
        payout_percentage=45.0,
        payout_amount=450.0,
        confidence=0.92,
        ipfs_proof_cid="QmTest123456",
        blockchain_tx_hash=None,
        status="pending"
    )


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_timescale_client():
    """Mock TimescaleDB client"""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.insert_weather_data = AsyncMock(return_value=True)
    client.query_weather_data = AsyncMock(return_value=[])
    client.insert_indices = AsyncMock(return_value=True)
    return client


@pytest.fixture
def mock_redis_cache():
    """Mock Redis cache client"""
    cache = AsyncMock()
    cache.connect = AsyncMock()
    cache.disconnect = AsyncMock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock(return_value=True)
    cache.delete = AsyncMock(return_value=True)
    cache.exists = AsyncMock(return_value=False)
    cache.acquire_lock = AsyncMock()
    cache.release_lock = AsyncMock()
    return cache


@pytest.fixture
def mock_minio_client():
    """Mock MinIO S3 client"""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.upload_file = AsyncMock(return_value="s3://bucket/path/file.ext")
    client.download_file = AsyncMock(return_value=b"mock_data")
    client.list_objects = AsyncMock(return_value=[])
    client.delete_object = AsyncMock(return_value=True)
    return client


@pytest.fixture
def mock_ipfs_client():
    """Mock IPFS/Pinata client"""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.pin_json = AsyncMock(return_value="QmTest123456789")
    client.pin_file = AsyncMock(return_value="QmTestFile123456")
    client.get_content = AsyncMock(return_value={"test": "data"})
    client.unpin = AsyncMock(return_value=True)
    client.get_gateway_url = Mock(return_value="https://test.gateway.com/ipfs/QmTest123456")
    return client


@pytest.fixture
def mock_weatherxm_client():
    """Mock WeatherXM API client"""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.get_station_data = AsyncMock(return_value={
        "temperature": 25.5,
        "humidity": 65.0,
        "precipitation": 2.5,
        "wind_speed": 3.2,
        "pressure": 1013.25
    })
    client.get_historical_data = AsyncMock(return_value=[])
    return client


@pytest.fixture
def mock_spexi_client():
    """Mock Spexi satellite API client"""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.order_image = AsyncMock(return_value={
        "order_id": "ORDER001",
        "status": "pending",
        "estimated_delivery": datetime.utcnow() + timedelta(days=3)
    })
    client.check_order_status = AsyncMock(return_value={
        "order_id": "ORDER001",
        "status": "completed",
        "download_url": "https://example.com/image.tif"
    })
    client.download_image = AsyncMock(return_value=b"mock_image_data")
    return client


# ============================================================================
# Processor Fixtures
# ============================================================================

@pytest.fixture
def weather_processor(test_settings, mock_timescale_client, mock_redis_cache):
    """Weather processor with mocked dependencies"""
    from processors.weather_processor import WeatherProcessor
    processor = WeatherProcessor(test_settings)
    processor.db_client = mock_timescale_client
    processor.cache = mock_redis_cache
    return processor


@pytest.fixture
def satellite_processor(test_settings, mock_timescale_client, mock_minio_client):
    """Satellite processor with mocked dependencies"""
    from processors.satellite_processor import SatelliteProcessor
    processor = SatelliteProcessor(test_settings)
    processor.db_client = mock_timescale_client
    processor.storage = mock_minio_client
    return processor


@pytest.fixture
def damage_calculator(test_settings, mock_timescale_client, mock_ipfs_client):
    """Damage calculator with mocked dependencies"""
    from processors.damage_calculator import DamageCalculator
    calculator = DamageCalculator(test_settings)
    calculator.db_client = mock_timescale_client
    calculator.ipfs_client = mock_ipfs_client
    return calculator


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture
async def clean_database(mock_timescale_client):
    """Clean database before and after tests"""
    # Setup: clear data
    await mock_timescale_client.connect()
    yield
    # Teardown: clear data
    await mock_timescale_client.disconnect()


# ============================================================================
# Test Data Generators
# ============================================================================

@pytest.fixture
def generate_weather_data():
    """Factory for generating weather data"""
    def _generate(count: int = 1, plot_id: str = "PLOT001") -> List[WeatherData]:
        base_time = datetime.utcnow()
        return [
            WeatherData(
                plot_id=plot_id,
                station_id=f"STATION{i:03d}",
                timestamp=base_time - timedelta(hours=i),
                temperature=20 + (i % 10),
                humidity=50 + (i % 30),
                precipitation=i % 5,
                wind_speed=2 + (i % 5),
                wind_direction=i * 30 % 360,
                pressure=1010 + (i % 10),
                solar_radiation=800 + (i % 200),
                soil_moisture=0.3 + (i % 10) * 0.01,
                soil_temperature=18 + (i % 8),
                data_quality=0.9 + (i % 10) * 0.01
            )
            for i in range(count)
        ]
    return _generate


@pytest.fixture
def generate_satellite_images():
    """Factory for generating satellite image metadata"""
    def _generate(count: int = 1, plot_id: str = "PLOT001") -> List[SatelliteImage]:
        base_time = datetime.utcnow()
        return [
            SatelliteImage(
                plot_id=plot_id,
                image_id=f"IMG{i:03d}",
                capture_date=base_time - timedelta(days=i * 7),
                cloud_cover=i % 20,
                resolution=3.0,
                bands=["red", "nir", "blue", "green"],
                geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
                storage_path=f"s3://bucket/path/image_{i}.tif",
                processing_status="completed"
            )
            for i in range(count)
        ]
    return _generate


# ============================================================================
# Utility Fixtures
# ============================================================================

@pytest.fixture
def temp_dir(tmp_path):
    """Temporary directory for test files"""
    return tmp_path


@pytest.fixture
def mock_logger():
    """Mock logger to suppress logs in tests"""
    logger = Mock()
    logger.info = Mock()
    logger.warning = Mock()
    logger.error = Mock()
    logger.debug = Mock()
    return logger


# ============================================================================
# Cleanup
# ============================================================================

@pytest.fixture(autouse=True)
def cleanup_env():
    """Clean up environment after each test"""
    yield
    # Reset any modified environment variables
    pass


# ============================================================================
# Session Fixtures
# ============================================================================

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment once per session"""
    print("\n" + "=" * 80)
    print("Starting MicroCrop Data Processor Test Suite")
    print("=" * 80)
    yield
    print("\n" + "=" * 80)
    print("Test Suite Complete")
    print("=" * 80)
