# WeatherXM Pro API Integration - Implementation Guide

## Overview

The MicroCrop backend now has **full WeatherXM Pro API integration** for accessing real-time weather observations, historical data, and hyperlocal forecasts. This enables:

- **Real-time Weather Monitoring**: Fetch live weather data from nearby WeatherXM stations
- **Historical Analysis**: Access historical weather observations for damage assessment
- **Forecast Integration**: Get 7-day forecasts for predictive risk analysis
- **Trigger Detection**: Automatically detect drought/flood conditions based on real data

## Architecture

```
┌─────────────────────┐
│   Farm Plot         │
│   (lat, lon)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  WeatherService     │
│  - Fetch stations   │
│  - Get observations │
│  - Store events     │
│  - Check triggers   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ WeatherXM Pro API   │
│ pro.weatherxm.com   │
└──────────┬──────────┘
           │
           ├─> Stations
           ├─> Observations
           ├─> Historical Data
           └─> Forecasts (H3)
```

## WeatherXM Pro API Endpoints Implemented

### 1. Station Discovery

#### Get Stations in Bounding Box
```javascript
await weatherService.getStationsInBounds(minLat, minLon, maxLat, maxLon);

// Example
const stations = await weatherService.getStationsInBounds(
  -1.5, 36.0,  // SW corner (min_lat, min_lon)
  -1.0, 36.5   // NE corner (max_lat, max_lon)
);
```

**Response:**
```json
[
  {
    "id": "3355b780-438d-11ef-8e8d-b55568dc8e66",
    "name": "Nairobi Farm Station",
    "lastDayQod": 0.999,
    "cellIndex": "872a10089ffffff",
    "location": { "lat": -1.2921, "lon": 36.8219 },
    "elevation": 1795,
    "createdAt": "2024-09-06T00:01:49.685Z"
  }
]
```

#### Get Stations by Radius
```javascript
await weatherService.getStationsByRadius(lat, lon, radius);

// Example: Find stations within 50km of plot
const stations = await weatherService.getStationsByRadius(
  -1.2921,  // latitude
  36.8219,  // longitude
  50000     // radius in meters (50km)
);
```

### 2. Real-time Observations

#### Get Latest Observation
```javascript
await weatherService.getLatestObservation(stationId);

// Example
const data = await weatherService.getLatestObservation('3355b780-438d-11ef-8e8d-b55568dc8e66');
```

**Response:**
```json
{
  "observation": {
    "timestamp": "2025-11-05T10:42:20.248Z",
    "temperature": 24.5,
    "feels_like": 26.3,
    "dew_point": 15.2,
    "humidity": 62,
    "precipitation_rate": 0,
    "precipitation_accumulated": 125.4,
    "wind_speed": 3.2,
    "wind_gust": 5.7,
    "wind_direction": 180,
    "uv_index": 8,
    "pressure": 1013.2,
    "solar_irradiance": 850.5
  },
  "health": {
    "data_quality": { "score": 0.95 },
    "location_quality": { "score": 1.0 }
  }
}
```

### 3. Historical Data

#### Get Historical Observations
```javascript
await weatherService.getHistoricalData(stationId, date);

// Example: Get data for specific date
const history = await weatherService.getHistoricalData(
  '3355b780-438d-11ef-8e8d-b55568dc8e66',
  '2025-11-01'  // YYYY-MM-DD format
);
```

**Response:**
```json
{
  "date": "2025-11-01",
  "observations": [
    {
      "timestamp": "2025-11-01T00:00:00.000Z",
      "temperature": 18.5,
      "precipitation_accumulated": 120.3,
      "humidity": 75,
      "wind_speed": 2.1
    },
    // ... more observations throughout the day
  ],
  "health": {
    "data_quality": { "score": 0.95 }
  }
}
```

### 4. Forecast Data (H3 Cell-based)

#### Get 7-Day Forecast
```javascript
await weatherService.getForecast(cellIndex, from, to, include);

// Example
const forecast = await weatherService.getForecast(
  '872a10089ffffff',     // H3 cell index
  '2025-11-05',          // from date
  '2025-11-12',          // to date
  'daily,hourly'         // include both daily and hourly
);
```

