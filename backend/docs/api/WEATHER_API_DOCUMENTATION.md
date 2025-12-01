# Weather API Documentation

Complete API documentation for weather data management, station monitoring, and forecast retrieval in the MicroCrop parametric insurance platform.

## Base URL
```
http://localhost:3000/api/weather
```

---

## Overview

The Weather API integrates with **WeatherXM Pro API** to provide:
- Real-time weather observations from distributed weather stations
- Historical weather data analysis
- 7-day weather forecasts using H3 geospatial indexing
- Weather stress index calculation for crop monitoring
- Automated trigger detection for drought/flood events

### Integration: WeatherXM Pro API
- **Version:** v1.12.1
- **Geospatial:** H3 hexagonal grid (resolution 8, ~0.5km²)
- **Coverage:** Kenya and surrounding regions
- **Data Frequency:** Real-time (5-15 minute intervals)
- **Forecast:** 7-day daily and hourly forecasts

---

## Endpoints

### 1. WeatherXM Webhook Handler

Receives real-time weather observations from WeatherXM stations and processes them for nearby plots.

**Endpoint:** `POST /api/weather/webhook`

**Security Note:**  
WeatherXM does not provide webhook signature verification (no webhook secret). Security is implemented through:
- Optional API key validation (set `WEATHERXM_WEBHOOK_API_KEY` in `.env`)
- Request validation and data sanitization
- Rate limiting (configured in middleware)
- IP whitelisting (optional, if WeatherXM provides static IPs)

**Headers (Optional):**
```
X-API-Key: your-webhook-api-key
```
or
```
Authorization: Bearer your-webhook-api-key
```

**Request Body:**
```json
{
  "stationId": "WXM-KE-NAK-001",
  "timestamp": "2025-11-06T12:00:00Z",
  "observation": {
    "temperature": 28.5,
    "humidity": 65,
    "precipitation_rate": 0.5,
    "wind_speed": 3.2,
    "wind_direction": 180,
    "pressure": 1013.25
  }
}
```

**Required Fields:**
- `stationId` (string): WeatherXM station identifier
- `observation` (object): Weather observation data
  - `temperature` (number): Temperature in °C
  - `humidity` (number): Relative humidity (%)
  - `precipitation_rate` (number): Rain rate in mm/h
  - `wind_speed` (number): Wind speed in m/s

**Optional Fields:**
- `timestamp` (string): ISO 8601 datetime (defaults to current time)
- `observation.wind_direction` (number): Wind direction in degrees
- `observation.pressure` (number): Atmospheric pressure in hPa

**Success Response (200):**
```json
{
  "success": true,
  "message": "Weather data processed successfully",
  "data": {
    "stationId": "WXM-KE-NAK-001",
    "plotsAffected": 12,
    "timestamp": "2025-11-06T12:00:00Z"
  }
}
```

**Business Logic:**
1. Receives weather observation from WeatherXM
2. Finds all plots within 50km of station
3. Creates `WeatherEvent` records for each plot
4. Checks for drought/flood trigger conditions
5. Publishes damage assessment messages if triggers met

**Use Cases:**
- Automated weather data collection
- Real-time trigger detection
- Event-driven damage assessment
- Continuous monitoring of active policies

---

### 2. Get Weather Station Details

Retrieve details and latest observation for a specific WeatherXM station.

**Endpoint:** `GET /api/weather/station/:id`

**URL Parameters:**
- `id` (string): WeatherXM station ID

**Example:**
```
GET /api/weather/station/WXM-KE-NAK-001
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "stationId": "WXM-KE-NAK-001",
    "observation": {
      "temperature": 28.5,
      "humidity": 65,
      "precipitation_rate": 0.5,
      "wind_speed": 3.2,
      "wind_direction": 180,
      "pressure": 1013.25,
      "solar_radiation": 850,
      "uv_index": 7
    },
    "timestamp": "2025-11-06T12:00:00Z",
    "associatedPlots": 12,
    "plots": [
      {
        "id": "plot-uuid",
        "name": "Main Farm",
        "acreage": 2.5,
        "cropType": "MAIZE",
        "farmer": {
          "id": "farmer-uuid",
          "firstName": "John",
          "lastName": "Kamau",
          "phoneNumber": "+254712345678"
        }
      }
    ]
  }
}
```

