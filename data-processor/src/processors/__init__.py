"""
MicroCrop Data Processors

Core processors for weather, satellite, damage calculations, and blockchain oracle.
"""

# Always available (no geospatial dependencies)
from .oracle_processor import OracleProcessor

# Optional: Weather and satellite processors (require geospatial libraries)
try:
    from .weather_processor import WeatherProcessor
    from .satellite_processor import SatelliteProcessor
    from .damage_calculator import DamageCalculator
    __all__ = ["WeatherProcessor", "SatelliteProcessor", "DamageCalculator", "OracleProcessor"]
except ImportError as e:
    # Geospatial dependencies not installed (shapely, rasterio, etc.)
    # Blockchain integration still works without these
    __all__ = ["OracleProcessor"]

__all__ = [
    "WeatherProcessor",
    "SatelliteProcessor",
    "DamageCalculator",
]