**Response:**
```json
[
  {
    "tz": "Africa/Nairobi",
    "date": "2025-11-05",
    "daily": {
      "temperature_max": 26.5,
      "temperature_min": 15.2,
      "precipitation_probability": 0.3,
      "precipitation_intensity": 5.2
    },
    "hourly": [
      {
        "timestamp": "2025-11-05T06:00:00.000Z",
        "temperature": 18.5,
        "precipitation": 0,
        "precipitation_probability": 0.1,
        "wind_speed": 3.2,
        "humidity": 70
      }
      // ... more hourly data
    ]
  }
  // ... more days
]
```

## Key Features Implemented

### 1. Precipitation Accumulation Handling

WeatherXM uses a continuously increasing precipitation counter that resets. Our implementation handles this correctly:

```javascript
calculateDailyPrecipitation(observations) {
  let total = 0;
  
  for (let i = 1; i < observations.length; i++) {
    const previous = observations[i - 1].precipitation_accumulated || 0;
    const current = observations[i].precipitation_accumulated || 0;

    if (current >= previous) {
      // Normal case: accumulation continues
      total += (current - previous);
    } else {
      // Counter reset: current value is the difference
      total += current;
    }
  }

  return total;
}
```

### 2. H3 Geospatial Indexing

Uses H3 hexagonal hierarchical spatial index (resolution 8 = ~0.5km² hexagons):

```javascript
const { latLngToCell } = require('h3-js');

getH3CellIndex(lat, lon, resolution = 8) {
  return latLngToCell(lat, lon, resolution);
}
```

**Example:**
```javascript
const cellIndex = weatherService.getH3CellIndex(-1.2921, 36.8219);
// Returns: "872a10089ffffff"
```

### 3. Automated Weather Data Fetching

```javascript
// Fetch and store weather data for a plot
await weatherService.fetchAndStoreWeatherData(plotId, { lat, lon });
```

**What it does:**
1. Finds nearest WeatherXM station (within 50km)
2. Fetches latest observation
3. Stores in database as WeatherEvent
4. Triggers damage assessment checks

### 4. Forecast Risk Analysis

```javascript
const plotForecast = await weatherService.getPlotForecast({ lat, lon }, 7);
const analysis = weatherService.analyzeForecastForTriggers(plotForecast.forecast);
```

**Analysis Output:**
```json
{
  "totalPrecipitation": "45.30",
  "avgDailyPrecipitation": "6.47",
  "maxDailyPrecipitation": "18.50",
  "daysWithoutRain": 2,
  "highTempDays": 1,
  "droughtRisk": false,
  "floodRisk": false,
  "riskLevel": "LOW"
}
```

### 5. Historical Precipitation Calculation

```javascript
const precipitation = await weatherService.getHistoricalPrecipitation(
  plotId,
  { lat, lon },
  '2025-11-01'
);
// Returns total precipitation in mm for that date
```

## Integration with Existing Services

### Weather Worker Integration

The weather worker can now fetch real data:

```javascript
// In src/workers/weather.worker.js
const plots = await prisma.plot.findMany({ where: { status: 'ACTIVE' } });

for (const plot of plots) {
  await weatherService.fetchAndStoreWeatherData(plot.id, {
    lat: plot.latitude,
    lon: plot.longitude,
  });
}
```

### Trigger Detection

After storing weather data, the service automatically checks triggers:

```javascript
await this.checkTriggerConditions(plotId);

// If drought or flood detected:
// - Publishes message to damage_calculation queue
// - Triggers damage assessment workflow
```

### Policy Creation with Forecast

When a farmer buys insurance, check forecast for early warnings:

```javascript
const forecast = await weatherService.getPlotForecast(
  { lat: plot.latitude, lon: plot.longitude },
  7
);

const analysis = weatherService.analyzeForecastForTriggers(forecast.forecast);

if (analysis.droughtRisk) {
  // Warn farmer about drought risk
  // Adjust premium or deny coverage
}
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# WeatherXM Pro API
WEATHERXM_API_KEY=your_weatherxm_pro_api_key
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1
WEATHERXM_WEBHOOK_SECRET=your_webhook_secret
```

### Get WeatherXM Pro API Key