**Error Responses:**

- **404 Not Found** - Station doesn't exist or no data available
```json
{
  "success": false,
  "error": "Station not found or no data available"
}
```

**Use Cases:**
- Monitoring specific weather stations
- Verifying station connectivity
- Checking data quality
- Understanding station coverage area

---

### 3. Get Plot Weather Data

Retrieve comprehensive weather information for a specific plot including historical data, current conditions, and forecast.

**Endpoint:** `GET /api/weather/plot/:plotId`

**URL Parameters:**
- `plotId` (string): Plot UUID

**Query Parameters:**
- `days` (number): Historical data period in days (default: 30)
- `forecast` (boolean): Include 7-day forecast (default: true)

**Examples:**
```
GET /api/weather/plot/plot-uuid
GET /api/weather/plot/plot-uuid?days=60&forecast=true
GET /api/weather/plot/plot-uuid?days=7&forecast=false
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "plot-uuid",
      "name": "Main Farm",
      "acreage": 2.5,
      "cropType": "MAIZE",
      "location": {
        "lat": -0.2921,
        "lon": 36.8219
      },
      "farmer": {
        "id": "farmer-uuid",
        "firstName": "John",
        "lastName": "Kamau",
        "phoneNumber": "+254712345678"
      },
      "activePolicies": 1
    },
    "currentWeather": {
      "stationId": "WXM-KE-NAK-001",
      "stationName": "Nakuru Station 1",
      "distance": 15.2,
      "observation": {
        "temperature": 28.5,
        "humidity": 65,
        "precipitation_rate": 0.5,
        "wind_speed": 3.2
      },
      "timestamp": "2025-11-06T12:00:00Z"
    },
    "nearbyStations": [
      {
        "id": "WXM-KE-NAK-001",
        "name": "Nakuru Station 1",
        "distance": 15.2,
        "location": {
          "lat": -0.3031,
          "lon": 36.0800
        }
      }
    ],
    "weatherHistory": {
      "events": [
        {
          "id": "event-uuid",
          "timestamp": "2025-11-06T12:00:00Z",
          "rainfall": 0.5,
          "temperature": 28.5,
          "humidity": 65,
          "windSpeed": 3.2
        }
      ],
      "count": 720,
      "stats": {
        "totalRainfall": "125.50",
        "avgRainfall": "0.17",
        "avgTemperature": "26.30",
        "avgHumidity": "68.50",
        "maxTemperature": "34.20",
        "minTemperature": "18.50",
        "rainyDays": 18,
        "totalDataPoints": 720
      }
    },
    "forecast": {
      "data": [
        {
          "date": "2025-11-07",
          "daily": {
            "temperature_min": 18,
            "temperature_max": 32,
            "precipitation_intensity": 2.5,
            "precipitation_probability": 60,
            "humidity": 70,
            "wind_speed": 3.5
          },
          "hourly": [
            {
              "timestamp": "2025-11-07T00:00:00Z",
              "temperature": 20,
              "precipitation_intensity": 0,
              "humidity": 75
            }
          ]
        }
      ],
      "analysis": {
        "totalPrecipitation": "45.50",
        "avgDailyPrecipitation": "6.50",
        "maxDailyPrecipitation": "15.20",
        "daysWithoutRain": 2,
        "highTempDays": 1,
        "droughtRisk": false,
        "floodRisk": false,
        "riskLevel": "LOW"
      }
    }
  }
}
```

**Weather Statistics Explained:**

**Historical Stats:**
- `totalRainfall`: Cumulative rainfall in the period (mm)
- `avgRainfall`: Average rainfall per observation (mm)
- `avgTemperature`: Mean temperature (°C)
- `maxTemperature`: Highest recorded temperature
- `minTemperature`: Lowest recorded temperature
- `rainyDays`: Days with >1mm rainfall
- `totalDataPoints`: Number of observations

