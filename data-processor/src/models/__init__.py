"""
Data models for MicroCrop Data Processor.
"""

from .weather import (
    WeatherData,
    WeatherIndices,
    DroughtIndex,
    FloodIndex,
    HeatStressIndex,
)
from .satellite import (
    SatelliteImage,
    VegetationIndices,
    NDVIData,
    CloudCoverAssessment,
)
from .damage import (
    DamageAssessment,
    DamageScore,
    PayoutTrigger,
)

__all__ = [
    # Weather models
    "WeatherData",
    "WeatherIndices",
    "DroughtIndex",
    "FloodIndex",
    "HeatStressIndex",
    # Satellite models
    "SatelliteImage",
    "VegetationIndices",
    "NDVIData",
    "CloudCoverAssessment",
    # Damage models
    "DamageAssessment",
    "DamageScore",
    "PayoutTrigger",
]
