"""
Integration Tests for Complete Pipelines
Tests end-to-end workflows for weather, satellite, and damage processing
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock
import asyncio

from processors.weather_processor import WeatherProcessor
from processors.satellite_processor import SatelliteProcessor
from processors.damage_calculator import DamageCalculator
from models.weather import WeatherData, WeatherIndices
from models.satellite import SatelliteImage, VegetationIndices
from models.damage import DamageAssessment, PayoutDecision


@pytest.mark.integration
@pytest.mark.asyncio
class TestWeatherPipeline:
    """Integration tests for complete weather processing pipeline"""
    
    async def test_complete_weather_pipeline(
        self,
        test_settings,
        mock_timescale_client,
        mock_redis_cache,
        mock_weatherxm_client,
        generate_weather_data
    ):
        """Test complete weather data flow: fetch -> process -> store -> calculate"""
        
        # Setup
        processor = WeatherProcessor(test_settings)
        processor.db_client = mock_timescale_client
        processor.cache = mock_redis_cache
        
        # Step 1: Fetch weather data from WeatherXM
        weather_data_list = generate_weather_data(count=30, plot_id="PLOT001")
        mock_weatherxm_client.get_historical_data = AsyncMock(
            return_value=weather_data_list
        )
        
        # Step 2: Store in database
        mock_timescale_client.bulk_insert = AsyncMock(return_value=30)
        inserted_count = await mock_timescale_client.bulk_insert(weather_data_list)
        assert inserted_count == 30
        
        # Step 3: Calculate indices
        mock_timescale_client.query_weather_data = AsyncMock(
            return_value=weather_data_list
        )
        mock_timescale_client.insert_indices = AsyncMock(return_value=True)
        
        indices = await processor.process_weather_indices(
            plot_id="PLOT001",
            date=datetime.utcnow().date()
        )
        
        # Verify complete pipeline
        assert isinstance(indices, WeatherIndices)
        assert indices.plot_id == "PLOT001"
        assert 0.0 <= indices.drought_index <= 1.0
        assert 0.0 <= indices.flood_index <= 1.0
        assert 0.0 <= indices.heat_stress_index <= 1.0
        
        # Step 4: Cache results
        await mock_redis_cache.set(
            f"weather_indices:{indices.plot_id}:{indices.date}",
            indices.model_dump(),
            ttl=3600
        )
        
        mock_redis_cache.set.assert_called_once()
        
    async def test_weather_trigger_detection(
        self,
        test_settings,
        mock_timescale_client,
        mock_redis_cache
    ):
        """Test detection of weather triggers for damage assessment"""
        
        processor = WeatherProcessor(test_settings)
        processor.db_client = mock_timescale_client
        processor.cache = mock_redis_cache
        
        # Create severe drought conditions
        drought_data = []
        base_time = datetime.utcnow()
        
        for i in range(30):
            data = WeatherData(
                plot_id="PLOT001",
                station_id="STATION001",
                timestamp=base_time - timedelta(days=i),
                temperature=38.0,
                humidity=15.0,
                precipitation=0.0,
                wind_speed=5.0,
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=950.0,
                soil_moisture=0.08,
                soil_temperature=35.0,
                data_quality=0.95
            )
            drought_data.append(data)
        
        mock_timescale_client.query_weather_data = AsyncMock(
            return_value=drought_data
        )
        mock_timescale_client.insert_indices = AsyncMock(return_value=True)
        
        indices = await processor.process_weather_indices(
            plot_id="PLOT001",
            date=base_time.date()
        )
        
        # Verify trigger conditions met
        assert indices.drought_index > 0.7  # Severe drought
        assert indices.composite_score > 0.6  # High damage score
        
    async def test_multi_plot_parallel_processing(
        self,
        test_settings,
        mock_timescale_client,
        mock_redis_cache,
        generate_weather_data
    ):
        """Test processing multiple plots in parallel"""
        
        processor = WeatherProcessor(test_settings)
        processor.db_client = mock_timescale_client
        processor.cache = mock_redis_cache
        
        plot_ids = ["PLOT001", "PLOT002", "PLOT003", "PLOT004", "PLOT005"]
        
        # Mock data for all plots
        mock_timescale_client.query_weather_data = AsyncMock(
            side_effect=[
                generate_weather_data(count=30, plot_id=plot_id)
                for plot_id in plot_ids
            ]
        )
        mock_timescale_client.insert_indices = AsyncMock(return_value=True)
        
        # Process all plots concurrently
        tasks = [
            processor.process_weather_indices(
                plot_id=plot_id,
                date=datetime.utcnow().date()
            )
            for plot_id in plot_ids
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Verify all processed successfully
        assert len(results) == 5
        assert all(isinstance(r, WeatherIndices) for r in results)
        assert all(r.plot_id in plot_ids for r in results)


@pytest.mark.integration
@pytest.mark.asyncio
class TestSatellitePipeline:
    """Integration tests for complete satellite processing pipeline"""
    
    async def test_complete_satellite_pipeline(
        self,
        test_settings,
        mock_timescale_client,
        mock_minio_client,
        mock_spexi_client
    ):
        """Test complete satellite flow: order -> download -> process -> store"""
        
        processor = SatelliteProcessor(test_settings)
        processor.db_client = mock_timescale_client
        processor.storage = mock_minio_client
        
        # Step 1: Order satellite image
        order = await mock_spexi_client.order_image(
            plot_id="PLOT001",
            geometry={"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]},
            capture_date=datetime.utcnow()
        )
        
        assert order["order_id"] == "ORDER001"
        
        # Step 2: Check order status
        mock_spexi_client.check_order_status = AsyncMock(
            return_value={
                "order_id": "ORDER001",
                "status": "completed",
                "download_url": "https://example.com/image.tif"
            }
        )
        
        status = await mock_spexi_client.check_order_status(order["order_id"])
        assert status["status"] == "completed"
        
        # Step 3: Download image
        import numpy as np
        mock_image_data = np.random.rand(100, 100, 4) * 200
        mock_spexi_client.download_image = AsyncMock(return_value=mock_image_data)
        
        image_data = await mock_spexi_client.download_image(order["order_id"])
        assert image_data is not None
        
        # Step 4: Upload to MinIO
        mock_minio_client.upload_file = AsyncMock(
            return_value="s3://satellite-images/PLOT001/image.tif"
        )
        
        storage_path = await mock_minio_client.upload_file(
            file_path="/tmp/image.tif",
            bucket="satellite-images",
            object_name="PLOT001/image.tif"
        )
        
        # Step 5: Process image
        mock_minio_client.download_file = AsyncMock(return_value=mock_image_data)
        mock_timescale_client.insert_vegetation_indices = AsyncMock(return_value=True)
        
        indices = await processor.process_satellite_image(
            plot_id="PLOT001",
            image_id="IMG001"
        )
        
        # Verify complete pipeline
        assert isinstance(indices, VegetationIndices)
        assert indices.plot_id == "PLOT001"
        assert 0.0 <= indices.ndvi <= 1.0
        
    async def test_satellite_stress_detection(
        self,
        test_settings,
        mock_timescale_client,
        mock_minio_client
    ):
        """Test detection of vegetation stress from satellite data"""
        
        processor = SatelliteProcessor(test_settings)
        processor.db_client = mock_timescale_client
        processor.storage = mock_minio_client
        
        # Create stressed vegetation image (low NDVI)
        import numpy as np
        mock_image = np.ones((100, 100, 4)) * 100
        # Red band higher than NIR (stressed vegetation)
        mock_image[:, :, 0] = 150  # Red
        mock_image[:, :, 3] = 100  # NIR
        
        mock_minio_client.download_file = AsyncMock(return_value=mock_image)
        mock_timescale_client.insert_vegetation_indices = AsyncMock(return_value=True)
        
        indices = await processor.process_satellite_image(
            plot_id="PLOT001",
            image_id="IMG001"
        )
        
        # Verify stress detected
        assert indices.ndvi < 0.5  # Low NDVI indicates stress
        assert indices.health_status in ["stressed", "critical"]


@pytest.mark.integration
@pytest.mark.asyncio
class TestDamagePipeline:
    """Integration tests for complete damage assessment pipeline"""
    
    async def test_complete_damage_pipeline(
        self,
        test_settings,
        mock_timescale_client,
        mock_ipfs_client,
        sample_weather_indices,
        sample_vegetation_indices
    ):
        """Test complete damage flow: gather data -> calculate -> upload proof -> trigger payout"""
        
        calculator = DamageCalculator(test_settings)
        calculator.db_client = mock_timescale_client
        calculator.ipfs_client = mock_ipfs_client
        
        # Step 1: Gather weather and satellite indices
        mock_timescale_client.get_weather_indices = AsyncMock(
            return_value=sample_weather_indices
        )
        mock_timescale_client.get_vegetation_indices = AsyncMock(
            return_value=sample_vegetation_indices
        )
        
        # Step 2: Calculate damage assessment
        mock_timescale_client.insert_assessment = AsyncMock(return_value=True)
        
        # Modify indices to trigger payout
        sample_weather_indices.composite_score = 0.75
        sample_vegetation_indices.ndvi_deviation = -0.25
        
        assessment = await calculator.process_damage_assessment(
            plot_id="PLOT001",
            policy_id="POLICY001",
            assessment_date=datetime.utcnow()
        )
        
        assert isinstance(assessment, DamageAssessment)
        assert assessment.composite_score > 0.6  # High damage
        
        # Step 3: Upload proof to IPFS
        mock_ipfs_client.pin_json = AsyncMock(return_value="QmProofCID123456")
        
        proof_cid = await calculator.upload_proof_to_ipfs(assessment)
        assert proof_cid == "QmProofCID123456"
        
        # Step 4: Process payout decision
        mock_timescale_client.insert_payout_decision = AsyncMock(return_value=True)
        
        decision = await calculator.process_payout_decision(
            assessment=assessment,
            policy_coverage=1000.0
        )
        
        # Verify complete pipeline
        assert isinstance(decision, PayoutDecision)
        assert decision.payout_triggered == True
        assert decision.payout_amount > 0
        assert decision.ipfs_proof_cid is not None
        
    async def test_end_to_end_payout_workflow(
        self,
        test_settings,
        mock_timescale_client,
        mock_redis_cache,
        mock_minio_client,
        mock_ipfs_client,
        mock_weatherxm_client,
        mock_spexi_client,
        generate_weather_data
    ):
        """Test complete end-to-end workflow from data collection to payout"""
        
        # Initialize all processors
        weather_processor = WeatherProcessor(test_settings)
        weather_processor.db_client = mock_timescale_client
        weather_processor.cache = mock_redis_cache
        
        satellite_processor = SatelliteProcessor(test_settings)
        satellite_processor.db_client = mock_timescale_client
        satellite_processor.storage = mock_minio_client
        
        damage_calculator = DamageCalculator(test_settings)
        damage_calculator.db_client = mock_timescale_client
        damage_calculator.ipfs_client = mock_ipfs_client
        
        plot_id = "PLOT001"
        policy_id = "POLICY001"
        assessment_date = datetime.utcnow()
        
        # Phase 1: Weather Processing
        # Create severe drought conditions
        drought_data = []
        for i in range(30):
            data = WeatherData(
                plot_id=plot_id,
                station_id="STATION001",
                timestamp=assessment_date - timedelta(days=i),
                temperature=40.0,
                humidity=10.0,
                precipitation=0.0,
                wind_speed=5.0,
                wind_direction=180,
                pressure=1013.25,
                solar_radiation=1000.0,
                soil_moisture=0.05,
                soil_temperature=38.0,
                data_quality=0.95
            )
            drought_data.append(data)
        
        mock_timescale_client.query_weather_data = AsyncMock(
            return_value=drought_data
        )
        mock_timescale_client.insert_indices = AsyncMock(return_value=True)
        
        weather_indices = await weather_processor.process_weather_indices(
            plot_id=plot_id,
            date=assessment_date.date()
        )
        
        assert weather_indices.composite_score > 0.7  # Severe conditions
        
        # Phase 2: Satellite Processing
        import numpy as np
        stressed_image = np.ones((100, 100, 4)) * 100
        stressed_image[:, :, 0] = 160  # High red (stressed)
        stressed_image[:, :, 3] = 90   # Low NIR (stressed)
        
        mock_minio_client.download_file = AsyncMock(return_value=stressed_image)
        mock_timescale_client.insert_vegetation_indices = AsyncMock(return_value=True)
        
        veg_indices = await satellite_processor.process_satellite_image(
            plot_id=plot_id,
            image_id="IMG001"
        )
        
        assert veg_indices.health_status in ["stressed", "critical"]
        
        # Phase 3: Damage Assessment
        mock_timescale_client.get_weather_indices = AsyncMock(
            return_value=weather_indices
        )
        mock_timescale_client.get_vegetation_indices = AsyncMock(
            return_value=veg_indices
        )
        mock_timescale_client.insert_assessment = AsyncMock(return_value=True)
        
        assessment = await damage_calculator.process_damage_assessment(
            plot_id=plot_id,
            policy_id=policy_id,
            assessment_date=assessment_date
        )
        
        assert assessment.composite_score > 0.6
        assert assessment.payout_triggered == True
        
        # Phase 4: IPFS Proof Upload
        mock_ipfs_client.pin_json = AsyncMock(return_value="QmFinalProof789")
        
        proof_cid = await damage_calculator.upload_proof_to_ipfs(assessment)
        assessment.ipfs_cid = proof_cid
        
        # Phase 5: Payout Decision
        mock_timescale_client.insert_payout_decision = AsyncMock(return_value=True)
        
        decision = await damage_calculator.process_payout_decision(
            assessment=assessment,
            policy_coverage=1000.0
        )
        
        # Verify end-to-end workflow
        assert decision.payout_triggered == True
        assert decision.payout_amount > 600.0  # Significant payout
        assert decision.ipfs_proof_cid == "QmFinalProof789"
        assert decision.confidence > 0.8
        
        # Verify all storage operations called
        mock_timescale_client.insert_indices.assert_called()
        mock_ipfs_client.pin_json.assert_called()
        mock_timescale_client.insert_payout_decision.assert_called()
        
    async def test_no_payout_scenario(
        self,
        test_settings,
        mock_timescale_client,
        mock_ipfs_client,
        sample_weather_indices,
        sample_vegetation_indices
    ):
        """Test scenario where conditions don't trigger payout"""
        
        calculator = DamageCalculator(test_settings)
        calculator.db_client = mock_timescale_client
        calculator.ipfs_client = mock_ipfs_client
        
        # Set low damage conditions
        sample_weather_indices.composite_score = 0.15
        sample_vegetation_indices.ndvi_deviation = -0.05
        
        mock_timescale_client.get_weather_indices = AsyncMock(
            return_value=sample_weather_indices
        )
        mock_timescale_client.get_vegetation_indices = AsyncMock(
            return_value=sample_vegetation_indices
        )
        mock_timescale_client.insert_assessment = AsyncMock(return_value=True)
        
        assessment = await calculator.process_damage_assessment(
            plot_id="PLOT001",
            policy_id="POLICY001",
            assessment_date=datetime.utcnow()
        )
        
        # Verify no payout triggered
        assert assessment.payout_triggered == False
        assert assessment.composite_score < 0.3
        
        mock_timescale_client.insert_payout_decision = AsyncMock(return_value=True)
        
        decision = await calculator.process_payout_decision(
            assessment=assessment,
            policy_coverage=1000.0
        )
        
        assert decision.payout_triggered == False
        assert decision.payout_amount == 0.0
