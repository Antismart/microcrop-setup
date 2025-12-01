"""
Unit Tests for Satellite Processor
Tests NDVI, EVI, and vegetation index calculations
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
from io import BytesIO

from processors.satellite_processor import SatelliteProcessor
from models.satellite import SatelliteImage, VegetationIndices


@pytest.mark.unit
@pytest.mark.asyncio
class TestSatelliteProcessor:
    """Test suite for SatelliteProcessor"""
    
    async def test_initialization(self, test_settings):
        """Test processor initialization"""
        processor = SatelliteProcessor(test_settings)
        assert processor is not None
        assert processor.settings == test_settings
        
    async def test_calculate_ndvi(self, satellite_processor):
        """Test NDVI calculation"""
        # Create mock raster data
        red_band = np.array([[100, 120, 110], [105, 115, 125], [110, 120, 130]], dtype=np.float32)
        nir_band = np.array([[200, 220, 210], [205, 215, 225], [210, 220, 230]], dtype=np.float32)
        
        ndvi = await satellite_processor.calculate_ndvi(red_band, nir_band)
        
        assert ndvi.shape == red_band.shape
        assert np.all((ndvi >= -1) & (ndvi <= 1))
        assert np.mean(ndvi) > 0  # Healthy vegetation
        
    async def test_calculate_ndvi_no_vegetation(self, satellite_processor):
        """Test NDVI with bare soil (low NDVI)"""
        red_band = np.array([[150, 160, 155]], dtype=np.float32)
        nir_band = np.array([[160, 170, 165]], dtype=np.float32)
        
        ndvi = await satellite_processor.calculate_ndvi(red_band, nir_band)
        
        # Low NDVI expected for bare soil
        assert np.all(ndvi < 0.3)
        
    async def test_calculate_evi(self, satellite_processor):
        """Test Enhanced Vegetation Index calculation"""
        red_band = np.array([[100, 110, 105]], dtype=np.float32)
        nir_band = np.array([[200, 210, 205]], dtype=np.float32)
        blue_band = np.array([[80, 85, 82]], dtype=np.float32)
        
        evi = await satellite_processor.calculate_evi(nir_band, red_band, blue_band)
        
        assert evi.shape == red_band.shape
        assert np.all((evi >= -1) & (evi <= 1))
        
    async def test_calculate_savi(self, satellite_processor):
        """Test Soil Adjusted Vegetation Index calculation"""
        red_band = np.array([[100, 110, 105]], dtype=np.float32)
        nir_band = np.array([[200, 210, 205]], dtype=np.float32)
        
        savi = await satellite_processor.calculate_savi(nir_band, red_band, L=0.5)
        
        assert savi.shape == red_band.shape
        assert np.all((savi >= -1) & (savi <= 1))
        
    async def test_calculate_lai(self, satellite_processor):
        """Test Leaf Area Index estimation"""
        ndvi = np.array([[0.7, 0.75, 0.8], [0.72, 0.78, 0.82]], dtype=np.float32)
        
        lai = await satellite_processor.calculate_lai(ndvi)
        
        assert lai.shape == ndvi.shape
        assert np.all(lai >= 0)
        assert np.all(lai < 10)  # Reasonable LAI range
        
    async def test_assess_cloud_cover(self, satellite_processor):
        """Test cloud cover assessment"""
        # Create mock image with some bright pixels (clouds)
        image = np.random.rand(100, 100, 3) * 100
        image[0:20, 0:20] = 250  # Bright area (cloud)
        
        cloud_percentage = await satellite_processor.assess_cloud_cover(image)
        
        assert 0 <= cloud_percentage <= 100
        assert cloud_percentage > 0  # Some clouds present
        
    async def test_assess_cloud_cover_clear_sky(self, satellite_processor):
        """Test cloud cover with clear sky"""
        # Dark image (no clouds)
        image = np.random.rand(100, 100, 3) * 50
        
        cloud_percentage = await satellite_processor.assess_cloud_cover(image)
        
        assert cloud_percentage < 10  # Minimal clouds
        
    async def test_estimate_growth_stage(self, satellite_processor):
        """Test crop growth stage estimation from NDVI"""
        # Seedling stage (low NDVI)
        stage_seedling = await satellite_processor.estimate_growth_stage(ndvi=0.3)
        assert stage_seedling in ["germination", "seedling"]
        
        # Vegetative stage (medium NDVI)
        stage_vegetative = await satellite_processor.estimate_growth_stage(ndvi=0.6)
        assert stage_vegetative in ["vegetative", "flowering"]
        
        # Mature stage (high NDVI)
        stage_mature = await satellite_processor.estimate_growth_stage(ndvi=0.85)
        assert stage_mature in ["flowering", "maturity"]
        
    async def test_calculate_ndvi_statistics(self, satellite_processor):
        """Test NDVI statistics calculation"""
        ndvi = np.array([
            [0.7, 0.75, 0.8],
            [0.72, 0.78, 0.82],
            [0.68, 0.76, 0.79]
        ], dtype=np.float32)
        
        stats = await satellite_processor.calculate_ndvi_statistics(ndvi)
        
        assert "mean" in stats
        assert "median" in stats
        assert "std" in stats
        assert "min" in stats
        assert "max" in stats
        
        assert 0.6 < stats["mean"] < 0.9
        assert stats["std"] > 0
        
    async def test_compare_with_baseline(self, satellite_processor):
        """Test comparison with baseline NDVI"""
        current_ndvi = 0.65
        baseline_ndvi = 0.75
        
        deviation = await satellite_processor.compare_with_baseline(
            current_ndvi, baseline_ndvi
        )
        
        assert deviation < 0  # Negative deviation (below baseline)
        assert abs(deviation - (-0.10)) < 0.01
        
    async def test_determine_health_status(self, satellite_processor):
        """Test health status determination"""
        # Healthy (close to baseline)
        status_healthy = await satellite_processor.determine_health_status(
            current_ndvi=0.75, baseline_ndvi=0.77
        )
        assert status_healthy == "healthy"
        
        # Stressed (moderate deviation)
        status_stressed = await satellite_processor.determine_health_status(
            current_ndvi=0.60, baseline_ndvi=0.77
        )
        assert status_stressed == "stressed"
        
        # Critical (large deviation)
        status_critical = await satellite_processor.determine_health_status(
            current_ndvi=0.45, baseline_ndvi=0.77
        )
        assert status_critical == "critical"
        
    async def test_process_satellite_image(self, satellite_processor, sample_satellite_image):
        """Test complete satellite image processing"""
        # Mock image data
        mock_image_data = np.random.rand(100, 100, 4) * 200  # 4 bands
        
        satellite_processor.storage.download_file = AsyncMock(return_value=mock_image_data)
        satellite_processor.db_client.insert_vegetation_indices = AsyncMock(return_value=True)
        
        indices = await satellite_processor.process_satellite_image(
            plot_id="PLOT001",
            image_id="IMG001"
        )
        
        assert isinstance(indices, VegetationIndices)
        assert indices.plot_id == "PLOT001"
        assert 0.0 <= indices.ndvi <= 1.0
        assert 0.0 <= indices.evi <= 1.0
        assert indices.lai >= 0
        
    async def test_process_image_high_cloud_cover(self, satellite_processor, sample_satellite_image):
        """Test processing rejection due to high cloud cover"""
        # Mock cloudy image
        cloudy_image = np.ones((100, 100, 4)) * 250  # All bright (clouds)
        
        satellite_processor.storage.download_file = AsyncMock(return_value=cloudy_image)
        
        with pytest.raises(ValueError, match="Cloud cover too high"):
            await satellite_processor.process_satellite_image(
                plot_id="PLOT001",
                image_id="IMG001"
            )
            
    async def test_calculate_temporal_ndvi_trend(self, satellite_processor):
        """Test temporal NDVI trend analysis"""
        # Create time series of NDVI values
        dates = [datetime.utcnow() - timedelta(days=i*7) for i in range(12)]
        ndvi_values = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.78, 0.76, 0.72, 0.68, 0.65, 0.60]
        
        trend = await satellite_processor.calculate_temporal_trend(dates, ndvi_values)
        
        assert "slope" in trend
        assert "r_squared" in trend
        assert "trend_direction" in trend
        
        # Positive trend in first half, then decline
        assert trend["trend_direction"] in ["increasing", "stable", "decreasing"]
        
    async def test_detect_stress_patterns(self, satellite_processor):
        """Test stress pattern detection in NDVI data"""
        # Create NDVI array with stress pattern (low values in center)
        ndvi = np.ones((10, 10)) * 0.75
        ndvi[4:6, 4:6] = 0.45  # Stressed area in center
        
        stress_areas = await satellite_processor.detect_stress_patterns(ndvi)
        
        assert isinstance(stress_areas, np.ndarray)
        assert stress_areas.shape == ndvi.shape
        assert np.any(stress_areas)  # Some stress detected
        
    async def test_normalize_bands(self, satellite_processor):
        """Test band normalization"""
        band = np.array([[1000, 2000], [3000, 4000]], dtype=np.float32)
        
        normalized = await satellite_processor.normalize_band(band)
        
        assert np.min(normalized) >= 0
        assert np.max(normalized) <= 1
        
    async def test_mask_invalid_pixels(self, satellite_processor):
        """Test masking of invalid pixels"""
        ndvi = np.array([[0.7, -999, 0.8], [0.75, 0.78, -999]], dtype=np.float32)
        
        masked = await satellite_processor.mask_invalid_pixels(ndvi, no_data_value=-999)
        
        assert not np.any(masked == -999)
        assert np.all(masked[masked != 0] > 0)  # Valid pixels are positive
        
    async def test_calculate_vegetation_cover(self, satellite_processor):
        """Test vegetation cover percentage calculation"""
        ndvi = np.array([
            [0.8, 0.75, 0.2],  # 2 vegetated, 1 bare
            [0.7, 0.15, 0.78],  # 2 vegetated, 1 bare
            [0.25, 0.82, 0.76]  # 2 vegetated, 1 bare
        ], dtype=np.float32)
        
        cover_percentage = await satellite_processor.calculate_vegetation_cover(
            ndvi, threshold=0.4
        )
        
        assert 0 <= cover_percentage <= 100
        assert 60 <= cover_percentage <= 70  # ~66% vegetated
        
    async def test_process_multitemporal_analysis(self, satellite_processor):
        """Test multi-temporal change detection"""
        # Baseline image (healthy vegetation)
        baseline_ndvi = np.ones((50, 50)) * 0.75
        
        # Current image (some stress)
        current_ndvi = np.ones((50, 50)) * 0.75
        current_ndvi[10:20, 10:20] = 0.50  # Stressed area
        
        change_map = await satellite_processor.detect_changes(
            baseline_ndvi, current_ndvi, threshold=0.15
        )
        
        assert change_map.shape == baseline_ndvi.shape
        assert np.any(change_map)  # Some changes detected
        assert np.sum(change_map) > 0
        
    async def test_edge_case_all_water(self, satellite_processor):
        """Test handling of water pixels (negative NDVI)"""
        red_band = np.array([[200, 210, 205]], dtype=np.float32)
        nir_band = np.array([[100, 110, 105]], dtype=np.float32)  # Lower than red
        
        ndvi = await satellite_processor.calculate_ndvi(red_band, nir_band)
        
        # Water has negative NDVI
        assert np.all(ndvi < 0)
        
    async def test_edge_case_division_by_zero(self, satellite_processor):
        """Test handling of division by zero in NDVI"""
        red_band = np.array([[0, 0, 0]], dtype=np.float32)
        nir_band = np.array([[0, 0, 0]], dtype=np.float32)
        
        ndvi = await satellite_processor.calculate_ndvi(red_band, nir_band)
        
        # Should return 0 or NaN, not error
        assert not np.any(np.isinf(ndvi))
        
    async def test_spatial_aggregation(self, satellite_processor):
        """Test spatial aggregation of NDVI values"""
        # Create plot with 4 zones
        ndvi = np.random.rand(100, 100) * 0.4 + 0.5  # NDVI between 0.5-0.9
        
        aggregated = await satellite_processor.aggregate_by_zones(
            ndvi, num_zones=4
        )
        
        assert len(aggregated) == 4
        assert all(0 <= v <= 1 for v in aggregated.values())