**Forecast Analysis:**
- `droughtRisk`: true if <1mm/day average OR 5+ days without rain
- `floodRisk`: true if >50mm in one day OR >100mm total
- `riskLevel`: LOW, MEDIUM, or HIGH

**Error Responses:**

- **404 Not Found** - Plot doesn't exist
- **400 Bad Request** - Plot has no coordinates

---

### 4. Get Weather Stress Index

Calculate weather stress index for a plot based on rainfall deficit and heat stress.

**Endpoint:** `GET /api/weather/plot/:plotId/stress`

**URL Parameters:**
- `plotId` (string): Plot UUID

**Query Parameters:**
- `startDate` (string): Start date (YYYY-MM-DD, default: 30 days ago)
- `endDate` (string): End date (YYYY-MM-DD, default: today)

**Examples:**
```
GET /api/weather/plot/plot-uuid/stress
GET /api/weather/plot/plot-uuid/stress?startDate=2025-10-01&endDate=2025-11-06
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "plot": {
      "id": "plot-uuid",
      "name": "Main Farm",
      "cropType": "MAIZE"
    },
    "period": {
      "startDate": "2025-10-07T00:00:00.000Z",
      "endDate": "2025-11-06T00:00:00.000Z",
      "days": 30
    },
    "stressIndex": {
      "value": 0.42,
      "level": "MODERATE",
      "description": "Moderate weather stress. Some impact on crop health expected."
    },
    "weatherMetrics": {
      "totalRainfall": "65.50",
      "avgTemperature": "27.30",
      "maxTemperature": "35.20",
      "dataPoints": 720
    }
  }
}
```

**Weather Stress Index Formula:**
```javascript
// Rainfall stress (70% weight)
expectedRainfall = 100mm per month (baseline)
rainfallDeficit = max(0, expectedRainfall - actualRainfall)
rainfallStress = min(1, rainfallDeficit / expectedRainfall)

// Heat stress (30% weight)
hotDays = days with temperature > 35°C
heatStress = min(1, hotDays / totalDays)

// Combined Weather Stress Index (WSI)
WSI = (rainfallStress × 0.7) + (heatStress × 0.3)
```

**Stress Levels:**
- **LOW** (0-0.3): Minimal stress, favorable conditions
- **MODERATE** (0.3-0.5): Some impact on crop health
- **HIGH** (0.5-0.7): Significant impact on yield
- **SEVERE** (0.7-1.0): Critical damage expected

**Use Cases:**
- Pre-assessment before damage calculation
- Monitoring crop stress levels
- Triggering early warnings
- Validating trigger conditions

---

### 5. Find Nearby Weather Stations

Search for WeatherXM stations near a specific location.

**Endpoint:** `GET /api/weather/stations/near`

**Query Parameters:**
- `lat` (number): Latitude (-90 to 90)
- `lon` (number): Longitude (-180 to 180)
- `radius` (number): Search radius in meters (default: 50000)

**Examples:**
```
GET /api/weather/stations/near?lat=-0.2921&lon=36.8219
GET /api/weather/stations/near?lat=-0.2921&lon=36.8219&radius=25000
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": -0.2921,
      "longitude": 36.8219
    },
    "searchRadius": 50000,
    "stationsFound": 8,
    "stations": [
      {
        "id": "WXM-KE-NAK-001",
        "name": "Nakuru Station 1",
        "distance": 15234.5,
        "location": {
          "lat": -0.3031,
          "lon": 36.0800
        },
        "active": true
      },
      {
        "id": "WXM-KE-NAK-002",
        "name": "Nakuru Station 2",
        "distance": 28456.2,
        "location": {
          "lat": -0.2500,
          "lon": 36.0600
        },
        "active": true
      }
    ]
  }
}
```

**Sorting:**
- Stations are sorted by distance (nearest first)
- Distance calculated using Haversine formula

**Error Responses:**

- **400 Bad Request** - Missing or invalid parameters
```json
{
  "success": false,
  "error": "Missing required parameters: lat and lon"
}
```

```json
{
  "success": false,
  "error": "Invalid coordinates or radius"
}
```

