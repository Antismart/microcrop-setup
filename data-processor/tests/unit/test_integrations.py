"""
Unit Tests for API Integrations
Tests WeatherXM and Spexi clients with mocks (no real API access needed)
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
import httpx

from integrations.weatherxm_client import WeatherXMClient
from integrations.spexi_client import SpexiClient


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.mock
class TestWeatherXMClient:
    """Test suite for WeatherXM API client"""
    
    async def test_initialization(self, test_settings):
        """Test client initialization"""
        client = WeatherXMClient(test_settings)
        assert client is not None
        assert client.settings == test_settings
        
    async def test_connect(self, mock_weatherxm_client):
        """Test API connection"""
        await mock_weatherxm_client.connect()
        mock_weatherxm_client.connect.assert_called_once()
        
    async def test_get_station_data(self, mock_weatherxm_client):
        """Test fetching station data"""
        data = await mock_weatherxm_client.get_station_data(
            station_id="STATION001"
        )
        
        assert isinstance(data, dict)
        assert "temperature" in data
        assert "humidity" in data
        assert "precipitation" in data
        
    async def test_get_station_data_with_timestamp(self, mock_weatherxm_client):
        """Test fetching station data at specific timestamp"""
        timestamp = datetime.utcnow() - timedelta(hours=1)
        
        data = await mock_weatherxm_client.get_station_data(
            station_id="STATION001",
            timestamp=timestamp
        )
        
        assert data is not None
        assert "temperature" in data
        
    async def test_get_historical_data(self, mock_weatherxm_client):
        """Test fetching historical data"""
        start_date = datetime.utcnow() - timedelta(days=7)
        end_date = datetime.utcnow()
        
        data = await mock_weatherxm_client.get_historical_data(
            station_id="STATION001",
            start_date=start_date,
            end_date=end_date
        )
        
        assert isinstance(data, list)
        
    async def test_rate_limiting(self, test_settings):
        """Test rate limiting enforcement"""
        with patch('integrations.weatherxm_client.httpx.AsyncClient') as mock_client:
            client = WeatherXMClient(test_settings)
            
            # Mock rate limit response
            mock_response = Mock()
            mock_response.status_code = 429
            mock_response.headers = {"Retry-After": "60"}
            
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            
            # Should handle rate limit gracefully
            with pytest.raises(Exception, match="Rate limit"):
                await client.get_station_data("STATION001")
                
    async def test_retry_on_network_error(self, mock_weatherxm_client):
        """Test retry logic on network errors"""
        # First two calls fail, third succeeds
        mock_weatherxm_client.get_station_data = AsyncMock(
            side_effect=[
                httpx.NetworkError("Connection failed"),
                httpx.NetworkError("Connection failed"),
                {"temperature": 25.0}
            ]
        )
        
        # Should retry and eventually succeed
        mock_weatherxm_client.get_station_data_with_retry = AsyncMock(
            return_value={"temperature": 25.0}
        )
        
        data = await mock_weatherxm_client.get_station_data_with_retry(
            station_id="STATION001",
            max_retries=3
        )
        
        assert data["temperature"] == 25.0
        
    async def test_authentication_header(self, test_settings):
        """Test API authentication headers"""
        with patch('integrations.weatherxm_client.httpx.AsyncClient') as mock_client:
            client = WeatherXMClient(test_settings)
            client.api_key = "test_api_key"
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json = Mock(return_value={"temperature": 25.0})
            
            mock_get = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.get = mock_get
            
            await client.get_station_data("STATION001")
            
            # Verify authentication header was included
            assert mock_get.called
            
    async def test_invalid_station_id(self, test_settings):
        """Test handling of invalid station ID"""
        with patch('integrations.weatherxm_client.httpx.AsyncClient') as mock_client:
            client = WeatherXMClient(test_settings)
            
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = "Station not found"
            
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            
            with pytest.raises(Exception, match="not found"):
                await client.get_station_data("INVALID_STATION")
                
    async def test_data_validation(self, mock_weatherxm_client):
        """Test validation of received data"""
        # Mock incomplete data
        mock_weatherxm_client.get_station_data = AsyncMock(
            return_value={
                "temperature": 25.0,
                # Missing other required fields
            }
        )
        
        mock_weatherxm_client.validate_data = AsyncMock(return_value=False)
        
        is_valid = await mock_weatherxm_client.validate_data(
            {"temperature": 25.0}
        )
        
        assert is_valid == False
        
    async def test_batch_station_query(self, mock_weatherxm_client):
        """Test querying multiple stations in batch"""
        station_ids = ["STATION001", "STATION002", "STATION003"]
        
        mock_weatherxm_client.get_batch_station_data = AsyncMock(
            return_value={
                "STATION001": {"temperature": 25.0},
                "STATION002": {"temperature": 26.0},
                "STATION003": {"temperature": 24.5}
            }
        )
        
        data = await mock_weatherxm_client.get_batch_station_data(station_ids)
        
        assert len(data) == 3
        assert all(sid in data for sid in station_ids)


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.mock
class TestSpexiClient:
    """Test suite for Spexi satellite API client (all mocked - no real API access)"""
    
    async def test_initialization(self, test_settings):
        """Test client initialization"""
        client = SpexiClient(test_settings)
        assert client is not None
        assert client.settings == test_settings
        
    async def test_connect(self, mock_spexi_client):
        """Test API connection"""
        await mock_spexi_client.connect()
        mock_spexi_client.connect.assert_called_once()
        
    async def test_order_image(self, mock_spexi_client):
        """Test ordering satellite image"""
        order = await mock_spexi_client.order_image(
            plot_id="PLOT001",
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            capture_date=datetime.utcnow()
        )
        
        assert isinstance(order, dict)
        assert "order_id" in order
        assert "status" in order
        assert order["order_id"] == "ORDER001"
        
    async def test_check_order_status(self, mock_spexi_client):
        """Test checking order status"""
        status = await mock_spexi_client.check_order_status("ORDER001")
        
        assert isinstance(status, dict)
        assert "order_id" in status
        assert "status" in status
        assert status["status"] in ["pending", "processing", "completed", "failed"]
        
    async def test_download_image(self, mock_spexi_client):
        """Test downloading completed image"""
        image_data = await mock_spexi_client.download_image("ORDER001")
        
        assert image_data == b"mock_image_data"
        assert len(image_data) > 0
        
    async def test_order_workflow(self, mock_spexi_client):
        """Test complete order workflow (order -> check -> download)"""
        # Step 1: Order image
        order = await mock_spexi_client.order_image(
            plot_id="PLOT001",
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            capture_date=datetime.utcnow()
        )
        assert order["status"] == "pending"
        
        # Step 2: Check status
        mock_spexi_client.check_order_status = AsyncMock(
            return_value={"order_id": "ORDER001", "status": "completed", "download_url": "https://example.com/image.tif"}
        )
        status = await mock_spexi_client.check_order_status(order["order_id"])
        assert status["status"] == "completed"
        
        # Step 3: Download
        image_data = await mock_spexi_client.download_image(order["order_id"])
        assert image_data is not None
        
    async def test_order_with_specifications(self, mock_spexi_client):
        """Test ordering with specific requirements"""
        mock_spexi_client.order_image_with_specs = AsyncMock(
            return_value={
                "order_id": "ORDER002",
                "status": "pending",
                "specifications": {
                    "resolution": 3.0,
                    "bands": ["red", "nir", "blue", "green"],
                    "max_cloud_cover": 10
                }
            }
        )
        
        order = await mock_spexi_client.order_image_with_specs(
            plot_id="PLOT001",
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            resolution=3.0,
            bands=["red", "nir", "blue", "green"],
            max_cloud_cover=10
        )
        
        assert order["specifications"]["resolution"] == 3.0
        assert len(order["specifications"]["bands"]) == 4
        
    async def test_cancel_order(self, mock_spexi_client):
        """Test cancelling an order"""
        mock_spexi_client.cancel_order = AsyncMock(return_value=True)
        
        result = await mock_spexi_client.cancel_order("ORDER001")
        assert result == True
        
    async def test_list_orders(self, mock_spexi_client):
        """Test listing all orders"""
        mock_spexi_client.list_orders = AsyncMock(
            return_value=[
                {"order_id": "ORDER001", "status": "completed"},
                {"order_id": "ORDER002", "status": "pending"},
                {"order_id": "ORDER003", "status": "processing"}
            ]
        )
        
        orders = await mock_spexi_client.list_orders()
        assert len(orders) == 3
        
    async def test_order_failed(self, mock_spexi_client):
        """Test handling of failed order"""
        mock_spexi_client.check_order_status = AsyncMock(
            return_value={
                "order_id": "ORDER001",
                "status": "failed",
                "error": "High cloud cover"
            }
        )
        
        status = await mock_spexi_client.check_order_status("ORDER001")
        assert status["status"] == "failed"
        assert "error" in status
        
    async def test_retry_on_timeout(self, mock_spexi_client):
        """Test retry logic on timeout"""
        mock_spexi_client.download_image = AsyncMock(
            side_effect=[
                httpx.TimeoutException("Request timeout"),
                b"mock_image_data"
            ]
        )
        
        mock_spexi_client.download_with_retry = AsyncMock(
            return_value=b"mock_image_data"
        )
        
        data = await mock_spexi_client.download_with_retry(
            "ORDER001",
            max_retries=3
        )
        
        assert data == b"mock_image_data"
        
    async def test_authentication(self, test_settings):
        """Test API authentication"""
        with patch('integrations.spexi_client.httpx.AsyncClient') as mock_client:
            client = SpexiClient(test_settings)
            client.api_key = "test_spexi_key"
            
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json = Mock(return_value={"order_id": "ORDER001"})
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            # Verify authentication is included
            assert client.api_key == "test_spexi_key"
            
    async def test_validate_geometry(self, mock_spexi_client):
        """Test geometry validation before ordering"""
        # Valid geometry
        valid_geom = {
            "type": "Polygon",
            "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        }
        
        mock_spexi_client.validate_geometry = AsyncMock(return_value=True)
        is_valid = await mock_spexi_client.validate_geometry(valid_geom)
        assert is_valid == True
        
        # Invalid geometry
        invalid_geom = {"type": "Point", "coordinates": [0, 0]}
        
        mock_spexi_client.validate_geometry = AsyncMock(return_value=False)
        is_valid = await mock_spexi_client.validate_geometry(invalid_geom)
        assert is_valid == False
        
    async def test_estimate_cost(self, mock_spexi_client):
        """Test cost estimation for order"""
        mock_spexi_client.estimate_cost = AsyncMock(
            return_value={
                "estimated_cost": 50.0,
                "currency": "USD",
                "area_sqkm": 2.5
            }
        )
        
        estimate = await mock_spexi_client.estimate_cost(
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            resolution=3.0
        )
        
        assert estimate["estimated_cost"] > 0
        assert "currency" in estimate


@pytest.mark.unit
@pytest.mark.asyncio
class TestIntegrationErrorHandling:
    """Test error handling across integrations"""
    
    async def test_network_timeout(self, mock_weatherxm_client):
        """Test handling of network timeout"""
        mock_weatherxm_client.get_station_data = AsyncMock(
            side_effect=httpx.TimeoutException("Request timeout")
        )
        
        with pytest.raises(httpx.TimeoutException):
            await mock_weatherxm_client.get_station_data("STATION001")
            
    async def test_connection_error(self, mock_spexi_client):
        """Test handling of connection error"""
        mock_spexi_client.order_image = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        
        with pytest.raises(httpx.ConnectError):
            await mock_spexi_client.order_image(
                plot_id="PLOT001",
                geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
                capture_date=datetime.utcnow()
            )
            
    async def test_invalid_response_format(self, mock_weatherxm_client):
        """Test handling of invalid response format"""
        mock_weatherxm_client.get_station_data = AsyncMock(
            return_value="invalid_json_string"
        )
        
        mock_weatherxm_client.parse_response = AsyncMock(
            side_effect=ValueError("Invalid JSON")
        )
        
        with pytest.raises(ValueError):
            await mock_weatherxm_client.parse_response("invalid_json_string")
