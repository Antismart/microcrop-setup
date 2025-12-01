"""
FastAPI application initialization and configuration.

Provides:
- Application setup with middleware
- CORS configuration
- Error handlers
- Startup/shutdown events
- Health check endpoints
"""

import logging
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import get_settings
from storage.timescale_client import TimescaleClient
from storage.redis_cache import RedisCache
from storage.minio_client import MinIOClient
from storage.ipfs_client import IPFSClient

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize storage clients (shared across requests)
timescale_client = TimescaleClient()
redis_cache = RedisCache()
minio_client = MinIOClient()
ipfs_client = IPFSClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting MicroCrop Data Processor API")
    
    try:
        # Initialize database connections
        await timescale_client.connect()
        logger.info("TimescaleDB connected")
        
        # Initialize Redis
        await redis_cache.connect()
        logger.info("Redis connected")
        
        # Initialize MinIO
        minio_client.connect()
        logger.info("MinIO connected")
        
        # Initialize IPFS
        await ipfs_client.connect()
        logger.info("IPFS client connected")
        
        logger.info("All services initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}", exc_info=True)
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down MicroCrop Data Processor API")
    
    try:
        await timescale_client.disconnect()
        await redis_cache.disconnect()
        await ipfs_client.disconnect()
        logger.info("All services disconnected successfully")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


# Create FastAPI application
app = FastAPI(
    title="MicroCrop Data Processor API",
    description="REST API for parametric crop insurance data processing",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Custom exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions."""
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "path": request.url.path,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(
        f"Validation error: {exc.errors()}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
        },
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": 422,
                "message": "Validation error",
                "details": exc.errors(),
                "path": request.url.path,
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    logger.error(
        f"Unhandled exception: {exc}",
        extra={
            "path": request.url.path,
            "method": request.method,
        },
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "path": request.url.path,
            }
        },
    )


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    logger.info(
        f"Request: {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client_host": request.client.host if request.client else None,
        },
    )
    
    response = await call_next(request)
    
    logger.info(
        f"Response: {request.method} {request.url.path} - {response.status_code}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
        },
    )
    
    return response


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, any]:
    """
    Basic health check endpoint.
    
    Returns service health status.
    """
    return {
        "status": "healthy",
        "service": "microcrop-processor",
        "version": "1.0.0",
    }


# Detailed health check endpoint
@app.get("/health/detailed", tags=["Health"])
async def detailed_health_check() -> Dict[str, any]:
    """
    Detailed health check with service status.
    
    Returns health status for all services.
    """
    health_status = {
        "status": "healthy",
        "service": "microcrop-processor",
        "version": "1.0.0",
        "services": {},
    }
    
    # Check TimescaleDB
    try:
        await timescale_client.execute_query("SELECT 1")
        health_status["services"]["timescaledb"] = {"status": "healthy"}
    except Exception as e:
        health_status["services"]["timescaledb"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        await redis_cache.set("health_check", "ok", ttl=60)
        value = await redis_cache.get("health_check")
        health_status["services"]["redis"] = {
            "status": "healthy" if value == "ok" else "unhealthy"
        }
        if value != "ok":
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["redis"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"
    
    # Check MinIO
    try:
        buckets = minio_client.list_buckets()
        health_status["services"]["minio"] = {
            "status": "healthy",
            "bucket_count": len(buckets),
        }
    except Exception as e:
        health_status["services"]["minio"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_status["status"] = "degraded"
    
    return health_status


# Metrics endpoint
@app.get("/metrics", tags=["Monitoring"])
async def get_metrics() -> Dict[str, any]:
    """
    Get system metrics.
    
    Returns operational metrics for monitoring.
    """
    try:
        # Get metrics from database
        metrics = {
            "weather_data": {},
            "satellite_images": {},
            "damage_assessments": {},
        }
        
        # Weather data count (24 hours)
        query = "SELECT COUNT(*) as count FROM weather_data WHERE timestamp > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["weather_data"]["count_24h"] = result[0]["count"] if result else 0
        
        # Satellite images count (24 hours)
        query = "SELECT COUNT(*) as count FROM satellite_images WHERE capture_date > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["satellite_images"]["count_24h"] = result[0]["count"] if result else 0
        
        # Damage assessments count (24 hours)
        query = "SELECT COUNT(*) as count FROM damage_assessments WHERE created_at > NOW() - INTERVAL '24 hours'"
        result = await timescale_client.execute_query(query)
        metrics["damage_assessments"]["count_24h"] = result[0]["count"] if result else 0
        
        # Pending payouts
        query = "SELECT COUNT(*) as count FROM damage_assessments WHERE payout_status = 'pending'"
        result = await timescale_client.execute_query(query)
        metrics["damage_assessments"]["pending_payouts"] = result[0]["count"] if result else 0
        
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}", exc_info=True)
        return {"error": str(e)}


# Import and include routers
from .routes import router as api_router
from .websocket import ws_router

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root() -> Dict[str, str]:
    """
    API root endpoint.
    
    Returns basic API information.
    """
    return {
        "service": "MicroCrop Data Processor API",
        "version": "1.0.0",
        "docs": "/docs" if not settings.is_production else "disabled",
        "health": "/health",
        "api": "/api/v1",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.api.app:app",
        host="0.0.0.0",
        port=settings.API_PORT,
        reload=not settings.is_production,
        log_level=settings.LOG_LEVEL.lower(),
    )
