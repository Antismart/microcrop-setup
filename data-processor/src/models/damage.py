"""
Damage assessment and payout models for MicroCrop.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class DamageType(str, Enum):
    """Types of crop damage."""
    DROUGHT = "drought"
    FLOOD = "flood"
    HEAT_STRESS = "heat_stress"
    COMBINED = "combined"
    NONE = "none"


class PayoutStatus(str, Enum):
    """Payout processing status."""
    PENDING = "pending"
    PENDING_BLOCKCHAIN = "pending_blockchain"  # Waiting for blockchain confirmation
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DamageScore(BaseModel):
    """Component damage scores."""
    
    # Weather-based damage (60% weight)
    weather_damage_score: float = Field(..., ge=0, le=1, description="Weather damage 0-1")
    drought_contribution: float = Field(..., ge=0, le=1, description="Drought contribution")
    flood_contribution: float = Field(..., ge=0, le=1, description="Flood contribution")
    heat_contribution: float = Field(..., ge=0, le=1, description="Heat contribution")
    
    # Satellite-based damage (40% weight)
    satellite_damage_score: float = Field(..., ge=0, le=1, description="Satellite damage 0-1")
    ndvi_decline: float = Field(..., description="NDVI decline from baseline")
    vegetation_stress_score: float = Field(..., ge=0, le=1, description="Vegetation stress")
    
    # Composite damage
    composite_damage_score: float = Field(..., ge=0, le=1, description="Final damage score 0-1")
    damage_percentage: float = Field(..., ge=0, le=100, description="Damage as percentage")
    
    # After deductible
    deductible_percentage: float = Field(..., ge=0, le=100, description="Deductible %")
    payable_damage_percentage: float = Field(..., ge=0, le=100, description="Payable damage %")


class PayoutTrigger(BaseModel):
    """Payout trigger evaluation."""
    
    is_triggered: bool = Field(..., description="Whether payout is triggered")
    trigger_threshold: float = Field(..., ge=0, le=1, description="Trigger threshold")
    actual_damage: float = Field(..., ge=0, le=1, description="Actual damage score")
    
    # Trigger reasons
    trigger_reasons: List[str] = Field(default_factory=list, description="Reasons for trigger")
    primary_cause: Optional[DamageType] = Field(None, description="Primary damage cause")
    
    # Payout calculation
    sum_insured_usdc: float = Field(..., gt=0, description="Sum insured amount in USDC")
    payout_percentage: float = Field(..., ge=0, le=100, description="Payout as % of sum insured")
    payout_amount_usdc: float = Field(..., ge=0, description="Calculated payout in USDC")
    
    # Limits
    max_payout_usdc: float = Field(..., gt=0, description="Maximum payout limit")
    actual_payout_usdc: float = Field(..., ge=0, description="Final payout after limits")
    
    # Validation
    meets_minimum_threshold: bool = Field(..., description="Meets minimum damage threshold")
    within_coverage_period: bool = Field(..., description="Within policy coverage period")
    data_quality_sufficient: bool = Field(..., description="Data quality meets standards")
    
    # Approval requirements
    requires_manual_review: bool = Field(False, description="Requires manual approval")
    review_reasons: List[str] = Field(default_factory=list, description="Reasons for review")


class DamageAssessment(BaseModel):
    """Complete damage assessment for a policy."""
    
    # Identification
    assessment_id: str = Field(..., description="Unique assessment identifier")
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    farmer_address: str = Field(..., description="Farmer wallet address")
    
    # Assessment period
    assessment_start: datetime = Field(..., description="Assessment period start")
    assessment_end: datetime = Field(..., description="Assessment period end")
    assessment_days: int = Field(..., gt=0, description="Number of days assessed")
    
    # Scores
    damage_scores: DamageScore = Field(..., description="Component damage scores")
    
    # Trigger evaluation
    payout_trigger: PayoutTrigger = Field(..., description="Payout trigger analysis")
    
    # Damage classification
    damage_type: DamageType = Field(..., description="Primary damage type")
    damage_severity: str = Field(..., description="none, minor, moderate, severe, catastrophic")
    
    # Growth stage impact
    growth_stage_at_damage: str = Field(..., description="Growth stage during damage")
    growth_stage_sensitivity: float = Field(..., ge=0, le=1, description="Stage sensitivity multiplier")
    
    # Data sources
    weather_data_points: int = Field(..., ge=0, description="Weather measurements used")
    satellite_images: int = Field(..., ge=0, description="Satellite images analyzed")
    weather_stations: List[str] = Field(default_factory=list, description="Weather stations")
    
    # Quality metrics
    data_quality_score: float = Field(..., ge=0, le=1, description="Overall data quality")
    confidence_score: float = Field(..., ge=0, le=1, description="Assessment confidence")
    
    # Confidence factors
    weather_data_confidence: float = Field(..., ge=0, le=1, description="Weather data confidence")
    satellite_data_confidence: float = Field(..., ge=0, le=1, description="Satellite data confidence")
    temporal_coverage_score: float = Field(..., ge=0, le=1, description="Temporal coverage quality")
    
    # Blockchain submission
    oracle_submission_required: bool = Field(..., description="Whether oracle submission needed")
    weather_oracle_submitted: bool = Field(False, description="Weather data submitted to oracle")
    satellite_oracle_submitted: bool = Field(False, description="Satellite data submitted to oracle")
    damage_oracle_submitted: bool = Field(False, description="Damage submitted to oracle")
    
    # IPFS proof
    ipfs_cid: Optional[str] = Field(None, description="IPFS CID for damage proof")
    proof_metadata: Dict[str, Any] = Field(default_factory=dict, description="Proof metadata")
    
    # Status
    status: PayoutStatus = Field(default=PayoutStatus.PENDING, description="Assessment status")
    approved_by: Optional[str] = Field(None, description="Approver address if manual")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    
    # Notes
    assessment_notes: List[str] = Field(default_factory=list, description="Assessment notes")
    anomalies_detected: List[str] = Field(default_factory=list, description="Detected anomalies")
    warnings: List[str] = Field(default_factory=list, description="Assessment warnings")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    processor_version: str = Field(..., description="Processor version")
    
    @validator("damage_severity")
    def validate_severity(cls, v):
        allowed = ["none", "minor", "moderate", "severe", "catastrophic"]
        if v not in allowed:
            raise ValueError(f"Severity must be one of {allowed}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "assessment_id": "assess_20240115_123456",
                "plot_id": "plot_123",
                "policy_id": "policy_456",
                "farmer_address": "0x1234567890abcdef",
                "assessment_start": "2024-01-01T00:00:00Z",
                "assessment_end": "2024-01-31T23:59:59Z",
                "assessment_days": 31,
                "damage_scores": {
                    "weather_damage_score": 0.72,
                    "drought_contribution": 0.85,
                    "flood_contribution": 0.0,
                    "heat_contribution": 0.45,
                    "satellite_damage_score": 0.68,
                    "ndvi_decline": -0.32,
                    "vegetation_stress_score": 0.68,
                    "composite_damage_score": 0.704,
                    "damage_percentage": 70.4,
                    "deductible_percentage": 30.0,
                    "payable_damage_percentage": 40.4
                },
                "payout_trigger": {
                    "is_triggered": True,
                    "trigger_threshold": 0.3,
                    "actual_damage": 0.704,
                    "trigger_reasons": ["Drought stress exceeded threshold", "NDVI declined >25%"],
                    "primary_cause": "drought",
                    "sum_insured_usdc": 5000.0,
                    "payout_percentage": 40.4,
                    "payout_amount_usdc": 2020.0,
                    "max_payout_usdc": 5000.0,
                    "actual_payout_usdc": 2020.0,
                    "meets_minimum_threshold": True,
                    "within_coverage_period": True,
                    "data_quality_sufficient": True,
                    "requires_manual_review": False
                },
                "damage_type": "drought",
                "damage_severity": "severe",
                "growth_stage_at_damage": "flowering",
                "growth_stage_sensitivity": 1.2,
                "weather_data_points": 8928,
                "satellite_images": 4,
                "confidence_score": 0.89,
                "status": "pending"
            }
        }


class PayoutDecision(BaseModel):
    """Simplified payout decision for testing"""
    
    decision_id: str = Field(..., description="Unique decision identifier")
    assessment_id: str = Field(..., description="Related assessment ID")
    plot_id: str = Field(..., description="Plot identifier")
    policy_id: str = Field(..., description="Policy identifier")
    decision_date: datetime = Field(..., description="Decision timestamp")
    
    payout_triggered: bool = Field(..., description="Whether payout was triggered")
    payout_percentage: float = Field(..., ge=0, le=100, description="Payout percentage")
    payout_amount: float = Field(..., ge=0, description="Payout amount in USDC")
    
    confidence: float = Field(..., ge=0, le=1, description="Decision confidence")
    ipfs_proof_cid: Optional[str] = Field(None, description="IPFS CID for proof")
    blockchain_tx_hash: Optional[str] = Field(None, description="Blockchain transaction hash")
    status: str = Field(default="pending", description="Decision status")