**Use Cases:**
- Finding weather stations for new plots
- Verifying station coverage
- Planning station assignments
- Coverage gap analysis

---

### 6. Update Plot Weather Station

Assign or remove a WeatherXM station for a plot.

**Endpoint:** `PUT /api/weather/plot/:plotId/station`

**URL Parameters:**
- `plotId` (string): Plot UUID

**Request Body:**
```json
{
  "stationId": "WXM-KE-NAK-001"
}
```

**To Remove Station:**
```json
{
  "stationId": null
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Weather station assigned successfully",
  "data": {
    "plotId": "plot-uuid",
    "plotName": "Main Farm",
    "stationId": "WXM-KE-NAK-001",
    "farmer": {
      "firstName": "John",
      "lastName": "Kamau"
    }
  }
}
```

**Error Responses:**

- **404 Not Found** - Plot doesn't exist

**Use Cases:**
- Manual station assignment
- Updating station after relocation
- Removing inactive stations
- Optimizing station coverage

---

## Weather Data Flow

### Automated Data Collection
```
WeatherXM Station
    ↓ (webhook)
POST /api/weather/webhook
    ↓
Weather Service
    ↓ (finds nearby plots)
Database (WeatherEvent)
    ↓ (checks triggers)
Damage Assessment Queue
    ↓
Damage Worker
    ↓
Payout Processing
```

### Manual Weather Queries
```
Frontend/Admin
    ↓
GET /api/weather/plot/:plotId
    ↓
Weather Service
    ↓ (queries WeatherXM API)
Real-time Data + Forecast
    ↓
Response with Analysis
```

---

## Trigger Detection

### Drought Detection
**Default Threshold:** <30mm rainfall over 30 days

**Logic:**
```javascript
dateFrom = today - 30 days
weatherEvents = getEvents(plotId, dateFrom, today)
totalRainfall = sum(weatherEvents.rainfall)

if (totalRainfall < 30mm) {
  triggerDroughtAssessment(policyId)
}
```

**Customizable Per Policy:**
- `droughtThreshold.rainfall_mm`: Minimum rainfall (default: 30)
- `droughtThreshold.period_days`: Time period (default: 30)

### Flood Detection
**Default Threshold:** >150mm rainfall in 48 hours

**Logic:**
```javascript
dateFrom = now - 48 hours
weatherEvents = getEvents(plotId, dateFrom, now)
totalRainfall = sum(weatherEvents.rainfall)

if (totalRainfall > 150mm) {
  triggerFloodAssessment(policyId)
}
```

**Customizable Per Policy:**
- `floodThreshold.rainfall_mm`: Maximum rainfall (default: 150)
- `floodThreshold.period_hours`: Time period (default: 48)

---

## H3 Geospatial Indexing

### Overview
Weather forecasts use **H3 hexagonal grid** for efficient geospatial queries.

**Resolution 8 Properties:**
- Area: ~0.461 km² per hexagon
- Coverage: Ideal for farm plots (0.5-5 acres)
- Neighbor distance: ~0.7 km

### Usage in API
```javascript
// Convert plot coordinates to H3 cell
const { lat, lon } = plotLocation;
const cellIndex = latLngToCell(lat, lon, 8);

// Fetch forecast for the cell
const forecast = await getForecast(cellIndex, from, to);
```

### Benefits
- Efficient spatial indexing
- Consistent cell sizes
- Fast neighbor queries
- Optimized for weather grid data

---

## Weather Stress Index (WSI)

### Calculation Methodology

**Components:**
1. **Rainfall Stress (70% weight)**
   - Expected: 100mm per 30 days (baseline)
   - Actual: Measured from weather events
   - Deficit: Expected - Actual
   - Stress: min(1, deficit / expected)

2. **Heat Stress (30% weight)**
   - Critical threshold: 35°C
   - Hot days: Count of days > 35°C
   - Stress: min(1, hotDays / totalDays)

**Formula:**
```
WSI = (rainfallStress × 0.7) + (heatStress × 0.3)
```

**Result Range:** 0.0 to 1.0
- 0.0 = No stress, ideal conditions
- 1.0 = Maximum stress, critical conditions