1. Sign up at [WeatherXM Pro](https://pro.weatherxm.com)
2. Navigate to API Management page
3. Copy your API key
4. Add to `.env` file

## API Usage Examples

### Example 1: Monitor Plot Weather

```javascript
const WeatherService = require('./services/weather.service');

async function monitorPlot(plotId, latitude, longitude) {
  try {
    // 1. Find nearby stations
    const stations = await WeatherService.getStationsByRadius(latitude, longitude, 50000);
    console.log(`Found ${stations.length} stations within 50km`);

    // 2. Get latest observation from nearest station
    const observation = await WeatherService.getLatestObservation(stations[0].id);
    console.log('Current weather:', observation.observation);

    // 3. Store in database
    await WeatherService.fetchAndStoreWeatherData(plotId, { lat: latitude, lon: longitude });

    // 4. Get forecast
    const forecast = await WeatherService.getPlotForecast({ lat: latitude, lon: longitude }, 7);
    console.log('7-day forecast:', forecast);

    // 5. Analyze risks
    const analysis = WeatherService.analyzeForecastForTriggers(forecast.forecast);
    console.log('Risk analysis:', analysis);

  } catch (error) {
    console.error('Error monitoring plot:', error);
  }
}

// Usage
monitorPlot('plot-uuid', -1.2921, 36.8219);
```

### Example 2: Calculate Historical Precipitation

```javascript
async function calculateMonthlyRainfall(plotId, latitude, longitude, year, month) {
  let totalRainfall = 0;
  
  // Get all days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dailyRainfall = await WeatherService.getHistoricalPrecipitation(
      plotId,
      { lat: latitude, lon: longitude },
      date
    );
    totalRainfall += dailyRainfall;
  }
  
  console.log(`Total rainfall in ${year}-${month}: ${totalRainfall.toFixed(2)} mm`);
  return totalRainfall;
}

// Usage
calculateMonthlyRainfall('plot-uuid', -1.2921, 36.8219, 2025, 10);
```

### Example 3: Automated Daily Weather Ingestion

```javascript
// Schedule this to run every hour
async function ingestWeatherData() {
  const activePlots = await prisma.plot.findMany({
    where: { 
      policies: { 
        some: { status: 'ACTIVE' } 
      } 
    },
  });

  console.log(`Ingesting weather data for ${activePlots.length} plots...`);

  for (const plot of activePlots) {
    try {
      await WeatherService.fetchAndStoreWeatherData(plot.id, {
        lat: plot.latitude,
        lon: plot.longitude,
      });
      
      console.log(`✓ Plot ${plot.name} updated`);
    } catch (error) {
      console.error(`✗ Failed to update plot ${plot.name}:`, error.message);
    }
  }
}
```

## API Methods Reference

### Station Methods
| Method | Description | Parameters |
|--------|-------------|------------|
| `getStationsInBounds(minLat, minLon, maxLat, maxLon)` | Get stations in bounding box | Coordinates |
| `getStationsByRadius(lat, lon, radius)` | Get stations within radius | Coords + radius (meters) |

### Observation Methods
| Method | Description | Parameters |
|--------|-------------|------------|
| `getLatestObservation(stationId)` | Get latest observation | Station ID |
| `getHistoricalData(stationId, date)` | Get historical data | Station ID + date (YYYY-MM-DD) |

### Forecast Methods
| Method | Description | Parameters |
|--------|-------------|------------|
| `getForecast(cellIndex, from, to, include)` | Get forecast for H3 cell | Cell index + date range + types |
| `getPlotForecast(location, days)` | Get forecast for plot location | {lat, lon} + days |

### H3 Methods
| Method | Description | Parameters |
|--------|-------------|------------|
| `getH3CellIndex(lat, lon, resolution)` | Get H3 cell index | Coords + resolution (default: 8) |

### Analysis Methods
| Method | Description | Parameters |
|--------|-------------|------------|
| `calculateDailyPrecipitation(observations)` | Calculate daily rainfall | Array of observations |
| `analyzeForecastForTriggers(forecastData)` | Analyze drought/flood risk | Forecast array |
| `fetchAndStoreWeatherData(plotId, location)` | Fetch and store weather | Plot ID + coords |
| `getHistoricalPrecipitation(plotId, location, date)` | Get historical rainfall | Plot ID + coords + date |

## Data Quality

WeatherXM Pro provides data quality scores for each station:

```javascript
{
  "health": {
    "data_quality": { 
      "score": 0.95  // 0.0 - 1.0 (higher is better)
    },
    "location_quality": { 
      "score": 1.0,
      "reason": "LOCATION_VERIFIED"
    }
  }
}
```

**Quality Thresholds:**
- **Excellent**: score > 0.9
- **Good**: score > 0.7
- **Fair**: score > 0.5
- **Poor**: score < 0.5

Consider implementing quality checks:

```javascript
const data = await weatherService.getLatestObservation(stationId);
const qualityScore = data.health?.data_quality?.score || 0;

if (qualityScore < 0.7) {
  logger.warn('Low data quality from station', { stationId, qualityScore });
  // Maybe find alternative station
}
```

## Error Handling

All WeatherXM API methods include error handling:

```javascript
try {
  const stations = await weatherService.getStationsByRadius(lat, lon, 50000);
} catch (error) {
  if (error.response?.status === 401) {
    // Invalid API key
  } else if (error.response?.status === 429) {
    // Rate limit exceeded
  } else if (error.response?.status === 404) {
    // Station not found
  }
  logger.error('WeatherXM API error:', error);
}
```

## Rate Limiting

WeatherXM Pro API has rate limits. Implement caching to reduce calls:

```javascript
// Cache latest observations for 5 minutes
const cacheKey = `weather:station:${stationId}:latest`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await weatherService.getLatestObservation(stationId);
await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 min TTL
return data;
```

## Testing

### Manual Testing

```bash
# 1. Set API key
export WEATHERXM_API_KEY=your_key

# 2. Start Node REPL
node

# 3. Test methods
const weatherService = require('./src/services/weather.service');

// Test station search
weatherService.getStationsByRadius(-1.2921, 36.8219, 50000)
  .then(stations => console.log(stations));

// Test latest observation
weatherService.getLatestObservation('station-id')
  .then(data => console.log(data));

// Test H3 cell
const cell = weatherService.getH3CellIndex(-1.2921, 36.8219);
console.log('H3 Cell:', cell);

// Test forecast
weatherService.getPlotForecast({ lat: -1.2921, lon: 36.8219 }, 7)
  .then(forecast => console.log(forecast));
```

### Integration Testing

```javascript
// Test full workflow
describe('WeatherXM Integration', () => {
  it('should fetch and store weather data for plot', async () => {
    const plot = await prisma.plot.create({
      data: {
        name: 'Test Plot',
        latitude: -1.2921,
        longitude: 36.8219,
        acreage: 5,
        farmerId: farmerId,
      },
    });

    const result = await weatherService.fetchAndStoreWeatherData(plot.id, {
      lat: plot.latitude,
      lon: plot.longitude,
    });

    expect(result).toBeTruthy();
    expect(result.rainfall).toBeGreaterThanOrEqual(0);
  });
});
```

## Monitoring

### Key Metrics

```sql
-- Weather data ingestion rate
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as observations
FROM "WeatherEvent"
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Station coverage
SELECT 
  "stationId",
  COUNT(*) as plot_count
FROM "WeatherEvent"
GROUP BY "stationId"
ORDER BY plot_count DESC;

-- Data freshness
SELECT 
  "plotId",
  MAX(timestamp) as last_update,
  NOW() - MAX(timestamp) as age
FROM "WeatherEvent"
GROUP BY "plotId"
HAVING NOW() - MAX(timestamp) > INTERVAL '2 hours';
```

## Next Steps

1. **Implement Weather Worker**: Schedule regular data ingestion
2. **Add Caching**: Cache API responses to reduce calls
3. **Quality Monitoring**: Track data quality scores
4. **Forecast Alerts**: Send notifications for drought/flood risks
5. **Historical Analysis**: Analyze long-term weather patterns
6. **Multi-station Aggregation**: Use multiple stations for better accuracy

---

**Status**: ✅ **WEATHERXM INTEGRATION COMPLETE**

**Date**: November 5, 2025

**Version**: 1.0.0

**API Version**: WeatherXM Pro API v1.12.1
