"""MicroCrop Data Processor - Production-grade agricultural data processing pipeline"""

__version__ = "1.0.0"
__author__ = "MicroCrop Team"
__description__ = "Real-time weather and satellite data processor for parametric crop insurance"

from .config.settings import get_settings

__all__ = ["get_settings"]