### Integration with Damage Assessment

WSI is used as the **weather component** in damage calculation:
```
damageIndex = (WSI × 0.6) + (vegetationIndex × 0.4)
```

---

## Testing with cURL

### Process Weather Webhook
```bash
curl -X POST http://localhost:3000/api/weather/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": "WXM-KE-NAK-001",
    "timestamp": "2025-11-06T12:00:00Z",
    "observation": {
      "temperature": 28.5,
      "humidity": 65,
      "precipitation_rate": 0.5,
      "wind_speed": 3.2
    }
  }'
```

### Get Station Details
```bash
curl http://localhost:3000/api/weather/station/WXM-KE-NAK-001
```

### Get Plot Weather
```bash
curl "http://localhost:3000/api/weather/plot/plot-uuid?days=30&forecast=true"
```

### Get Weather Stress Index
```bash
curl "http://localhost:3000/api/weather/plot/plot-uuid/stress?startDate=2025-10-01&endDate=2025-11-06"
```

### Find Nearby Stations
```bash
curl "http://localhost:3000/api/weather/stations/near?lat=-0.2921&lon=36.8219&radius=50000"
```

### Update Plot Station
```bash
curl -X PUT http://localhost:3000/api/weather/plot/plot-uuid/station \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": "WXM-KE-NAK-001"
  }'
```

---

## Data Models

### WeatherEvent
```prisma
model WeatherEvent {
  id          String   @id @default(uuid())
  plotId      String
  stationId   String
  timestamp   DateTime
  rainfall    Float    // mm or mm/h
  temperature Float    // °C
  humidity    Float    // %
  windSpeed   Float    // m/s
  createdAt   DateTime @default(now())
  
  plot        Plot     @relation(...)
}
```

### Plot (Weather-Related Fields)
```prisma
model Plot {
  id                String  @id @default(uuid())
  weatherStationId  String? // Assigned WeatherXM station
  latitude          Float
  longitude         Float
  // ... other fields
  
  weatherEvents     WeatherEvent[]
}
```

---

## Error Handling

All endpoints follow consistent error format:
```json
{
  "success": false,
  "error": "User-friendly error message",
  "details": "Technical details (dev mode only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Performance Considerations

### Webhook Processing
- Asynchronous trigger checking
- Message queue for damage assessments
- Batch processing for multiple plots

### Historical Data Queries
- Indexed by plotId and timestamp
- Pagination for large datasets
- Cached aggregations for stats

### Forecast Requests
- H3 cell-based caching
- 1-hour cache TTL
- Shared across nearby plots

---

## Integration Notes

### WeatherXM API Configuration
```javascript
// .env file
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1
WEATHERXM_API_KEY=your_api_key_here
```

### Webhook Setup
Configure WeatherXM to send observations to:
```
POST https://yourdomain.com/api/weather/webhook
```

### Rate Limits
- **WeatherXM API**: 1000 requests/hour
- **Webhook**: No rate limit (push-based)
- **Forecast**: 100 requests/hour (cached)

---

## Related Documentation

- [WeatherXM Integration Guide](./WEATHERXM_INTEGRATION.md)
- [Weather Service Implementation](../src/services/weather.service.js)
- [Claims API Documentation](./CLAIM_API_DOCUMENTATION.md)
- [Admin API Documentation](./ADMIN_API_DOCUMENTATION.md)

---

## Best Practices

### Station Assignment
1. Always use nearest station (<50km)
2. Verify station is active before assignment
3. Update if station goes offline
4. Monitor data quality regularly

### Data Collection
1. Store raw observations (don't transform)
2. Calculate aggregations on-demand
3. Keep historical data for at least 12 months
4. Archive old data for compliance

### Trigger Detection
1. Use conservative thresholds initially
2. Calibrate based on historical claims
3. Consider crop-specific requirements
4. Implement manual override capability

### Forecast Usage
1. Refresh forecasts daily
2. Use for proactive alerts
3. Don't trigger payouts based on forecasts
4. Combine with historical data for accuracy

---

**Version:** 1.0  
**Last Updated:** November 6, 2025  
**API Stability:** Production Ready
