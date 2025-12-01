"""
Satellite imagery processor for MicroCrop parametric insurance.

Processes satellite imagery to calculate:
- NDVI (Normalized Difference Vegetation Index)
- EVI (Enhanced Vegetation Index)  
- LAI (Leaf Area Index)
- SAVI (Soil Adjusted Vegetation Index)
- NDWI (Normalized Difference Water Index)
- Cloud cover assessment
- Vegetation stress detection
- Growth stage estimation
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict
import numpy as np
import rasterio
from rasterio.mask import mask
from shapely.geometry import shape, box
import cv2
from scipy import ndimage

from config import get_settings
from models.satellite import (
    SatelliteImage,
    VegetationIndices,
    NDVIData,
    CloudCoverAssessment,
    GrowthStage,
)

settings = get_settings()
logger = logging.getLogger(__name__)


class SatelliteProcessor:
    """Process satellite imagery and calculate vegetation indices."""
    
    def __init__(self):
        """Initialize satellite processor."""
        self.settings = settings
        self.logger = logger
        
        # NDVI baselines from config
        self.ndvi_baseline_vegetative = settings.NDVI_BASELINE_VEGETATIVE
        self.ndvi_baseline_flowering = settings.NDVI_BASELINE_FLOWERING
        self.ndvi_baseline_fruiting = settings.NDVI_BASELINE_FRUITING
        
        # Cloud cover threshold
        self.max_cloud_cover = settings.SATELLITE_MAX_CLOUD_COVER
        
        self.logger.info("SatelliteProcessor initialized")
    
    async def process_satellite_capture(
        self,
        image_id: str,
        plot_id: str,
        policy_id: str,
        image_data: bytes,
        capture_date: datetime,
        satellite_source: str,
        plot_bounds: Dict[str, float],
    ) -> SatelliteImage:
        """
        Process a satellite image capture.
        
        Args:
            image_id: Unique image identifier
            plot_id: Plot identifier
            policy_id: Policy identifier
            image_data: Raw image bytes
            capture_date: Image capture timestamp
            satellite_source: Satellite/provider name
            plot_bounds: Plot boundary coordinates {north, south, east, west, lat, lon}
            
        Returns:
            Processed satellite image with indices
        """
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(
                f"Processing satellite image for plot {plot_id}",
                extra={
                    "image_id": image_id,
                    "plot_id": plot_id,
                    "policy_id": policy_id,
                    "source": satellite_source,
                    "capture_date": capture_date.isoformat(),
                }
            )
            
            # Save raw image to MinIO (will implement with storage client)
            # raw_image_url = await self.minio_client.upload_image(image_id, image_data)
            raw_image_url = f"minio://images/raw/{image_id}.tif"
            
            # Open image with rasterio
            with rasterio.MemoryFile(image_data) as memfile:
                with memfile.open() as dataset:
                    # Extract metadata
                    bands_available = [f"band_{i+1}" for i in range(dataset.count)]
                    image_width = dataset.width
                    image_height = dataset.height
                    resolution_meters = abs(dataset.transform[0])
                    
                    # Extract plot area
                    plot_geom = self._create_plot_geometry(plot_bounds)
                    plot_data, plot_transform = mask(dataset, [plot_geom], crop=True)
                    
                    # Identify bands
                    band_mapping = self._identify_bands(dataset, satellite_source)
                    
                    # Assess cloud cover
                    cloud_assessment = await self._assess_cloud_cover(
                        plot_data, band_mapping
                    )
                    
                    if not cloud_assessment.is_usable:
                        self.logger.warning(
                            f"Image unusable due to cloud cover: {cloud_assessment.cloud_cover_percentage}%",
                            extra={"image_id": image_id, "plot_id": plot_id}
                        )
                    
                    # Calculate vegetation indices
                    vegetation_indices = None
                    ndvi_analysis = None
                    processed_image_url = None
                    ndvi_raster_url = None
                    
                    if cloud_assessment.is_usable:
                        vegetation_indices = await self._calculate_vegetation_indices(
                            plot_data, band_mapping, plot_transform
                        )
                        
                        # Get historical baseline NDVI
                        baseline_ndvi = await self._get_baseline_ndvi(
                            plot_id, capture_date
                        )
                        
                        # Detailed NDVI analysis
                        ndvi_analysis = await self._analyze_ndvi(
                            vegetation_indices, baseline_ndvi, plot_id
                        )
                        
                        # Save processed outputs (will implement with storage client)
                        # processed_image_url = await self._save_processed_image(...)
                        # ndvi_raster_url = await self._save_ndvi_raster(...)
                        processed_image_url = f"minio://images/processed/{image_id}.tif"
                        ndvi_raster_url = f"minio://images/ndvi/{image_id}_ndvi.tif"
                    
                    # Estimate growth stage
                    growth_stage, stage_confidence = self._estimate_growth_stage(
                        vegetation_indices, capture_date, plot_id
                    )
                    
                    # Calculate overall quality
                    overall_quality = self._calculate_overall_quality(
                        cloud_assessment, vegetation_indices
                    )
                    
                    # Calculate plot area
                    plot_area_hectares = self._calculate_plot_area(plot_bounds)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Build satellite image result
            satellite_image = SatelliteImage(
                image_id=image_id,
                plot_id=plot_id,
                policy_id=policy_id,
                capture_date=capture_date,
                satellite_source=satellite_source,
                resolution_meters=resolution_meters,
                bands_available=bands_available,
                image_width=image_width,
                image_height=image_height,
                latitude=plot_bounds["lat"],
                longitude=plot_bounds["lon"],
                plot_area_hectares=plot_area_hectares,
                cloud_assessment=cloud_assessment,
                vegetation_indices=vegetation_indices,
                ndvi_analysis=ndvi_analysis,
                estimated_growth_stage=growth_stage,
                growth_stage_confidence=stage_confidence,
                raw_image_url=raw_image_url,
                processed_image_url=processed_image_url,
                ndvi_raster_url=ndvi_raster_url,
                processing_timestamp=datetime.utcnow(),
                processor_version=settings.APP_VERSION,
                processing_time_seconds=processing_time,
                overall_quality_score=overall_quality,
                is_valid_for_assessment=cloud_assessment.is_usable and overall_quality > 0.7,
            )
            
            self.logger.info(
                f"Satellite image processed for plot {plot_id}",
                extra={
                    "image_id": image_id,
                    "plot_id": plot_id,
                    "quality": overall_quality,
                    "usable": satellite_image.is_valid_for_assessment,
                    "processing_time": processing_time,
                }
            )
            
            # Store in TimescaleDB (will implement with storage client)
            # await self.timescale_client.store_satellite_image(satellite_image)
            
            # Emit Kafka event (will implement with Kafka client)
            # await self.kafka_producer.send_satellite_update(satellite_image)
            
            return satellite_image
            
        except Exception as e:
            self.logger.error(
                f"Error processing satellite image: {e}",
                extra={"image_id": image_id, "plot_id": plot_id, "error": str(e)},
                exc_info=True
            )
            raise
    
    def _create_plot_geometry(self, plot_bounds: Dict[str, float]):
        """Create plot geometry from bounds."""
        return box(
            plot_bounds["west"],
            plot_bounds["south"],
            plot_bounds["east"],
            plot_bounds["north"],
        )
    
    def _identify_bands(self, dataset, satellite_source: str) -> Dict[str, int]:
        """Identify spectral band indices based on satellite source."""
        # Common band configurations
        band_configs = {
            "Spexi": {"red": 0, "green": 1, "blue": 2, "nir": 3},
            "Sentinel-2": {"red": 3, "green": 2, "blue": 1, "nir": 7, "swir1": 11},
            "Landsat-8": {"red": 3, "green": 2, "blue": 1, "nir": 4, "swir1": 5},
        }
        
        # Default mapping
        default_mapping = {"red": 0, "green": 1, "blue": 2, "nir": 3}
        
        return band_configs.get(satellite_source, default_mapping)
    
    async def _assess_cloud_cover(
        self,
        image_data: np.ndarray,
        band_mapping: Dict[str, int],
    ) -> CloudCoverAssessment:
        """Assess cloud cover and image usability."""
        try:
            # Get bands
            if "blue" in band_mapping and "nir" in band_mapping:
                blue = image_data[band_mapping["blue"]]
                nir = image_data[band_mapping["nir"]]
                
                # Simple cloud detection using spectral threshold
                # Clouds are bright in blue and NIR
                blue_normalized = (blue - blue.min()) / (blue.max() - blue.min() + 1e-8)
                nir_normalized = (nir - nir.min()) / (nir.max() - nir.min() + 1e-8)
                
                # Cloud mask (high values in both bands)
                cloud_mask = (blue_normalized > 0.7) & (nir_normalized > 0.6)
                cloud_percentage = float(np.sum(cloud_mask) / cloud_mask.size * 100)
                
                # Shadow detection (low values in visible bands)
                shadow_mask = blue_normalized < 0.2
                shadow_percentage = float(np.sum(shadow_mask) / shadow_mask.size * 100)
                
                # Usable area
                usable_percentage = 100 - cloud_percentage - shadow_percentage
                
                # Quality score
                quality_score = usable_percentage / 100
                
                # Is usable?
                is_usable = cloud_percentage < self.max_cloud_cover and usable_percentage > 70
                
                return CloudCoverAssessment(
                    cloud_cover_percentage=cloud_percentage,
                    shadow_percentage=shadow_percentage,
                    usable_area_percentage=usable_percentage,
                    quality_score=quality_score,
                    is_usable=is_usable,
                    cloud_mask_confidence=0.85,
                    method_used="spectral_threshold",
                )
            else:
                # Cannot assess cloud cover without proper bands
                return CloudCoverAssessment(
                    cloud_cover_percentage=0.0,
                    shadow_percentage=0.0,
                    usable_area_percentage=100.0,
                    quality_score=0.8,
                    is_usable=True,
                    cloud_mask_confidence=0.5,
                    method_used="none",
                )
                
        except Exception as e:
            self.logger.error(f"Error assessing cloud cover: {e}", exc_info=True)
            # Return conservative assessment
            return CloudCoverAssessment(
                cloud_cover_percentage=50.0,
                shadow_percentage=0.0,
                usable_area_percentage=50.0,
                quality_score=0.5,
                is_usable=False,
                cloud_mask_confidence=0.3,
                method_used="error_fallback",
            )
    
    async def _calculate_vegetation_indices(
        self,
        image_data: np.ndarray,
        band_mapping: Dict[str, int],
        transform,
    ) -> VegetationIndices:
        """Calculate comprehensive vegetation indices."""
        try:
            # Extract bands
            red = image_data[band_mapping["red"]].astype(float)
            nir = image_data[band_mapping["nir"]].astype(float)
            
            # Calculate NDVI = (NIR - Red) / (NIR + Red)
            ndvi = np.where(
                (nir + red) != 0,
                (nir - red) / (nir + red),
                0
            )
            
            # NDVI statistics
            ndvi_mean = float(np.mean(ndvi))
            ndvi_std = float(np.std(ndvi))
            ndvi_min = float(np.min(ndvi))
            ndvi_max = float(np.max(ndvi))
            ndvi_median = float(np.median(ndvi))
            
            # Calculate EVI if we have blue band
            evi_mean = None
            evi_std = None
            if "blue" in band_mapping:
                blue = image_data[band_mapping["blue"]].astype(float)
                # EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
                evi = np.where(
                    (nir + 6*red - 7.5*blue + 1) != 0,
                    2.5 * (nir - red) / (nir + 6*red - 7.5*blue + 1),
                    0
                )
                evi_mean = float(np.mean(evi))
                evi_std = float(np.std(evi))
            
            # Calculate LAI (Leaf Area Index) from NDVI
            # Empirical relationship: LAI = -ln((0.69 - NDVI) / 0.59) / 0.91
            lai = np.where(
                ndvi < 0.69,
                -np.log((0.69 - ndvi) / 0.59) / 0.91,
                5.0  # Cap at 5.0
            )
            lai_mean = float(np.mean(lai[lai > 0]))
            lai_std = float(np.std(lai[lai > 0]))
            
            # Calculate SAVI (Soil Adjusted Vegetation Index)
            # SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L), where L=0.5
            L = 0.5
            savi = np.where(
                (nir + red + L) != 0,
                ((nir - red) / (nir + red + L)) * (1 + L),
                0
            )
            savi_mean = float(np.mean(savi))
            
            # Calculate NDWI if we have SWIR
            ndwi_mean = None
            if "swir1" in band_mapping:
                swir = image_data[band_mapping["swir1"]].astype(float)
                # NDWI = (NIR - SWIR) / (NIR + SWIR)
                ndwi = np.where(
                    (nir + swir) != 0,
                    (nir - swir) / (nir + swir),
                    0
                )
                ndwi_mean = float(np.mean(ndwi))
            
            # Classify vigor
            vigor_level = self._classify_vigor(ndvi_mean)
            
            # Spatial distribution analysis
            healthy_pixels = float(np.sum(ndvi > 0.6) / ndvi.size * 100)
            stressed_pixels = float(np.sum(ndvi < 0.4) / ndvi.size * 100)
            bare_soil_pixels = float(np.sum(ndvi < 0.2) / ndvi.size * 100)
            
            return VegetationIndices(
                ndvi_mean=ndvi_mean,
                ndvi_std=ndvi_std,
                ndvi_min=ndvi_min,
                ndvi_max=ndvi_max,
                ndvi_median=ndvi_median,
                evi_mean=evi_mean,
                evi_std=evi_std,
                lai_mean=lai_mean,
                lai_std=lai_std,
                savi_mean=savi_mean,
                ndwi_mean=ndwi_mean,
                vigor_level=vigor_level,
                healthy_pixels_percentage=healthy_pixels,
                stressed_pixels_percentage=stressed_pixels,
                bare_soil_percentage=bare_soil_pixels,
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating vegetation indices: {e}", exc_info=True)
            raise
    
    def _classify_vigor(self, ndvi_mean: float) -> str:
        """Classify vegetation vigor based on NDVI."""
        if ndvi_mean < 0.3:
            return "poor"
        elif ndvi_mean < 0.5:
            return "fair"
        elif ndvi_mean < 0.7:
            return "good"
        else:
            return "excellent"
    
    async def _get_baseline_ndvi(
        self,
        plot_id: str,
        capture_date: datetime,
    ) -> float:
        """Get historical baseline NDVI for comparison."""
        try:
            # In production, query TimescaleDB for historical average
            # For now, use configured baseline based on season
            month = capture_date.month
            
            # Simplified seasonal baseline
            if 3 <= month <= 5:  # Growing season
                return self.ndvi_baseline_vegetative
            elif 6 <= month <= 8:  # Flowering
                return self.ndvi_baseline_flowering
            elif 9 <= month <= 11:  # Fruiting
                return self.ndvi_baseline_fruiting
            else:  # Off-season
                return 0.4
                
        except Exception as e:
            self.logger.error(f"Error getting baseline NDVI: {e}", exc_info=True)
            return 0.5  # Default baseline
    
    async def _analyze_ndvi(
        self,
        vegetation_indices: VegetationIndices,
        baseline_ndvi: float,
        plot_id: str,
    ) -> NDVIData:
        """Perform detailed NDVI analysis."""
        try:
            current_ndvi = vegetation_indices.ndvi_mean
            
            # Calculate change from baseline
            ndvi_change = current_ndvi - baseline_ndvi
            ndvi_change_pct = (ndvi_change / baseline_ndvi * 100) if baseline_ndvi > 0 else 0
            
            # Determine trend
            if ndvi_change > 0.1:
                trend_direction = "increasing"
                trend_strength = min(1.0, abs(ndvi_change) / 0.3)
            elif ndvi_change < -0.1:
                trend_direction = "decreasing"
                trend_strength = min(1.0, abs(ndvi_change) / 0.3)
            else:
                trend_direction = "stable"
                trend_strength = 0.0
            
            # Stress detection
            stress_threshold = baseline_ndvi * 0.75  # 25% below baseline
            is_stressed = current_ndvi < stress_threshold
            stress_severity = max(0.0, (stress_threshold - current_ndvi) / stress_threshold) if is_stressed else 0.0
            
            # In production, query for stress duration
            stress_duration_days = 0
            if is_stressed:
                # Query TimescaleDB for consecutive days below threshold
                stress_duration_days = 7  # Placeholder
            
            # Get neighbor comparison (placeholder)
            neighbor_ndvi_mean = None
            relative_performance = None
            
            return NDVIData(
                current_ndvi=current_ndvi,
                baseline_ndvi=baseline_ndvi,
                ndvi_change=ndvi_change,
                ndvi_change_percentage=ndvi_change_pct,
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                is_stressed=is_stressed,
                stress_severity=stress_severity,
                stress_duration_days=stress_duration_days,
                neighbor_ndvi_mean=neighbor_ndvi_mean,
                relative_performance=relative_performance,
            )
            
        except Exception as e:
            self.logger.error(f"Error analyzing NDVI: {e}", exc_info=True)
            raise
    
    def _estimate_growth_stage(
        self,
        vegetation_indices: Optional[VegetationIndices],
        capture_date: datetime,
        plot_id: str,
    ) -> Tuple[GrowthStage, float]:
        """Estimate crop growth stage."""
        try:
            if not vegetation_indices:
                return GrowthStage.UNKNOWN, 0.0
            
            ndvi = vegetation_indices.ndvi_mean
            lai = vegetation_indices.lai_mean if vegetation_indices.lai_mean else 0
            
            # Simple heuristic based on NDVI and LAI
            if ndvi < 0.3:
                if lai < 0.5:
                    return GrowthStage.GERMINATION, 0.7
                else:
                    return GrowthStage.SENESCENCE, 0.6
            elif ndvi < 0.5:
                return GrowthStage.VEGETATIVE, 0.75
            elif ndvi < 0.65:
                return GrowthStage.FLOWERING, 0.8
            elif ndvi < 0.75:
                return GrowthStage.FRUITING, 0.8
            else:
                return GrowthStage.MATURITY, 0.85
                
        except Exception as e:
            self.logger.error(f"Error estimating growth stage: {e}", exc_info=True)
            return GrowthStage.UNKNOWN, 0.0
    
    def _calculate_overall_quality(
        self,
        cloud_assessment: CloudCoverAssessment,
        vegetation_indices: Optional[VegetationIndices],
    ) -> float:
        """Calculate overall image quality score."""
        # Cloud quality (60%)
        cloud_quality = cloud_assessment.quality_score * 0.6
        
        # Vegetation quality (40%)
        veg_quality = 0.0
        if vegetation_indices:
            # Check if NDVI values are in reasonable range
            if -0.5 <= vegetation_indices.ndvi_mean <= 1.0:
                veg_quality = 0.4
            else:
                veg_quality = 0.2
        
        return cloud_quality + veg_quality
    
    def _calculate_plot_area(self, plot_bounds: Dict[str, float]) -> float:
        """Calculate plot area in hectares."""
        try:
            # Simplified calculation assuming small area
            # In production, use proper geodesic calculation
            lat_diff = plot_bounds["north"] - plot_bounds["south"]
            lon_diff = plot_bounds["east"] - plot_bounds["west"]
            
            # Approximate: 1 degree ≈ 111 km at equator
            # Area in km²
            area_km2 = abs(lat_diff * 111) * abs(lon_diff * 111 * np.cos(np.radians(plot_bounds["lat"])))
            
            # Convert to hectares (1 km² = 100 hectares)
            area_hectares = area_km2 * 100
            
            return round(area_hectares, 2)
            
        except Exception as e:
            self.logger.error(f"Error calculating plot area: {e}", exc_info=True)
            return 1.0  # Default 1 hectare
