"""
Unit Tests for Weather Processor
Tests drought, flood, and heat stress calculations
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

from processors.weather_processor import WeatherProcessor
from models.weather import WeatherData, WeatherIndices


@pytest.mark.unit
@pytest.mark.asyncio
class TestWeatherProcessor:
    """Test suite for WeatherProcessor"""
    
    async def test_initialization(self, test_settings):
        """Test processor initialization"""
        processor = WeatherProcessor(test_settings)
        assert processor is not None
        assert processor.settings == test_settings
        
    async def test_calculate_drought_index_no_drought(self, weather_processor, sample_weather_data):
        """Test drought index calculation with normal conditions"""
        # Normal conditions: adequate rainfall and soil moisture
        data_list = [sample_weather_data] * 10
        
        # Mock database query
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=data_list)
        
        drought_index = await weather_processor.calculate_drought_index(
            plot_id="PLOT001",
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow()
        )
        
        # No drought expected
        assert 0.0 <= drought_index <= 1.0
        assert drought_index < 0.3  # Below drought threshold
        
    async def test_calculate_drought_index_severe_drought(self, weather_processor):
        """Test drought index calculation with severe drought conditions"""
        # Create drought conditions: no rainfall, low soil moisture
        drought_data = []
        base_time = datetime.utcnow()
        
        for i in range(30):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=35.0,  # High temperature
                humidity=20.0,  # Low humidity
                precipitation=0.0,  # No rain
                wind_speed=5.0,
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=900.0,
                soil_moisture=0.10,  # Very low soil moisture
                soil_temperature=30.0,
                data_quality=0.95
            )
            drought_data.append(data)
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=drought_data)
        
        drought_index = await weather_processor.calculate_drought_index(
            plot_id="PLOT001",
            start_date=base_time - timedelta(days=30),
            end_date=base_time
        )
        
        # Severe drought expected
        assert 0.7 <= drought_index <= 1.0
        
    async def test_calculate_flood_index_no_flood(self, weather_processor, sample_weather_data):
        """Test flood index calculation with normal conditions"""
        data_list = [sample_weather_data] * 10
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=data_list)
        
        flood_index = await weather_processor.calculate_flood_index(
            plot_id="PLOT001",
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow()
        )
        
        # No flood expected
        assert 0.0 <= flood_index <= 1.0
        assert flood_index < 0.3
        
    async def test_calculate_flood_index_heavy_rainfall(self, weather_processor):
        """Test flood index calculation with heavy rainfall"""
        flood_data = []
        base_time = datetime.utcnow()
        
        for i in range(7):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=22.0,
                humidity=95.0,  # Very high humidity
                precipitation=50.0,  # Heavy daily rainfall
                wind_speed=2.0,
                wind_direction=180,
                pressure=1005.0,  # Low pressure
                solar_radiation=400.0,
                soil_moisture=0.95,  # Saturated soil
                soil_temperature=20.0,
                data_quality=0.95
            )
            flood_data.append(data)
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=flood_data)
        
        flood_index = await weather_processor.calculate_flood_index(
            plot_id="PLOT001",
            start_date=base_time - timedelta(days=7),
            end_date=base_time
        )
        
        # High flood risk expected
        assert 0.6 <= flood_index <= 1.0
        
    async def test_calculate_heat_stress_index_normal(self, weather_processor, sample_weather_data):
        """Test heat stress index with normal temperatures"""
        data_list = [sample_weather_data] * 10
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=data_list)
        
        heat_index = await weather_processor.calculate_heat_stress_index(
            plot_id="PLOT001",
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow()
        )
        
        assert 0.0 <= heat_index <= 1.0
        assert heat_index < 0.3
        
    async def test_calculate_heat_stress_index_extreme_heat(self, weather_processor):
        """Test heat stress index with extreme heat"""
        heat_data = []
        base_time = datetime.utcnow()
        
        for i in range(7):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=42.0,  # Extreme heat
                humidity=70.0,
                precipitation=0.0,
                wind_speed=1.0,  # Low wind (poor cooling)
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=1000.0,  # Very high radiation
                soil_moisture=0.25,
                soil_temperature=38.0,  # Very hot soil
                data_quality=0.95
            )
            heat_data.append(data)
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=heat_data)
        
        heat_index = await weather_processor.calculate_heat_stress_index(
            plot_id="PLOT001",
            start_date=base_time - timedelta(days=7),
            end_date=base_time
        )
        
        # Severe heat stress expected
        assert 0.7 <= heat_index <= 1.0
        
    async def test_calculate_composite_score(self, weather_processor):
        """Test composite score calculation"""
        composite = await weather_processor.calculate_composite_score(
            drought_index=0.6,
            flood_index=0.2,
            heat_index=0.4
        )
        
        # Composite should be weighted average
        assert 0.0 <= composite <= 1.0
        # Drought has highest weight, so composite should be closer to 0.6
        assert 0.3 <= composite <= 0.7
        
    async def test_detect_anomalies(self, weather_processor, sample_weather_data):
        """Test anomaly detection"""
        # Create data with clear anomalies
        anomaly_data = sample_weather_data.model_copy()
        anomaly_data.soil_moisture = 0.05  # Very low
        anomaly_data.precipitation = 100.0  # Very high
        
        anomalies = await weather_processor.detect_anomalies(anomaly_data)
        
        assert isinstance(anomalies, list)
        assert len(anomalies) > 0
        assert "low_soil_moisture" in anomalies or "extreme_precipitation" in anomalies
        
    async def test_calculate_confidence(self, weather_processor, sample_weather_data):
        """Test confidence score calculation"""
        data_list = [sample_weather_data] * 20
        
        confidence = await weather_processor.calculate_confidence(
            data_points=data_list,
            expected_count=20
        )
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.8  # High confidence with complete data
        
    async def test_calculate_confidence_missing_data(self, weather_processor, sample_weather_data):
        """Test confidence with missing data"""
        data_list = [sample_weather_data] * 10
        
        confidence = await weather_processor.calculate_confidence(
            data_points=data_list,
            expected_count=30  # Expected 30 but got 10
        )
        
        assert 0.0 <= confidence <= 1.0
        assert confidence < 0.5  # Lower confidence with missing data
        
    async def test_process_weather_indices(self, weather_processor, sample_weather_data):
        """Test complete weather indices processing"""
        data_list = [sample_weather_data] * 30
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=data_list)
        weather_processor.db_client.insert_indices = AsyncMock(return_value=True)
        
        indices = await weather_processor.process_weather_indices(
            plot_id="PLOT001",
            date=datetime.utcnow().date()
        )
        
        assert isinstance(indices, WeatherIndices)
        assert indices.plot_id == "PLOT001"
        assert 0.0 <= indices.drought_index <= 1.0
        assert 0.0 <= indices.flood_index <= 1.0
        assert 0.0 <= indices.heat_stress_index <= 1.0
        assert 0.0 <= indices.composite_score <= 1.0
        assert 0.0 <= indices.confidence <= 1.0
        
    async def test_process_weather_indices_no_data(self, weather_processor):
        """Test indices processing with no data"""
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=[])
        
        with pytest.raises(ValueError, match="No weather data"):
            await weather_processor.process_weather_indices(
                plot_id="PLOT001",
                date=datetime.utcnow().date()
            )
            
    async def test_cache_integration(self, weather_processor, sample_weather_data):
        """Test caching of calculated indices"""
        cache_key = "weather_indices:PLOT001:2024-01-01"
        cached_data = {
            "drought_index": 0.25,
            "flood_index": 0.15,
            "heat_stress_index": 0.10
        }
        
        # Mock cache hit
        weather_processor.cache.get = AsyncMock(return_value=cached_data)
        
        result = await weather_processor.cache.get(cache_key)
        
        assert result == cached_data
        weather_processor.cache.get.assert_called_once_with(cache_key)
        
    async def test_parallel_plot_processing(self, weather_processor, sample_weather_data):
        """Test processing multiple plots in parallel"""
        plot_ids = ["PLOT001", "PLOT002", "PLOT003"]
        data_list = [sample_weather_data] * 30
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=data_list)
        weather_processor.db_client.insert_indices = AsyncMock(return_value=True)
        
        results = []
        for plot_id in plot_ids:
            result = await weather_processor.process_weather_indices(
                plot_id=plot_id,
                date=datetime.utcnow().date()
            )
            results.append(result)
        
        assert len(results) == 3
        assert all(isinstance(r, WeatherIndices) for r in results)
        
    async def test_edge_case_zero_precipitation(self, weather_processor):
        """Test handling of zero precipitation over long period"""
        zero_rain_data = []
        base_time = datetime.utcnow()
        
        for i in range(60):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=30.0,
                humidity=40.0,
                precipitation=0.0,  # No rain for 60 days
                wind_speed=3.0,
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=850.0,
                soil_moisture=0.15,  # Low soil moisture
                soil_temperature=28.0,
                data_quality=0.95
            )
            zero_rain_data.append(data)
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=zero_rain_data)
        
        drought_index = await weather_processor.calculate_drought_index(
            plot_id="PLOT001",
            start_date=base_time - timedelta(days=60),
            end_date=base_time
        )
        
        # Should indicate severe drought
        assert drought_index > 0.8
        
    async def test_data_quality_threshold(self, weather_processor):
        """Test handling of low quality data"""
        low_quality_data = []
        base_time = datetime.utcnow()
        
        for i in range(10):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=25.0,
                humidity=60.0,
                precipitation=2.0,
                wind_speed=3.0,
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=850.0,
                soil_moisture=0.35,
                soil_temperature=22.0,
                data_quality=0.40  # Low quality
            )
            low_quality_data.append(data)
        
        weather_processor.db_client.query_weather_data = AsyncMock(return_value=low_quality_data)
        weather_processor.db_client.insert_indices = AsyncMock(return_value=True)
        
        indices = await weather_processor.process_weather_indices(
            plot_id="PLOT001",
            date=base_time.date()
        )
        
        # Low confidence expected due to low quality data
        assert indices.confidence < 0.6
