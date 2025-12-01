"""
Unit Tests for Damage Calculator
Tests damage assessment and payout triggering logic
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock

from processors.damage_calculator import DamageCalculator
from models.damage import DamageAssessment, PayoutDecision


@pytest.mark.unit
@pytest.mark.asyncio
class TestDamageCalculator:
    """Test suite for DamageCalculator"""
    
    async def test_initialization(self, test_settings):
        """Test calculator initialization"""
        calculator = DamageCalculator(test_settings)
        assert calculator is not None
        assert calculator.settings == test_settings
        
    async def test_calculate_damage_score_low_damage(self, damage_calculator):
        """Test damage score with low damage conditions"""
        score = await damage_calculator.calculate_damage_score(
            weather_score=0.15,
            satellite_score=0.10,
            growth_stage="flowering"
        )
        
        assert 0.0 <= score <= 1.0
        assert score < 0.3  # Low damage
        
    async def test_calculate_damage_score_high_damage(self, damage_calculator):
        """Test damage score with high damage conditions"""
        score = await damage_calculator.calculate_damage_score(
            weather_score=0.85,
            satellite_score=0.75,
            growth_stage="flowering"  # Sensitive stage
        )
        
        assert 0.0 <= score <= 1.0
        assert score > 0.6  # High damage
        
    async def test_growth_stage_sensitivity(self, damage_calculator):
        """Test damage scoring varies by growth stage"""
        weather_score = 0.6
        satellite_score = 0.5
        
        # Flowering is most sensitive
        score_flowering = await damage_calculator.calculate_damage_score(
            weather_score, satellite_score, "flowering"
        )
        
        # Vegetative is less sensitive
        score_vegetative = await damage_calculator.calculate_damage_score(
            weather_score, satellite_score, "vegetative"
        )
        
        # Maturity is least sensitive
        score_maturity = await damage_calculator.calculate_damage_score(
            weather_score, satellite_score, "maturity"
        )
        
        assert score_flowering > score_vegetative > score_maturity
        
    async def test_calculate_confidence_score(self, damage_calculator):
        """Test confidence calculation"""
        confidence = await damage_calculator.calculate_confidence(
            weather_data_quality=0.95,
            satellite_data_quality=0.90,
            temporal_coverage=0.92
        )
        
        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.85
        
    async def test_calculate_confidence_low_quality(self, damage_calculator):
        """Test confidence with low quality data"""
        confidence = await damage_calculator.calculate_confidence(
            weather_data_quality=0.50,
            satellite_data_quality=0.45,
            temporal_coverage=0.60
        )
        
        assert 0.0 <= confidence <= 1.0
        assert confidence < 0.6
        
    async def test_check_payout_trigger_no_trigger(self, damage_calculator):
        """Test payout trigger check - no payout"""
        triggered, percentage = await damage_calculator.check_payout_trigger(
            damage_score=0.25,
            trigger_threshold=0.30,
            confidence=0.90
        )
        
        assert triggered == False
        assert percentage == 0.0
        
    async def test_check_payout_trigger_triggered(self, damage_calculator):
        """Test payout trigger check - payout triggered"""
        triggered, percentage = await damage_calculator.check_payout_trigger(
            damage_score=0.75,
            trigger_threshold=0.30,
            confidence=0.90
        )
        
        assert triggered == True
        assert 0.0 < percentage <= 100.0
        
    async def test_calculate_payout_percentage(self, damage_calculator):
        """Test payout percentage calculation"""
        # Low damage (30% score) = 30% payout
        payout_30 = await damage_calculator.calculate_payout_percentage(0.30)
        assert 25 <= payout_30 <= 35
        
        # Medium damage (50% score) = 50% payout
        payout_50 = await damage_calculator.calculate_payout_percentage(0.50)
        assert 45 <= payout_50 <= 55
        
        # Severe damage (80% score) = 80% payout
        payout_80 = await damage_calculator.calculate_payout_percentage(0.80)
        assert 75 <= payout_80 <= 85
        
        # Total loss (100% score) = 100% payout
        payout_100 = await damage_calculator.calculate_payout_percentage(1.0)
        assert payout_100 == 100.0
        
    async def test_calculate_payout_amount(self, damage_calculator):
        """Test payout amount calculation"""
        policy_coverage = 1000.0  # $1000 coverage
        
        # 50% damage = $500 payout
        amount_50 = await damage_calculator.calculate_payout_amount(
            payout_percentage=50.0,
            policy_coverage=policy_coverage
        )
        assert amount_50 == 500.0
        
        # 100% damage = $1000 payout
        amount_100 = await damage_calculator.calculate_payout_amount(
            payout_percentage=100.0,
            policy_coverage=policy_coverage
        )
        assert amount_100 == 1000.0
        
    async def test_create_evidence_summary(self, damage_calculator):
        """Test evidence summary creation"""
        summary = await damage_calculator.create_evidence_summary(
            weather_indices={
                "drought_index": 0.75,
                "flood_index": 0.15,
                "heat_stress_index": 0.45
            },
            vegetation_indices={
                "ndvi": 0.55,
                "baseline_ndvi": 0.78,
                "health_status": "stressed"
            }
        )
        
        assert isinstance(summary, dict)
        assert "weather" in summary
        assert "satellite" in summary
        assert "primary_cause" in summary
        
    async def test_process_damage_assessment(self, damage_calculator, sample_weather_indices, sample_vegetation_indices):
        """Test complete damage assessment process"""
        damage_calculator.db_client.get_weather_indices = AsyncMock(return_value=sample_weather_indices)
        damage_calculator.db_client.get_vegetation_indices = AsyncMock(return_value=sample_vegetation_indices)
        damage_calculator.db_client.insert_assessment = AsyncMock(return_value=True)
        
        assessment = await damage_calculator.process_damage_assessment(
            plot_id="PLOT001",
            policy_id="POLICY001",
            assessment_date=datetime.utcnow()
        )
        
        assert isinstance(assessment, DamageAssessment)
        assert assessment.plot_id == "PLOT001"
        assert assessment.policy_id == "POLICY001"
        assert 0.0 <= assessment.composite_score <= 1.0
        assert 0.0 <= assessment.confidence <= 1.0
        
    async def test_process_payout_decision(self, damage_calculator, sample_damage_assessment):
        """Test payout decision processing"""
        # Modify assessment to trigger payout
        sample_damage_assessment.composite_score = 0.75
        sample_damage_assessment.payout_triggered = True
        
        damage_calculator.ipfs_client.pin_json = AsyncMock(return_value="QmTestCID123")
        damage_calculator.db_client.insert_payout_decision = AsyncMock(return_value=True)
        
        decision = await damage_calculator.process_payout_decision(
            assessment=sample_damage_assessment,
            policy_coverage=1000.0
        )
        
        assert isinstance(decision, PayoutDecision)
        assert decision.payout_triggered == True
        assert decision.payout_amount > 0
        assert decision.ipfs_proof_cid is not None
        
    async def test_process_payout_no_trigger(self, damage_calculator, sample_damage_assessment):
        """Test payout decision when threshold not met"""
        # Low damage - no payout
        sample_damage_assessment.composite_score = 0.15
        sample_damage_assessment.payout_triggered = False
        
        damage_calculator.db_client.insert_payout_decision = AsyncMock(return_value=True)
        
        decision = await damage_calculator.process_payout_decision(
            assessment=sample_damage_assessment,
            policy_coverage=1000.0
        )
        
        assert decision.payout_triggered == False
        assert decision.payout_amount == 0.0
        
    async def test_upload_proof_to_ipfs(self, damage_calculator, sample_damage_assessment):
        """Test IPFS proof upload"""
        damage_calculator.ipfs_client.pin_json = AsyncMock(return_value="QmProofCID456")
        
        cid = await damage_calculator.upload_proof_to_ipfs(sample_damage_assessment)
        
        assert cid == "QmProofCID456"
        damage_calculator.ipfs_client.pin_json.assert_called_once()
        
    async def test_validate_assessment_data_complete(self, damage_calculator):
        """Test validation of complete assessment data"""
        is_valid = await damage_calculator.validate_assessment_data(
            weather_data_points=30,
            satellite_images=4,
            minimum_weather_points=20,
            minimum_satellite_images=2
        )
        
        assert is_valid == True
        
    async def test_validate_assessment_data_incomplete(self, damage_calculator):
        """Test validation of incomplete assessment data"""
        is_valid = await damage_calculator.validate_assessment_data(
            weather_data_points=10,
            satellite_images=1,
            minimum_weather_points=20,
            minimum_satellite_images=2
        )
        
        assert is_valid == False
        
    async def test_aggregate_multiple_plots(self, damage_calculator):
        """Test aggregating damage across multiple plots"""
        plot_scores = {
            "PLOT001": 0.65,
            "PLOT002": 0.72,
            "PLOT003": 0.58
        }
        
        aggregate_score = await damage_calculator.aggregate_plot_scores(plot_scores)
        
        assert 0.0 <= aggregate_score <= 1.0
        assert 0.6 <= aggregate_score <= 0.75  # Average of plots
        
    async def test_temporal_damage_progression(self, damage_calculator):
        """Test tracking damage progression over time"""
        historical_scores = [
            (datetime.utcnow() - timedelta(days=30), 0.20),
            (datetime.utcnow() - timedelta(days=20), 0.35),
            (datetime.utcnow() - timedelta(days=10), 0.50),
            (datetime.utcnow(), 0.65)
        ]
        
        trend = await damage_calculator.analyze_damage_trend(historical_scores)
        
        assert trend["direction"] == "increasing"
        assert trend["severity"] in ["low", "moderate", "high", "severe"]
        
    async def test_confidence_threshold_filtering(self, damage_calculator):
        """Test filtering assessments below confidence threshold"""
        should_process = await damage_calculator.check_confidence_threshold(
            confidence=0.55,
            minimum_threshold=0.60
        )
        
        assert should_process == False
        
        should_process_high = await damage_calculator.check_confidence_threshold(
            confidence=0.85,
            minimum_threshold=0.60
        )
        
        assert should_process_high == True
        
    async def test_edge_case_zero_damage(self, damage_calculator):
        """Test handling of zero damage scenario"""
        score = await damage_calculator.calculate_damage_score(
            weather_score=0.0,
            satellite_score=0.0,
            growth_stage="vegetative"
        )
        
        assert score == 0.0
        
        triggered, percentage = await damage_calculator.check_payout_trigger(
            damage_score=0.0,
            trigger_threshold=0.30,
            confidence=0.95
        )
        
        assert triggered == False
        assert percentage == 0.0
        
    async def test_edge_case_total_loss(self, damage_calculator):
        """Test handling of total loss scenario"""
        score = await damage_calculator.calculate_damage_score(
            weather_score=1.0,
            satellite_score=1.0,
            growth_stage="flowering"
        )
        
        assert score >= 0.9  # Nearly total loss
        
        triggered, percentage = await damage_calculator.check_payout_trigger(
            damage_score=1.0,
            trigger_threshold=0.30,
            confidence=0.95
        )
        
        assert triggered == True
        assert percentage == 100.0
        
    async def test_concurrent_assessments(self, damage_calculator, sample_weather_indices, sample_vegetation_indices):
        """Test processing multiple concurrent assessments"""
        damage_calculator.db_client.get_weather_indices = AsyncMock(return_value=sample_weather_indices)
        damage_calculator.db_client.get_vegetation_indices = AsyncMock(return_value=sample_vegetation_indices)
        damage_calculator.db_client.insert_assessment = AsyncMock(return_value=True)
        
        plot_ids = ["PLOT001", "PLOT002", "PLOT003"]
        assessments = []
        
        for plot_id in plot_ids:
            assessment = await damage_calculator.process_damage_assessment(
                plot_id=plot_id,
                policy_id="POLICY001",
                assessment_date=datetime.utcnow()
            )
            assessments.append(assessment)
        
        assert len(assessments) == 3
        assert all(isinstance(a, DamageAssessment) for a in assessments)
