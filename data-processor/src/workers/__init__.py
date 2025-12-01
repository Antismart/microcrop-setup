"""
Celery workers package for MicroCrop data processor.

Contains distributed task definitions for:
- Weather data fetching and processing
- Satellite image ordering and processing
- Damage assessment calculations
- Oracle submissions to blockchain
"""

from .celery_app import celery_app

__all__ = ["celery_app"]
