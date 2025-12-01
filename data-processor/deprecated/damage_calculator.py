"""
Damage assessment calculator for MicroCrop parametric insurance.

Combines weather and satellite data to calculate:
- Weighted damage scores (60% weather + 40% satellite)
- Growth stage sensitivity adjustments
- Payout trigger evaluation
- Confidence scoring
- Deductible application
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import numpy as np

from config import get_settings
from models.weather import WeatherIndices
from models.satellite import SatelliteImage, GrowthStage
from models.damage import (
    DamageAssessment,
    DamageScore,
    PayoutTrigger,
    DamageType,
    PayoutStatus,
)

settings = get_settings()
logger = logging.getLogger(__name__)


class DamageCalculator:
    """Calculate crop damage and evaluate payout triggers."""
    
    def __init__(self):
        """Initialize damage calculator."""
        self.settings = settings
        self.logger = logger
        
        # Weights from config
        self.weather_weight = settings.DAMAGE_WEATHER_WEIGHT
        self.satellite_weight = settings.DAMAGE_SATELLITE_WEIGHT
        
        # Trigger and deductible
        self.trigger_threshold = settings.DAMAGE_TRIGGER_THRESHOLD
        self.deductible_percentage = settings.DAMAGE_DEDUCTIBLE_PERCENTAGE
        
        # Growth stage sensitivity multipliers
        self.growth_stage_multipliers = {
            GrowthStage.GERMINATION: 1.2,
            GrowthStage.VEGETATIVE: 1.0,
            GrowthStage.FLOWERING: 1.5,  # Most sensitive
            GrowthStage.FRUITING: 1.3,
            GrowthStage.MATURITY: 0.8,
            GrowthStage.SENESCENCE: 0.5,
            GrowthStage.UNKNOWN: 1.0,
        }
        
        self.logger.info(
            "DamageCalculator initialized",
            extra={
                "weather_weight": self.weather_weight,
                "satellite_weight": self.satellite_weight,
                "trigger_threshold": self.trigger_threshold,
            }
        )
    
    async def calculate_damage(
        self,
        assessment_id: str,
        plot_id: str,
        policy_id: str,
        farmer_address: str,
        assessment_start: datetime,
        assessment_end: datetime,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
        sum_insured_usdc: float,
        max_payout_usdc: float,
    ) -> DamageAssessment:
        """
        Calculate comprehensive damage assessment.
        
        Args:
            assessment_id: Unique assessment identifier
            plot_id: Plot identifier
            policy_id: Policy identifier
            farmer_address: Farmer wallet address
            assessment_start: Assessment period start
            assessment_end: Assessment period end
            weather_indices: Weather stress indices
            satellite_images: Satellite imagery data
            sum_insured_usdc: Total sum insured in USDC
            max_payout_usdc: Maximum payout amount
            
        Returns:
            Complete damage assessment with payout trigger
        """
        try:
            self.logger.info(
                f"Calculating damage for plot {plot_id}",
                extra={
                    "assessment_id": assessment_id,
                    "plot_id": plot_id,
                    "policy_id": policy_id,
                    "assessment_start": assessment_start.isoformat(),
                    "assessment_end": assessment_end.isoformat(),
                    "sum_insured": sum_insured_usdc,
                }
            )
            
            # Calculate assessment days
            assessment_days = (assessment_end - assessment_start).days + 1
            
            # Calculate damage scores
            damage_scores = await self._calculate_damage_scores(
                weather_indices, satellite_images
            )
            
            # Determine dominant damage type
            damage_type = self._determine_damage_type(weather_indices, damage_scores)
            
            # Determine severity
            damage_severity = self._determine_severity(damage_scores.composite_damage_score)
            
            # Get growth stage at damage
            growth_stage, sensitivity = self._get_growth_stage_sensitivity(
                satellite_images, weather_indices
            )
            
            # Apply growth stage adjustment
            adjusted_damage_score = min(
                1.0,
                damage_scores.composite_damage_score * sensitivity
            )
            
            # Update damage scores with adjustment
            damage_scores.composite_damage_score = adjusted_damage_score
            damage_scores.damage_percentage = adjusted_damage_score * 100
            
            # Apply deductible
            damage_scores.deductible_percentage = self.deductible_percentage
            damage_scores.payable_damage_percentage = max(
                0.0,
                damage_scores.damage_percentage - self.deductible_percentage
            )
            
            # Evaluate payout trigger
            payout_trigger = await self._evaluate_payout_trigger(
                damage_scores,
                damage_type,
                sum_insured_usdc,
                max_payout_usdc,
                weather_indices,
                satellite_images,
            )
            
            # Calculate confidence scores
            confidence_scores = self._calculate_confidence_scores(
                weather_indices, satellite_images
            )
            
            # Detect anomalies and warnings
            anomalies = self._detect_anomalies(weather_indices, satellite_images)
            warnings = self._generate_warnings(
                damage_scores, weather_indices, satellite_images
            )
            
            # Determine if oracle submission needed
            oracle_submission_required = payout_trigger.is_triggered or \
                                        damage_scores.composite_damage_score > 0.5
            
            # Build damage assessment
            assessment = DamageAssessment(
                assessment_id=assessment_id,
                plot_id=plot_id,
                policy_id=policy_id,
                farmer_address=farmer_address,
                assessment_start=assessment_start,
                assessment_end=assessment_end,
                assessment_days=assessment_days,
                damage_scores=damage_scores,
                payout_trigger=payout_trigger,
                damage_type=damage_type,
                damage_severity=damage_severity,
                growth_stage_at_damage=growth_stage.value,
                growth_stage_sensitivity=sensitivity,
                weather_data_points=weather_indices.data_points,
                satellite_images=len(satellite_images),
                weather_stations=weather_indices.weather_stations,
                data_quality_score=confidence_scores["data_quality"],
                confidence_score=confidence_scores["overall_confidence"],
                weather_data_confidence=confidence_scores["weather_confidence"],
                satellite_data_confidence=confidence_scores["satellite_confidence"],
                temporal_coverage_score=confidence_scores["temporal_coverage"],
                oracle_submission_required=oracle_submission_required,
                weather_oracle_submitted=False,
                satellite_oracle_submitted=False,
                damage_oracle_submitted=False,
                ipfs_cid=None,
                status=PayoutStatus.PENDING,
                approved_by=None,
                approved_at=None,
                assessment_notes=[],
                anomalies_detected=anomalies,
                warnings=warnings,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                processor_version=settings.APP_VERSION,
            )
            
            self.logger.info(
                f"Damage assessment completed for plot {plot_id}",
                extra={
                    "assessment_id": assessment_id,
                    "plot_id": plot_id,
                    "damage_score": damage_scores.composite_damage_score,
                    "damage_type": damage_type.value,
                    "payout_triggered": payout_trigger.is_triggered,
                    "payout_amount": payout_trigger.actual_payout_usdc,
                }
            )
            
            # Store in TimescaleDB (will implement with storage client)
            # await self.timescale_client.store_damage_assessment(assessment)
            
            # Emit Kafka event (will implement with Kafka client)
            # await self.kafka_producer.send_damage_assessment(assessment)
            
            return assessment
            
        except Exception as e:
            self.logger.error(
                f"Error calculating damage: {e}",
                extra={"assessment_id": assessment_id, "plot_id": plot_id, "error": str(e)},
                exc_info=True
            )
            raise
    
    async def _calculate_damage_scores(
        self,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
    ) -> DamageScore:
        """Calculate component damage scores."""
        try:
            # Weather damage score (60% weight)
            weather_damage = weather_indices.composite_stress_score
            
            # Component contributions
            drought_contrib = weather_indices.drought.drought_score
            flood_contrib = weather_indices.flood.flood_score
            heat_contrib = weather_indices.heat_stress.heat_stress_score
            
            # Satellite damage score (40% weight)
            satellite_damage = 0.0
            ndvi_decline = 0.0
            veg_stress = 0.0
            
            if satellite_images:
                # Use most recent valid image
                valid_images = [img for img in satellite_images if img.is_valid_for_assessment]
                if valid_images:
                    latest_image = max(valid_images, key=lambda x: x.capture_date)
                    
                    if latest_image.ndvi_analysis:
                        ndvi_decline = latest_image.ndvi_analysis.ndvi_change
                        veg_stress = latest_image.ndvi_analysis.stress_severity
                        
                        # Calculate satellite damage from NDVI decline
                        # Significant decline is -0.2 or more
                        if ndvi_decline < 0:
                            satellite_damage = min(1.0, abs(ndvi_decline) / 0.4)
            
            # Composite damage with weights
            composite_damage = (
                weather_damage * self.weather_weight +
                satellite_damage * self.satellite_weight
            )
            
            damage_percentage = composite_damage * 100
            
            return DamageScore(
                weather_damage_score=weather_damage,
                drought_contribution=drought_contrib,
                flood_contribution=flood_contrib,
                heat_contribution=heat_contrib,
                satellite_damage_score=satellite_damage,
                ndvi_decline=ndvi_decline,
                vegetation_stress_score=veg_stress,
                composite_damage_score=composite_damage,
                damage_percentage=damage_percentage,
                deductible_percentage=0.0,  # Will be set later
                payable_damage_percentage=0.0,  # Will be set later
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating damage scores: {e}", exc_info=True)
            raise
    
    def _determine_damage_type(
        self,
        weather_indices: WeatherIndices,
        damage_scores: DamageScore,
    ) -> DamageType:
        """Determine primary damage type."""
        if damage_scores.composite_damage_score < 0.2:
            return DamageType.NONE
        
        # Check for combined stress (drought + heat)
        if damage_scores.drought_contribution > 0.4 and damage_scores.heat_contribution > 0.4:
            return DamageType.COMBINED
        
        # Determine dominant factor
        max_contrib = max(
            damage_scores.drought_contribution,
            damage_scores.flood_contribution,
            damage_scores.heat_contribution,
        )
        
        if max_contrib == damage_scores.drought_contribution and max_contrib > 0.3:
            return DamageType.DROUGHT
        elif max_contrib == damage_scores.flood_contribution and max_contrib > 0.3:
            return DamageType.FLOOD
        elif max_contrib == damage_scores.heat_contribution and max_contrib > 0.3:
            return DamageType.HEAT_STRESS
        
        return DamageType.NONE
    
    def _determine_severity(self, damage_score: float) -> str:
        """Determine damage severity level."""
        if damage_score < 0.2:
            return "none"
        elif damage_score < 0.4:
            return "minor"
        elif damage_score < 0.6:
            return "moderate"
        elif damage_score < 0.8:
            return "severe"
        else:
            return "catastrophic"
    
    def _get_growth_stage_sensitivity(
        self,
        satellite_images: List[SatelliteImage],
        weather_indices: WeatherIndices,
    ) -> tuple[GrowthStage, float]:
        """Determine growth stage and sensitivity multiplier."""
        try:
            if satellite_images:
                # Use most recent valid image
                valid_images = [img for img in satellite_images if img.is_valid_for_assessment]
                if valid_images:
                    latest_image = max(valid_images, key=lambda x: x.capture_date)
                    growth_stage = latest_image.estimated_growth_stage
                    sensitivity = self.growth_stage_multipliers.get(growth_stage, 1.0)
                    return growth_stage, sensitivity
            
            # Default
            return GrowthStage.UNKNOWN, 1.0
            
        except Exception as e:
            self.logger.error(f"Error determining growth stage: {e}", exc_info=True)
            return GrowthStage.UNKNOWN, 1.0
    
    async def _evaluate_payout_trigger(
        self,
        damage_scores: DamageScore,
        damage_type: DamageType,
        sum_insured_usdc: float,
        max_payout_usdc: float,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
    ) -> PayoutTrigger:
        """Evaluate whether payout is triggered."""
        try:
            actual_damage = damage_scores.composite_damage_score
            is_triggered = actual_damage >= self.trigger_threshold
            
            # Build trigger reasons
            trigger_reasons = []
            if is_triggered:
                if damage_scores.drought_contribution >= self.trigger_threshold:
                    trigger_reasons.append(
                        f"Drought stress exceeded threshold ({damage_scores.drought_contribution:.2%})"
                    )
                if damage_scores.flood_contribution >= self.trigger_threshold:
                    trigger_reasons.append(
                        f"Flood risk exceeded threshold ({damage_scores.flood_contribution:.2%})"
                    )
                if damage_scores.heat_contribution >= self.trigger_threshold:
                    trigger_reasons.append(
                        f"Heat stress exceeded threshold ({damage_scores.heat_contribution:.2%})"
                    )
                if damage_scores.ndvi_decline < -0.2:
                    trigger_reasons.append(
                        f"NDVI declined >20% ({damage_scores.ndvi_decline:.2%})"
                    )
            
            # Calculate payout
            payout_percentage = damage_scores.payable_damage_percentage
            payout_amount = (payout_percentage / 100) * sum_insured_usdc
            
            # Apply max payout limit
            actual_payout = min(payout_amount, max_payout_usdc)
            
            # Validation checks
            meets_minimum = actual_damage >= self.trigger_threshold
            within_coverage = True  # Would check policy dates in production
            data_quality_sufficient = weather_indices.data_quality >= 0.7
            
            # Determine if manual review needed
            requires_review = False
            review_reasons = []
            
            if is_triggered and actual_payout > sum_insured_usdc * 0.8:
                requires_review = True
                review_reasons.append("Payout exceeds 80% of sum insured")
            
            if weather_indices.is_anomaly:
                requires_review = True
                review_reasons.append("Anomalous weather pattern detected")
            
            if weather_indices.confidence_score < 0.7:
                requires_review = True
                review_reasons.append("Low confidence score")
            
            return PayoutTrigger(
                is_triggered=is_triggered,
                trigger_threshold=self.trigger_threshold,
                actual_damage=actual_damage,
                trigger_reasons=trigger_reasons,
                primary_cause=damage_type if is_triggered else None,
                sum_insured_usdc=sum_insured_usdc,
                payout_percentage=payout_percentage,
                payout_amount_usdc=payout_amount,
                max_payout_usdc=max_payout_usdc,
                actual_payout_usdc=actual_payout,
                meets_minimum_threshold=meets_minimum,
                within_coverage_period=within_coverage,
                data_quality_sufficient=data_quality_sufficient,
                requires_manual_review=requires_review,
                review_reasons=review_reasons,
            )
            
        except Exception as e:
            self.logger.error(f"Error evaluating payout trigger: {e}", exc_info=True)
            raise
    
    def _calculate_confidence_scores(
        self,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
    ) -> Dict[str, float]:
        """Calculate various confidence scores."""
        try:
            # Weather data confidence
            weather_confidence = weather_indices.confidence_score
            
            # Satellite data confidence
            satellite_confidence = 0.0
            if satellite_images:
                valid_images = [img for img in satellite_images if img.is_valid_for_assessment]
                if valid_images:
                    avg_quality = np.mean([img.overall_quality_score for img in valid_images])
                    satellite_confidence = float(avg_quality)
            
            # Overall data quality (weighted average)
            data_quality = (
                weather_indices.data_quality * 0.6 +
                satellite_confidence * 0.4
            )
            
            # Temporal coverage (do we have enough data points over time?)
            temporal_coverage = min(1.0, weather_indices.data_points / 1000)
            
            # Overall confidence
            overall_confidence = (
                weather_confidence * 0.5 +
                satellite_confidence * 0.3 +
                temporal_coverage * 0.2
            )
            
            return {
                "weather_confidence": weather_confidence,
                "satellite_confidence": satellite_confidence,
                "data_quality": data_quality,
                "temporal_coverage": temporal_coverage,
                "overall_confidence": overall_confidence,
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating confidence scores: {e}", exc_info=True)
            return {
                "weather_confidence": 0.5,
                "satellite_confidence": 0.5,
                "data_quality": 0.5,
                "temporal_coverage": 0.5,
                "overall_confidence": 0.5,
            }
    
    def _detect_anomalies(
        self,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
    ) -> List[str]:
        """Detect anomalies in the data."""
        anomalies = []
        
        if weather_indices.is_anomaly:
            anomalies.append(
                f"Anomalous weather pattern detected (score: {weather_indices.anomaly_score:.2f})"
            )
        
        if weather_indices.data_quality < 0.7:
            anomalies.append(
                f"Low weather data quality ({weather_indices.data_quality:.2%})"
            )
        
        if satellite_images:
            unusable_images = [img for img in satellite_images if not img.is_valid_for_assessment]
            if len(unusable_images) > len(satellite_images) * 0.5:
                anomalies.append(
                    f"High proportion of unusable satellite images ({len(unusable_images)}/{len(satellite_images)})"
                )
        
        return anomalies
    
    def _generate_warnings(
        self,
        damage_scores: DamageScore,
        weather_indices: WeatherIndices,
        satellite_images: List[SatelliteImage],
    ) -> List[str]:
        """Generate assessment warnings."""
        warnings = []
        
        if damage_scores.composite_damage_score > 0.9:
            warnings.append("Catastrophic damage detected - verify data accuracy")
        
        if not satellite_images:
            warnings.append("No satellite imagery available - assessment based on weather data only")
        
        if weather_indices.data_points < 100:
            warnings.append(
                f"Limited weather data points ({weather_indices.data_points}) - confidence may be reduced"
            )
        
        if weather_indices.confidence_score < 0.6:
            warnings.append(
                f"Low overall confidence ({weather_indices.confidence_score:.2%}) - manual review recommended"
            )
        
        # Check for conflicting signals
        if damage_scores.weather_damage_score > 0.7 and damage_scores.satellite_damage_score < 0.3:
            warnings.append("Weather indicates high damage but satellite shows low stress - verify data")
        elif damage_scores.weather_damage_score < 0.3 and damage_scores.satellite_damage_score > 0.7:
            warnings.append("Satellite indicates high stress but weather shows low damage - verify data")
        
        return warnings
