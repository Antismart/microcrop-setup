"""
Weather data processor for MicroCrop parametric insurance.

Processes weather data from WeatherXM stations to calculate:
- Drought indices (rainfall deficit, soil moisture, ET demand)
- Flood indices (cumulative rainfall, intensity, saturation)
- Heat stress indices (temperature extremes, heat degree days)
- Composite stress scores with anomaly detection
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import numpy as np
from scipy import stats

from src.config import get_settings
from src.models.weather import (
    WeatherData,
    WeatherIndices,
    DroughtIndex,
    FloodIndex,
    HeatStressIndex,
)

settings = get_settings()
logger = logging.getLogger(__name__)


class WeatherProcessor:
    """Process weather data and calculate stress indices."""
    
    def __init__(self):
        """Initialize weather processor."""
        self.settings = settings
        self.logger = logger
        
        # Thresholds from config
        self.drought_rainfall_threshold = settings.DROUGHT_THRESHOLD_MM
        self.drought_days_threshold = settings.DROUGHT_SEVERE_DAYS
        self.flood_daily_threshold = settings.FLOOD_THRESHOLD_MM
        self.flood_intensity_threshold = settings.FLOOD_SEVERE_MM
        self.heat_temp_threshold = settings.HEAT_THRESHOLD_CELSIUS
        self.heat_days_threshold = 7  # Default: 7 consecutive hot days threshold
        
        self.logger.info("WeatherProcessor initialized")
    
    async def process_weather_update(
        self,
        weather_data: WeatherData,
        plot_id: str,
        policy_id: str,
    ) -> None:
        """
        Process a single weather update.
        
        Args:
            weather_data: Weather measurement from station
            plot_id: Plot identifier
            policy_id: Policy identifier
        """
        try:
            self.logger.info(
                f"Processing weather update for plot {plot_id}",
                extra={
                    "plot_id": plot_id,
                    "policy_id": policy_id,
                    "station_id": weather_data.station_id,
                    "timestamp": weather_data.timestamp.isoformat(),
                }
            )
            
            # Validate data quality
            if weather_data.data_quality < 0.7:
                self.logger.warning(
                    f"Low data quality: {weather_data.data_quality}",
                    extra={"plot_id": plot_id, "station_id": weather_data.station_id}
                )
            
            # Store in TimescaleDB (will implement with storage client)
            # await self.timescale_client.store_weather_data(weather_data, plot_id, policy_id)

            self.logger.debug(f"Weather update processed for plot {plot_id}")
            
        except Exception as e:
            self.logger.error(
                f"Error processing weather update: {e}",
                extra={"plot_id": plot_id, "error": str(e)},
                exc_info=True
            )
            raise
    
    async def calculate_weather_indices(
        self,
        plot_id: str,
        policy_id: str,
        start_date: datetime,
        end_date: datetime,
        weather_data: List[WeatherData],
    ) -> WeatherIndices:
        """
        Calculate comprehensive weather stress indices.
        
        Args:
            plot_id: Plot identifier
            policy_id: Policy identifier
            start_date: Assessment period start
            end_date: Assessment period end
            weather_data: Historical weather measurements
            
        Returns:
            Complete weather indices assessment
        """
        try:
            self.logger.info(
                f"Calculating weather indices for plot {plot_id}",
                extra={
                    "plot_id": plot_id,
                    "policy_id": policy_id,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "data_points": len(weather_data),
                }
            )
            
            if not weather_data:
                raise ValueError(f"No weather data available for plot {plot_id}")
            
            # Calculate individual indices
            drought_index = await self._calculate_drought_index(weather_data, start_date, end_date)
            flood_index = await self._calculate_flood_index(weather_data, start_date, end_date)
            heat_stress_index = await self._calculate_heat_stress_index(weather_data, start_date, end_date)
            
            # Calculate composite stress with compounding effects
            composite_score, dominant_stress = self._calculate_composite_stress(
                drought_index, flood_index, heat_stress_index
            )
            
            # Detect anomalies
            is_anomaly, anomaly_score = await self._detect_anomalies(weather_data)
            
            # Calculate data quality
            data_quality = self._calculate_data_quality(weather_data)
            confidence_score = self._calculate_confidence(data_quality, len(weather_data))
            
            # Extract station IDs
            weather_stations = list(set(wd.station_id for wd in weather_data))
            
            # Build weather indices
            indices = WeatherIndices(
                plot_id=plot_id,
                policy_id=policy_id,
                assessment_start=start_date,
                assessment_end=end_date,
                drought=drought_index,
                flood=flood_index,
                heat_stress=heat_stress_index,
                composite_stress_score=composite_score,
                dominant_stress=dominant_stress,
                weather_stations=weather_stations,
                data_points=len(weather_data),
                data_quality=data_quality,
                confidence_score=confidence_score,
                is_anomaly=is_anomaly,
                anomaly_score=anomaly_score if is_anomaly else None,
                processor_version=settings.APP_VERSION,
            )
            
            self.logger.info(
                f"Weather indices calculated for plot {plot_id}",
                extra={
                    "plot_id": plot_id,
                    "composite_score": composite_score,
                    "dominant_stress": dominant_stress,
                    "confidence": confidence_score,
                }
            )
            
            return indices
            
        except Exception as e:
            self.logger.error(
                f"Error calculating weather indices: {e}",
                extra={"plot_id": plot_id, "error": str(e)},
                exc_info=True
            )
            raise
    
    async def _calculate_drought_index(
        self,
        weather_data: List[WeatherData],
        start_date: datetime,
        end_date: datetime,
    ) -> DroughtIndex:
        """Calculate drought stress indicators."""
        try:
            # Sort data by timestamp
            sorted_data = sorted(weather_data, key=lambda x: x.timestamp)
            
            # Calculate daily rainfall totals
            daily_rainfall = self._aggregate_daily_rainfall(sorted_data)
            
            # Expected rainfall (historical average - simplified for now)
            days = (end_date - start_date).days + 1
            expected_rainfall = self.drought_rainfall_threshold * days
            actual_rainfall = sum(daily_rainfall.values())
            rainfall_deficit = max(0, expected_rainfall - actual_rainfall)
            
            # Consecutive dry days (<1mm)
            consecutive_dry = self._calculate_consecutive_dry_days(daily_rainfall)
            
            # Days since significant rain (>10mm)
            days_since_significant = self._calculate_days_since_significant_rain(daily_rainfall, end_date)
            
            # Soil moisture analysis (if available)
            soil_moisture_data = [wd.soil_moisture for wd in sorted_data if wd.soil_moisture is not None]
            soil_moisture_level = np.mean(soil_moisture_data) if soil_moisture_data else None
            soil_moisture_deficit = (100 - soil_moisture_level) if soil_moisture_level else None
            
            # Simplified ET demand calculation
            et_demand = None
            water_stress_ratio = None
            if soil_moisture_level:
                # Simplified Penman-Monteith approximation
                avg_temp = np.mean([wd.temperature for wd in sorted_data])
                avg_solar = np.mean([wd.solar_radiation for wd in sorted_data if wd.solar_radiation])
                if avg_solar:
                    et_demand = 0.408 * avg_solar * (avg_temp + 17.8) / 100  # Simplified
                    water_stress_ratio = et_demand / max(1, actual_rainfall / days)
            
            # Calculate drought score (0-1)
            drought_score = self._calculate_drought_score(
                rainfall_deficit,
                consecutive_dry,
                days_since_significant,
                soil_moisture_level,
                water_stress_ratio,
            )
            
            # Determine severity level
            severity_level = self._determine_drought_severity(drought_score)
            
            return DroughtIndex(
                rainfall_deficit=rainfall_deficit,
                consecutive_dry_days=consecutive_dry,
                days_since_significant_rain=days_since_significant,
                soil_moisture_level=soil_moisture_level,
                soil_moisture_deficit=soil_moisture_deficit,
                et_demand=et_demand,
                water_stress_ratio=water_stress_ratio,
                drought_score=drought_score,
                severity_level=severity_level,
                assessment_days=days,
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating drought index: {e}", exc_info=True)
            raise
    
    async def _calculate_flood_index(
        self,
        weather_data: List[WeatherData],
        start_date: datetime,
        end_date: datetime,
    ) -> FloodIndex:
        """Calculate flood risk indicators."""
        try:
            sorted_data = sorted(weather_data, key=lambda x: x.timestamp)
            daily_rainfall = self._aggregate_daily_rainfall(sorted_data)
            
            # Maximum daily rainfall
            max_daily = max(daily_rainfall.values()) if daily_rainfall else 0
            
            # Cumulative 3-day and 7-day rainfall
            cumulative_3day = self._calculate_cumulative_rainfall(daily_rainfall, 3)
            cumulative_7day = self._calculate_cumulative_rainfall(daily_rainfall, 7)
            
            # Maximum rainfall intensity (mm/h)
            max_intensity = max(
                (wd.rainfall_rate for wd in sorted_data if wd.rainfall_rate),
                default=0
            )
            
            # Heavy rain hours (>5mm/h)
            heavy_rain_hours = sum(
                1 for wd in sorted_data
                if wd.rainfall_rate and wd.rainfall_rate > 5.0
            )
            
            # Consecutive wet days (>10mm)
            consecutive_wet = self._calculate_consecutive_wet_days(daily_rainfall)
            
            # Sustained rainfall hours (continuous)
            sustained_hours = self._calculate_sustained_rainfall_hours(sorted_data)
            
            # Soil saturation (if available)
            soil_moisture_data = [wd.soil_moisture for wd in sorted_data if wd.soil_moisture]
            soil_saturation = np.max(soil_moisture_data) if soil_moisture_data else None
            drainage_capacity = None  # Would need soil type data
            
            # Calculate flood score (0-1)
            flood_score = self._calculate_flood_score(
                max_daily,
                cumulative_3day,
                max_intensity,
                consecutive_wet,
                soil_saturation,
            )
            
            # Determine risk level
            risk_level = self._determine_flood_risk(flood_score)
            
            days = (end_date - start_date).days + 1
            
            return FloodIndex(
                max_daily_rainfall=max_daily,
                cumulative_3day_rainfall=cumulative_3day,
                cumulative_7day_rainfall=cumulative_7day,
                max_rainfall_intensity=max_intensity,
                heavy_rain_hours=heavy_rain_hours,
                consecutive_wet_days=consecutive_wet,
                sustained_rainfall_hours=sustained_hours,
                soil_saturation_level=soil_saturation,
                drainage_capacity=drainage_capacity,
                flood_score=flood_score,
                risk_level=risk_level,
                assessment_days=days,
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating flood index: {e}", exc_info=True)
            raise
    
    async def _calculate_heat_stress_index(
        self,
        weather_data: List[WeatherData],
        start_date: datetime,
        end_date: datetime,
    ) -> HeatStressIndex:
        """Calculate heat stress indicators."""
        try:
            sorted_data = sorted(weather_data, key=lambda x: x.timestamp)
            
            # Daily maximum temperatures
            daily_max_temps = self._aggregate_daily_max_temperature(sorted_data)
            
            # Maximum temperature in period
            max_temp = max(daily_max_temps.values()) if daily_max_temps else 0
            avg_max_temp = np.mean(list(daily_max_temps.values())) if daily_max_temps else 0
            
            # Consecutive hot days (>35°C)
            consecutive_hot = self._calculate_consecutive_hot_days(daily_max_temps, 35)
            
            # Extreme heat days (>40°C)
            extreme_heat_days = sum(1 for temp in daily_max_temps.values() if temp > 40)
            
            # Growing degree days (base 10°C, optimal 20-30°C for most crops)
            heat_degree_days = self._calculate_heat_degree_days(sorted_data, base_temp=10)
            
            # Optimal temperature days (20-30°C)
            optimal_temp_days = sum(
                1 for temp in daily_max_temps.values()
                if 20 <= temp <= 30
            )
            
            # Heat-humidity index (if humidity available)
            heat_humidity_index = None
            if sorted_data and hasattr(sorted_data[0], 'humidity'):
                avg_humidity = np.mean([wd.humidity for wd in sorted_data])
                heat_humidity_index = max_temp + (0.5555 * (6.11 * np.exp(
                    5417.7530 * (1/273.15 - 1/(273.15 + max_temp))
                ) - 10))
            
            # Calculate heat stress score (0-1)
            heat_stress_score = self._calculate_heat_stress_score(
                max_temp,
                avg_max_temp,
                consecutive_hot,
                extreme_heat_days,
                heat_degree_days,
            )
            
            # Determine stress level
            stress_level = self._determine_heat_stress_level(heat_stress_score)
            
            days = (end_date - start_date).days + 1
            
            return HeatStressIndex(
                max_temperature=max_temp,
                avg_max_temperature=avg_max_temp,
                consecutive_hot_days=consecutive_hot,
                extreme_heat_days=extreme_heat_days,
                heat_degree_days=heat_degree_days,
                optimal_temp_days=optimal_temp_days,
                heat_humidity_index=heat_humidity_index,
                heat_stress_score=heat_stress_score,
                stress_level=stress_level,
                assessment_days=days,
            )
            
        except Exception as e:
            self.logger.error(f"Error calculating heat stress index: {e}", exc_info=True)
            raise
    
    def _aggregate_daily_rainfall(self, weather_data: List[WeatherData]) -> Dict[str, float]:
        """Aggregate rainfall by day."""
        daily_rainfall = {}
        for wd in weather_data:
            day_key = wd.timestamp.strftime("%Y-%m-%d")
            if day_key not in daily_rainfall:
                daily_rainfall[day_key] = 0
            daily_rainfall[day_key] += wd.rainfall
        return daily_rainfall
    
    def _aggregate_daily_max_temperature(self, weather_data: List[WeatherData]) -> Dict[str, float]:
        """Aggregate maximum temperature by day."""
        daily_max = {}
        for wd in weather_data:
            day_key = wd.timestamp.strftime("%Y-%m-%d")
            if day_key not in daily_max:
                daily_max[day_key] = wd.temperature
            else:
                daily_max[day_key] = max(daily_max[day_key], wd.temperature)
        return daily_max
    
    def _calculate_consecutive_dry_days(self, daily_rainfall: Dict[str, float]) -> int:
        """Calculate maximum consecutive dry days (<1mm)."""
        max_consecutive = 0
        current_consecutive = 0
        
        for day in sorted(daily_rainfall.keys()):
            if daily_rainfall[day] < 1.0:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0
        
        return max_consecutive
    
    def _calculate_consecutive_wet_days(self, daily_rainfall: Dict[str, float]) -> int:
        """Calculate maximum consecutive wet days (>10mm)."""
        max_consecutive = 0
        current_consecutive = 0
        
        for day in sorted(daily_rainfall.keys()):
            if daily_rainfall[day] > 10.0:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0
        
        return max_consecutive
    
    def _calculate_consecutive_hot_days(self, daily_max_temps: Dict[str, float], threshold: float) -> int:
        """Calculate maximum consecutive days above temperature threshold."""
        max_consecutive = 0
        current_consecutive = 0
        
        for day in sorted(daily_max_temps.keys()):
            if daily_max_temps[day] > threshold:
                current_consecutive += 1
                max_consecutive = max(max_consecutive, current_consecutive)
            else:
                current_consecutive = 0
        
        return max_consecutive
    
    def _calculate_days_since_significant_rain(
        self,
        daily_rainfall: Dict[str, float],
        end_date: datetime,
    ) -> int:
        """Calculate days since last significant rain (>10mm)."""
        sorted_days = sorted(daily_rainfall.keys(), reverse=True)
        
        for i, day in enumerate(sorted_days):
            if daily_rainfall[day] > 10.0:
                return i
        
        return len(sorted_days)
    
    def _calculate_cumulative_rainfall(self, daily_rainfall: Dict[str, float], days: int) -> float:
        """Calculate maximum cumulative rainfall over N days."""
        sorted_days = sorted(daily_rainfall.keys())
        if len(sorted_days) < days:
            return sum(daily_rainfall.values())
        
        max_cumulative = 0
        for i in range(len(sorted_days) - days + 1):
            cumulative = sum(daily_rainfall[sorted_days[i + j]] for j in range(days))
            max_cumulative = max(max_cumulative, cumulative)
        
        return max_cumulative
    
    def _calculate_sustained_rainfall_hours(self, weather_data: List[WeatherData]) -> float:
        """Calculate maximum sustained rainfall hours."""
        sorted_data = sorted(weather_data, key=lambda x: x.timestamp)
        max_sustained = 0
        current_sustained = 0
        
        for wd in sorted_data:
            if wd.rainfall > 0:
                current_sustained += 1
                max_sustained = max(max_sustained, current_sustained)
            else:
                current_sustained = 0
        
        # Convert measurements to hours (assuming hourly data)
        return max_sustained
    
    def _calculate_heat_degree_days(self, weather_data: List[WeatherData], base_temp: float) -> float:
        """Calculate accumulated heat degree days."""
        daily_temps = {}
        for wd in weather_data:
            day_key = wd.timestamp.strftime("%Y-%m-%d")
            if day_key not in daily_temps:
                daily_temps[day_key] = []
            daily_temps[day_key].append(wd.temperature)
        
        heat_dd = 0
        for day, temps in daily_temps.items():
            avg_temp = np.mean(temps)
            if avg_temp > base_temp:
                heat_dd += (avg_temp - base_temp)
        
        return heat_dd
    
    def _calculate_drought_score(
        self,
        rainfall_deficit: float,
        consecutive_dry: int,
        days_since_rain: int,
        soil_moisture: Optional[float],
        water_stress_ratio: Optional[float],
    ) -> float:
        """Calculate composite drought score (0-1)."""
        score = 0.0
        
        # Rainfall deficit component (0-0.4)
        if rainfall_deficit > 0:
            score += min(0.4, rainfall_deficit / 100)
        
        # Consecutive dry days component (0-0.3)
        if consecutive_dry >= self.drought_days_threshold:
            score += min(0.3, (consecutive_dry - self.drought_days_threshold) / 20)
        
        # Days since rain component (0-0.2)
        score += min(0.2, days_since_rain / 30)
        
        # Soil moisture component (0-0.1)
        if soil_moisture is not None:
            if soil_moisture < 30:
                score += 0.1
            elif soil_moisture < 50:
                score += 0.05
        
        return min(1.0, score)
    
    def _calculate_flood_score(
        self,
        max_daily: float,
        cumulative_3day: float,
        max_intensity: float,
        consecutive_wet: int,
        soil_saturation: Optional[float],
    ) -> float:
        """Calculate composite flood score (0-1)."""
        score = 0.0
        
        # Daily rainfall component (0-0.3)
        if max_daily > self.flood_daily_threshold:
            score += min(0.3, (max_daily - self.flood_daily_threshold) / 100)
        
        # Cumulative rainfall component (0-0.3)
        if cumulative_3day > 100:
            score += min(0.3, (cumulative_3day - 100) / 200)
        
        # Intensity component (0-0.2)
        if max_intensity > self.flood_intensity_threshold:
            score += min(0.2, (max_intensity - self.flood_intensity_threshold) / 20)
        
        # Consecutive wet days component (0-0.1)
        if consecutive_wet >= 5:
            score += min(0.1, consecutive_wet / 10)
        
        # Soil saturation component (0-0.1)
        if soil_saturation is not None and soil_saturation > 90:
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_heat_stress_score(
        self,
        max_temp: float,
        avg_max_temp: float,
        consecutive_hot: int,
        extreme_days: int,
        heat_dd: float,
    ) -> float:
        """Calculate composite heat stress score (0-1)."""
        score = 0.0
        
        # Maximum temperature component (0-0.3)
        if max_temp > self.heat_temp_threshold:
            score += min(0.3, (max_temp - self.heat_temp_threshold) / 15)
        
        # Average max temperature component (0-0.2)
        if avg_max_temp > 30:
            score += min(0.2, (avg_max_temp - 30) / 10)
        
        # Consecutive hot days component (0-0.3)
        if consecutive_hot >= self.heat_days_threshold:
            score += min(0.3, (consecutive_hot - self.heat_days_threshold) / 10)
        
        # Extreme heat days component (0-0.2)
        if extreme_days > 0:
            score += min(0.2, extreme_days / 5)
        
        return min(1.0, score)
    
    def _determine_drought_severity(self, score: float) -> str:
        """Determine drought severity level."""
        if score < 0.2:
            return "none"
        elif score < 0.4:
            return "mild"
        elif score < 0.6:
            return "moderate"
        elif score < 0.8:
            return "severe"
        else:
            return "extreme"
    
    def _determine_flood_risk(self, score: float) -> str:
        """Determine flood risk level."""
        if score < 0.2:
            return "none"
        elif score < 0.4:
            return "low"
        elif score < 0.6:
            return "moderate"
        elif score < 0.8:
            return "high"
        else:
            return "critical"
    
    def _determine_heat_stress_level(self, score: float) -> str:
        """Determine heat stress level."""
        if score < 0.2:
            return "none"
        elif score < 0.4:
            return "mild"
        elif score < 0.6:
            return "moderate"
        elif score < 0.8:
            return "severe"
        else:
            return "extreme"
    
    def _calculate_composite_stress(
        self,
        drought: DroughtIndex,
        flood: FloodIndex,
        heat: HeatStressIndex,
    ) -> Tuple[float, str]:
        """Calculate composite stress with compounding effects."""
        # Base scores
        drought_score = drought.drought_score
        flood_score = flood.flood_score
        heat_score = heat.heat_stress_score
        
        # Check for compounding (drought + heat)
        if drought_score > 0.4 and heat_score > 0.4:
            # Compounding effect
            composite = min(1.0, drought_score + heat_score * 0.5)
            dominant = "combined"
        else:
            # Take maximum score
            max_score = max(drought_score, flood_score, heat_score)
            composite = max_score
            
            # Determine dominant stress
            if max_score == drought_score and drought_score > 0.3:
                dominant = "drought"
            elif max_score == flood_score and flood_score > 0.3:
                dominant = "flood"
            elif max_score == heat_score and heat_score > 0.3:
                dominant = "heat"
            else:
                dominant = "none"
        
        return composite, dominant
    
    async def _detect_anomalies(self, weather_data: List[WeatherData]) -> Tuple[bool, Optional[float]]:
        """Detect anomalous weather patterns using statistical analysis."""
        try:
            if len(weather_data) < 30:
                return False, None
            
            # Extract temperature and rainfall patterns
            temps = np.array([wd.temperature for wd in weather_data])
            rainfall = np.array([wd.rainfall for wd in weather_data])
            
            # Z-score analysis
            temp_z_scores = np.abs(stats.zscore(temps))
            rain_z_scores = np.abs(stats.zscore(rainfall[rainfall > 0])) if len(rainfall[rainfall > 0]) > 0 else np.array([])
            
            # Check for outliers (z-score > 3)
            temp_anomalies = np.sum(temp_z_scores > 3)
            rain_anomalies = np.sum(rain_z_scores > 3) if len(rain_z_scores) > 0 else 0
            
            total_anomalies = temp_anomalies + rain_anomalies
            anomaly_score = min(1.0, total_anomalies / len(weather_data))
            
            is_anomaly = anomaly_score > 0.1
            
            return is_anomaly, anomaly_score if is_anomaly else None
            
        except Exception as e:
            self.logger.error(f"Error detecting anomalies: {e}", exc_info=True)
            return False, None
    
    def _calculate_data_quality(self, weather_data: List[WeatherData]) -> float:
        """Calculate overall data quality score."""
        if not weather_data:
            return 0.0
        
        quality_scores = [wd.data_quality for wd in weather_data]
        return float(np.mean(quality_scores))
    
    def _calculate_confidence(self, data_quality: float, data_points: int) -> float:
        """Calculate confidence score based on data quality and quantity."""
        # Quality component (0-0.7)
        quality_component = data_quality * 0.7
        
        # Quantity component (0-0.3)
        # Need at least 100 data points for full confidence
        quantity_component = min(0.3, (data_points / 100) * 0.3)
        
        return quality_component + quantity_component
