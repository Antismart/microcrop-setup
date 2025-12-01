"""
FastAPI application package for MicroCrop data processor.

Provides REST API endpoints for:
- Weather data submission and retrieval
- Satellite image ordering and processing
- Damage assessment triggering and querying
- System health and metrics
"""

from .app import app

__all__ = ["app"]
