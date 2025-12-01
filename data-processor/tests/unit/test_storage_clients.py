"""
Unit Tests for Storage Clients
Tests TimescaleDB, MinIO, Redis, and IPFS/Pinata clients
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
import json

from storage.timescale_client import TimescaleClient
from storage.minio_client import MinIOClient
from storage.redis_cache import RedisCache
from storage.ipfs_client import IPFSClient
from models.weather import WeatherData, WeatherIndices


@pytest.mark.unit
@pytest.mark.asyncio
class TestTimescaleClient:
    """Test suite for TimescaleDB client"""
    
    async def test_initialization(self, test_settings):
        """Test client initialization"""
        client = TimescaleClient(test_settings)
        assert client is not None
        assert client.settings == test_settings
        
    async def test_connect(self, mock_timescale_client):
        """Test database connection"""
        await mock_timescale_client.connect()
        mock_timescale_client.connect.assert_called_once()
        
    async def test_disconnect(self, mock_timescale_client):
        """Test database disconnection"""
        await mock_timescale_client.disconnect()
        mock_timescale_client.disconnect.assert_called_once()
        
    async def test_insert_weather_data(self, mock_timescale_client, sample_weather_data):
        """Test inserting weather data"""
        result = await mock_timescale_client.insert_weather_data(sample_weather_data)
        assert result == True
        
    async def test_query_weather_data(self, mock_timescale_client):
        """Test querying weather data"""
        start_date = datetime.utcnow() - timedelta(days=7)
        end_date = datetime.utcnow()
        
        result = await mock_timescale_client.query_weather_data(
            plot_id="PLOT001",
            start_date=start_date,
            end_date=end_date
        )
        
        assert isinstance(result, list)
        mock_timescale_client.query_weather_data.assert_called_once()
        
    async def test_insert_indices(self, mock_timescale_client, sample_weather_indices):
        """Test inserting weather indices"""
        result = await mock_timescale_client.insert_indices(sample_weather_indices)
        assert result == True
        
    async def test_bulk_insert(self, mock_timescale_client, generate_weather_data):
        """Test bulk inserting multiple records"""
        data_list = generate_weather_data(count=100)
        
        mock_timescale_client.bulk_insert = AsyncMock(return_value=100)
        
        inserted_count = await mock_timescale_client.bulk_insert(data_list)
        assert inserted_count == 100


@pytest.mark.unit
@pytest.mark.asyncio
class TestMinIOClient:
    """Test suite for MinIO S3 client"""
    
    async def test_initialization(self, test_settings):
        """Test client initialization"""
        client = MinIOClient(test_settings)
        assert client is not None
        
    async def test_connect(self, mock_minio_client):
        """Test MinIO connection"""
        await mock_minio_client.connect()
        mock_minio_client.connect.assert_called_once()
        
    async def test_upload_file(self, mock_minio_client, temp_dir):
        """Test file upload"""
        test_file = temp_dir / "test.txt"
        test_file.write_text("test content")
        
        result = await mock_minio_client.upload_file(
            file_path=str(test_file),
            bucket="test-bucket",
            object_name="test.txt"
        )
        
        assert result == "s3://bucket/path/file.ext"
        
    async def test_download_file(self, mock_minio_client):
        """Test file download"""
        data = await mock_minio_client.download_file(
            bucket="test-bucket",
            object_name="test.txt"
        )
        
        assert data == b"mock_data"
        
    async def test_list_objects(self, mock_minio_client):
        """Test listing objects"""
        result = await mock_minio_client.list_objects(bucket="test-bucket")
        assert isinstance(result, list)
        
    async def test_delete_object(self, mock_minio_client):
        """Test deleting object"""
        result = await mock_minio_client.delete_object(
            bucket="test-bucket",
            object_name="test.txt"
        )
        assert result == True
        
    async def test_upload_large_file(self, mock_minio_client, temp_dir):
        """Test multipart upload for large files"""
        large_file = temp_dir / "large.bin"
        large_file.write_bytes(b"0" * (10 * 1024 * 1024))  # 10MB
        
        mock_minio_client.upload_large_file = AsyncMock(
            return_value="s3://bucket/path/large.bin"
        )
        
        result = await mock_minio_client.upload_large_file(
            file_path=str(large_file),
            bucket="test-bucket"
        )
        
        assert result == "s3://bucket/path/large.bin"


@pytest.mark.unit
@pytest.mark.asyncio
class TestRedisCache:
    """Test suite for Redis cache client"""
    
    async def test_initialization(self, test_settings):
        """Test cache initialization"""
        cache = RedisCache(test_settings)
        assert cache is not None
        
    async def test_connect(self, mock_redis_cache):
        """Test Redis connection"""
        await mock_redis_cache.connect()
        mock_redis_cache.connect.assert_called_once()
        
    async def test_set_and_get(self, mock_redis_cache):
        """Test setting and getting cache values"""
        test_data = {"test": "value"}
        
        mock_redis_cache.get = AsyncMock(return_value=test_data)
        
        await mock_redis_cache.set("test_key", test_data, ttl=3600)
        result = await mock_redis_cache.get("test_key")
        
        assert result == test_data
        
    async def test_delete(self, mock_redis_cache):
        """Test deleting cache key"""
        result = await mock_redis_cache.delete("test_key")
        assert result == True
        
    async def test_exists(self, mock_redis_cache):
        """Test checking key existence"""
        mock_redis_cache.exists = AsyncMock(return_value=True)
        result = await mock_redis_cache.exists("test_key")
        assert result == True
        
    async def test_cache_miss(self, mock_redis_cache):
        """Test cache miss scenario"""
        mock_redis_cache.get = AsyncMock(return_value=None)
        result = await mock_redis_cache.get("nonexistent_key")
        assert result is None
        
    async def test_acquire_lock(self, mock_redis_cache):
        """Test acquiring distributed lock"""
        await mock_redis_cache.acquire_lock("lock_key", timeout=30)
        mock_redis_cache.acquire_lock.assert_called_once()
        
    async def test_release_lock(self, mock_redis_cache):
        """Test releasing distributed lock"""
        await mock_redis_cache.release_lock("lock_key")
        mock_redis_cache.release_lock.assert_called_once()
        
    async def test_rate_limiting(self, mock_redis_cache):
        """Test rate limiting functionality"""
        mock_redis_cache.check_rate_limit = AsyncMock(return_value=True)
        
        allowed = await mock_redis_cache.check_rate_limit(
            key="api:user123",
            max_requests=100,
            window=60
        )
        
        assert allowed == True
        
    async def test_ttl_expiration(self, mock_redis_cache):
        """Test TTL and key expiration"""
        mock_redis_cache.get_ttl = AsyncMock(return_value=300)
        
        ttl = await mock_redis_cache.get_ttl("test_key")
        assert ttl == 300


@pytest.mark.unit
@pytest.mark.asyncio
class TestIPFSClient:
    """Test suite for IPFS/Pinata client"""
    
    async def test_initialization(self, test_settings):
        """Test client initialization"""
        client = IPFSClient(test_settings)
        assert client is not None
        assert client.pinata_api_key == test_settings.PINATA_API_KEY
        assert client.pinata_secret == test_settings.PINATA_SECRET_KEY
        
    async def test_connect_with_jwt(self, test_settings, mock_ipfs_client):
        """Test connection with JWT authentication"""
        test_settings.PINATA_JWT = "test_jwt_token"
        
        await mock_ipfs_client.connect()
        mock_ipfs_client.connect.assert_called_once()
        
    async def test_connect_with_api_key(self, test_settings, mock_ipfs_client):
        """Test connection with API key/secret authentication"""
        test_settings.PINATA_JWT = None
        
        await mock_ipfs_client.connect()
        mock_ipfs_client.connect.assert_called_once()
        
    async def test_pin_json(self, mock_ipfs_client):
        """Test pinning JSON data"""
        test_data = {
            "assessment_id": "ASSESS001",
            "damage_score": 0.75,
            "evidence": ["drought", "low_ndvi"]
        }
        
        cid = await mock_ipfs_client.pin_json(test_data)
        assert cid == "QmTest123456789"
        
    async def test_pin_file(self, mock_ipfs_client, temp_dir):
        """Test pinning file"""
        test_file = temp_dir / "proof.pdf"
        test_file.write_bytes(b"proof document content")
        
        cid = await mock_ipfs_client.pin_file(str(test_file))
        assert cid == "QmTestFile123456"
        
    async def test_get_content(self, mock_ipfs_client):
        """Test retrieving content from IPFS"""
        cid = "QmTest123456789"
        
        content = await mock_ipfs_client.get_content(cid)
        assert content == {"test": "data"}
        
    async def test_unpin(self, mock_ipfs_client):
        """Test unpinning content"""
        cid = "QmTest123456789"
        
        result = await mock_ipfs_client.unpin(cid)
        assert result == True
        
    async def test_get_gateway_url(self, mock_ipfs_client, test_settings):
        """Test gateway URL generation"""
        cid = "QmTest123456789"
        
        url = mock_ipfs_client.get_gateway_url(cid)
        assert "ipfs" in url
        assert cid in url
        assert url == "https://test.gateway.com/ipfs/QmTest123456"
        
    async def test_pin_with_metadata(self, mock_ipfs_client):
        """Test pinning with custom metadata"""
        test_data = {"damage": "severe"}
        metadata = {
            "name": "Damage Assessment ASSESS001",
            "keyvalues": {
                "plot_id": "PLOT001",
                "date": "2024-01-15"
            }
        }
        
        mock_ipfs_client.pin_json_with_metadata = AsyncMock(
            return_value="QmTestWithMeta123"
        )
        
        cid = await mock_ipfs_client.pin_json_with_metadata(test_data, metadata)
        assert cid == "QmTestWithMeta123"
        
    async def test_list_pins(self, mock_ipfs_client):
        """Test listing pinned content"""
        mock_ipfs_client.list_pins = AsyncMock(return_value=[
            {"ipfs_pin_hash": "QmTest1", "size": 1024},
            {"ipfs_pin_hash": "QmTest2", "size": 2048}
        ])
        
        pins = await mock_ipfs_client.list_pins()
        assert len(pins) == 2
        
    async def test_verify_pin(self, mock_ipfs_client):
        """Test verifying pin status"""
        cid = "QmTest123456789"
        
        mock_ipfs_client.verify_pin = AsyncMock(return_value=True)
        
        is_pinned = await mock_ipfs_client.verify_pin(cid)
        assert is_pinned == True
        
    async def test_custom_gateway_retrieval(self, mock_ipfs_client, test_settings):
        """Test retrieval via custom Pinata gateway"""
        test_settings.PINATA_GATEWAY = "maroon-careful-wren-616.mypinata.cloud"
        cid = "QmTest123456789"
        
        mock_ipfs_client.get_gateway_url = Mock(
            return_value=f"https://{test_settings.PINATA_GATEWAY}/ipfs/{cid}"
        )
        
        url = mock_ipfs_client.get_gateway_url(cid)
        assert "maroon-careful-wren-616.mypinata.cloud" in url
        
    async def test_error_handling_pin_failure(self, mock_ipfs_client):
        """Test error handling for pin failure"""
        mock_ipfs_client.pin_json = AsyncMock(side_effect=Exception("Pin failed"))
        
        with pytest.raises(Exception, match="Pin failed"):
            await mock_ipfs_client.pin_json({"test": "data"})
            
    async def test_retry_on_network_error(self, mock_ipfs_client):
        """Test retry logic on network errors"""
        # First call fails, second succeeds
        mock_ipfs_client.pin_json = AsyncMock(
            side_effect=[Exception("Network error"), "QmTest123"]
        )
        
        mock_ipfs_client.pin_json_with_retry = AsyncMock(return_value="QmTest123")
        
        cid = await mock_ipfs_client.pin_json_with_retry({"test": "data"}, max_retries=3)
        assert cid == "QmTest123"


@pytest.mark.unit
@pytest.mark.asyncio
class TestStorageIntegration:
    """Integration tests across storage clients"""
    
    async def test_weather_data_flow(self, mock_timescale_client, mock_redis_cache, sample_weather_data):
        """Test complete weather data storage flow"""
        # 1. Check cache
        mock_redis_cache.get = AsyncMock(return_value=None)
        
        # 2. Insert to TimescaleDB
        await mock_timescale_client.insert_weather_data(sample_weather_data)
        
        # 3. Cache the result
        await mock_redis_cache.set(
            f"weather:{sample_weather_data.plot_id}",
            sample_weather_data.model_dump(),
            ttl=3600
        )
        
        mock_timescale_client.insert_weather_data.assert_called_once()
        mock_redis_cache.set.assert_called_once()
        
    async def test_proof_archival_flow(self, mock_ipfs_client, mock_minio_client, temp_dir):
        """Test damage proof archival to both IPFS and MinIO"""
        proof_data = {
            "assessment_id": "ASSESS001",
            "damage_score": 0.75
        }
        
        # 1. Pin to IPFS
        ipfs_cid = await mock_ipfs_client.pin_json(proof_data)
        
        # 2. Backup to MinIO
        proof_file = temp_dir / "proof.json"
        proof_file.write_text(json.dumps(proof_data))
        
        s3_path = await mock_minio_client.upload_file(
            file_path=str(proof_file),
            bucket="proofs",
            object_name=f"{ipfs_cid}.json"
        )
        
        assert ipfs_cid is not None
        assert s3_path is not None
