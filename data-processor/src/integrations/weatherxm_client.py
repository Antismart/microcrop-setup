"""
WeatherXM API client for weather data retrieval.

Provides:
- Weather station data retrieval
- Historical data queries
- Real-time updates
- Rate limiting
- Retry logic with exponential backoff
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from config import get_settings
from models.weather import WeatherData

settings = get_settings()
logger = logging.getLogger(__name__)


class WeatherXMClient:
    """Client for WeatherXM API operations."""
    
    def __init__(self):
        """Initialize WeatherXM client."""
        self.settings = settings
        self.logger = logger
        
        # API configuration
        self.api_key = settings.WEATHERXM_API_KEY
        self.api_url = settings.WEATHERXM_API_URL
        self.rate_limit = settings.WEATHERXM_RATE_LIMIT_PER_MINUTE
        
        # HTTP client
        self.client: Optional[httpx.AsyncClient] = None
        
        # Rate limiting
        self.request_count = 0
        self.request_window_start = datetime.utcnow()
        
        self.logger.info("WeatherXMClient initialized")
    
    async def connect(self) -> None:
        """Initialize HTTP client."""
        try:
            self.logger.info("Connecting to WeatherXM API")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            self.client = httpx.AsyncClient(
                base_url=self.api_url,
                headers=headers,
                timeout=30.0,
            )
            
            # Test connection
            await self._test_connection()
            
            self.logger.info("Connected to WeatherXM API successfully")
            
        except Exception as e:
            self.logger.error(f"Error connecting to WeatherXM API: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
            self.logger.info("Disconnected from WeatherXM API")
    
    async def _test_connection(self) -> None:
        """Test API connection."""
        try:
            response = await self.client.get("/api/v1/me")
            response.raise_for_status()
            self.logger.info("WeatherXM API connection test successful")
        except Exception as e:
            self.logger.error(f"WeatherXM API connection test failed: {e}")
            raise
    
    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limiting."""
        now = datetime.utcnow()
        window_elapsed = (now - self.request_window_start).total_seconds()
        
        if window_elapsed >= 60:
            # Reset counter for new window
            self.request_count = 0
            self.request_window_start = now
        elif self.request_count >= self.rate_limit:
            # Wait until window resets
            wait_time = 60 - window_elapsed
            self.logger.warning(
                f"Rate limit reached, waiting {wait_time:.1f}s",
                extra={"requests": self.request_count, "limit": self.rate_limit}
            )
            await asyncio.sleep(wait_time)
            self.request_count = 0
            self.request_window_start = datetime.utcnow()
        
        self.request_count += 1
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_station_data(
        self,
        station_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[WeatherData]:
        """
        Get weather data from a specific station.
        
        Args:
            station_id: WeatherXM station identifier
            start_date: Start of data range (defaults to 24h ago)
            end_date: End of data range (defaults to now)
            
        Returns:
            List of weather data points
        """
        try:
            await self._check_rate_limit()
            
            # Default to last 24 hours
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(hours=24)
            
            self.logger.info(
                f"Fetching weather data from station {station_id}",
                extra={
                    "station_id": station_id,
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                }
            )
            
            params = {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            }
            
            response = await self.client.get(
                f"/api/v1/stations/{station_id}/data",
                params=params,
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Parse response into WeatherData models
            weather_data_list = []
            for record in data.get("data", []):
                weather_data = self._parse_weather_record(record, station_id)
                if weather_data:
                    weather_data_list.append(weather_data)
            
            self.logger.info(
                f"Retrieved {len(weather_data_list)} weather records from station {station_id}"
            )
            
            return weather_data_list
            
        except httpx.HTTPError as e:
            self.logger.error(
                f"HTTP error fetching station data: {e}",
                extra={"station_id": station_id},
                exc_info=True
            )
            raise
        except Exception as e:
            self.logger.error(
                f"Error fetching station data: {e}",
                extra={"station_id": station_id},
                exc_info=True
            )
            raise
    
    def _parse_weather_record(
        self,
        record: Dict[str, Any],
        station_id: str,
    ) -> Optional[WeatherData]:
        """Parse WeatherXM API response into WeatherData model."""
        try:
            return WeatherData(
                station_id=station_id,
                timestamp=datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00")),
                latitude=record.get("latitude", 0.0),
                longitude=record.get("longitude", 0.0),
                temperature=record.get("temperature", 0.0),
                feels_like=record.get("feels_like"),
                min_temperature=record.get("temperature_min"),
                max_temperature=record.get("temperature_max"),
                rainfall=record.get("precipitation", 0.0),
                rainfall_rate=record.get("precipitation_rate"),
                humidity=record.get("humidity", 0.0),
                pressure=record.get("pressure", 1013.25),
                wind_speed=record.get("wind_speed", 0.0),
                wind_direction=record.get("wind_direction"),
                wind_gust=record.get("wind_gust"),
                solar_radiation=record.get("solar_radiation"),
                uv_index=record.get("uv_index"),
                soil_moisture=record.get("soil_moisture"),
                soil_temperature=record.get("soil_temperature"),
                data_quality=record.get("quality", 1.0),
            )
        except Exception as e:
            self.logger.error(f"Error parsing weather record: {e}", exc_info=True)
            return None
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_nearby_stations(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
    ) -> List[Dict[str, Any]]:
        """
        Find weather stations near a location.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            radius_km: Search radius in kilometers
            
        Returns:
            List of nearby station information
        """
        try:
            await self._check_rate_limit()
            
            self.logger.info(
                f"Finding stations near ({latitude}, {longitude})",
                extra={"lat": latitude, "lon": longitude, "radius": radius_km}
            )
            
            params = {
                "lat": latitude,
                "lon": longitude,
                "radius": radius_km * 1000,  # Convert to meters
            }
            
            response = await self.client.get(
                "/api/v1/stations/nearby",
                params=params,
            )
            response.raise_for_status()
            
            data = response.json()
            stations = data.get("stations", [])
            
            self.logger.info(
                f"Found {len(stations)} stations within {radius_km}km"
            )
            
            return stations
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error finding nearby stations: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error finding nearby stations: {e}", exc_info=True)
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError),
    )
    async def get_station_info(self, station_id: str) -> Dict[str, Any]:
        """
        Get information about a specific station.
        
        Args:
            station_id: WeatherXM station identifier
            
        Returns:
            Station information
        """
        try:
            await self._check_rate_limit()
            
            response = await self.client.get(f"/api/v1/stations/{station_id}")
            response.raise_for_status()
            
            station_info = response.json()
            
            self.logger.info(f"Retrieved info for station {station_id}")
            
            return station_info
            
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error getting station info: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error getting station info: {e}", exc_info=True)
            raise
    
    async def get_current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> Optional[WeatherData]:
        """
        Get current weather for a location.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            Current weather data or None
        """
        try:
            # Find nearest station
            stations = await self.get_nearby_stations(latitude, longitude, radius_km=10.0)
            
            if not stations:
                self.logger.warning(
                    f"No stations found near ({latitude}, {longitude})"
                )
                return None
            
            # Get data from nearest station
            nearest_station = stations[0]
            station_id = nearest_station["id"]
            
            # Get last hour of data
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(hours=1)
            
            weather_data_list = await self.get_station_data(
                station_id, start_date, end_date
            )
            
            if weather_data_list:
                # Return most recent reading
                return weather_data_list[-1]
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting current weather: {e}", exc_info=True)
            return None
    
    async def get_historical_weather(
        self,
        latitude: float,
        longitude: float,
        start_date: datetime,
        end_date: datetime,
    ) -> List[WeatherData]:
        """
        Get historical weather data for a location.
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            start_date: Start of data range
            end_date: End of data range
            
        Returns:
            List of weather data points
        """
        try:
            # Find nearby stations
            stations = await self.get_nearby_stations(latitude, longitude, radius_km=10.0)
            
            if not stations:
                self.logger.warning(
                    f"No stations found near ({latitude}, {longitude})"
                )
                return []
            
            # Collect data from all nearby stations
            all_weather_data = []
            
            for station in stations[:3]:  # Use up to 3 nearest stations
                station_id = station["id"]
                
                try:
                    weather_data = await self.get_station_data(
                        station_id, start_date, end_date
                    )
                    all_weather_data.extend(weather_data)
                except Exception as e:
                    self.logger.warning(
                        f"Error getting data from station {station_id}: {e}"
                    )
                    continue
            
            # Sort by timestamp
            all_weather_data.sort(key=lambda x: x.timestamp)
            
            self.logger.info(
                f"Retrieved {len(all_weather_data)} historical weather records",
                extra={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                }
            )
            
            return all_weather_data
            
        except Exception as e:
            self.logger.error(f"Error getting historical weather: {e}", exc_info=True)
            return []
