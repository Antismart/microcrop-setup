const weatherService = require('../../services/weather.service');
const prisma = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Handle WeatherXM webhook data
 * POST /api/weather/webhook
 * 
 * Receives weather data from WeatherXM and processes it for nearby plots
 * 
 * Security: WeatherXM does not provide webhook secrets. Security is handled through:
 * 1. Optional API key validation (if provided in headers)
 * 2. Data validation and sanitization
 * 3. Rate limiting (should be configured in middleware)
 * 4. Optional IP whitelist (if WeatherXM provides static IPs)
 */
async function handleWeatherWebhook(req, res) {
  try {
    const { stationId, timestamp, observation } = req.body;

    logger.info('Weather webhook received', { stationId, timestamp });

    // Optional: Validate API key if provided in headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (process.env.WEATHERXM_WEBHOOK_API_KEY && apiKey !== process.env.WEATHERXM_WEBHOOK_API_KEY) {
      logger.warn('Invalid webhook API key', { ip: req.ip });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validate required fields
    if (!stationId || !observation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: stationId and observation are required',
      });
    }

    // Process weather data
    const result = await weatherService.handleWeatherData(stationId, {
      timestamp: timestamp || new Date().toISOString(),
      rainfall: observation.precipitation_rate || 0,
      temperature: observation.temperature,
      humidity: observation.humidity,
      wind_speed: observation.wind_speed,
    });

    logger.info('Weather webhook processed successfully', {
      stationId,
      plotsAffected: result.plotsAffected,
    });

    res.status(200).json({
      success: true,
      message: 'Weather data processed successfully',
      data: {
        stationId,
        plotsAffected: result.plotsAffected,
        timestamp: timestamp || new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error processing weather webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process weather data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get weather station details and latest observation
 * GET /api/weather/station/:id
 * 
 * Returns station information and current weather data
 */
async function getStationDetails(req, res) {
  try {
    const { id } = req.params;

    logger.info('Fetching station details', { stationId: id });

    // Get latest observation from WeatherXM
    const observation = await weatherService.getLatestObservation(id);

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Station not found or no data available',
      });
    }

    // Find plots using this station
    const plots = await prisma.plot.findMany({
      where: {
        weatherStationId: id,
      },
      select: {
        id: true,
        name: true,
        acreage: true,
        cropType: true,
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        stationId: id,
        observation: observation.observation,
        timestamp: observation.timestamp,
        associatedPlots: plots.length,
        plots: plots,
      },
    });
  } catch (error) {
    logger.error('Error fetching station details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch station details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get weather data and forecast for a specific plot
 * GET /api/weather/plot/:plotId
 * 
 * Returns historical weather, current conditions, and forecast
 */
async function getPlotWeather(req, res) {
  try {
    const { plotId } = req.params;
    const { days = 30, forecast = true } = req.query;

    logger.info('Fetching plot weather data', { plotId, days, forecast });

    // Fetch plot with location
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      include: {
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        policies: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            policyNumber: true,
            coverageType: true,
            status: true,
          },
        },
      },
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Plot not found',
      });
    }

    // Validate plot has coordinates
    if (!plot.latitude || !plot.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Plot does not have coordinates defined',
      });
    }

    const plotLocation = {
      lat: plot.latitude,
      lon: plot.longitude,
    };

    // Get historical weather data
    const weatherHistory = await weatherService.getPlotWeatherHistory(
      plotId,
      parseInt(days)
    );

    // Find nearest weather stations
    const nearbyStations = await weatherService.getStationsByRadius(
      plotLocation.lat,
      plotLocation.lon,
      50000 // 50km radius
    );

    // Get latest observation from nearest station
    let currentWeather = null;
    if (nearbyStations && nearbyStations.length > 0) {
      try {
        const latestObs = await weatherService.getLatestObservation(
          nearbyStations[0].id
        );
        currentWeather = {
          stationId: nearbyStations[0].id,
          stationName: nearbyStations[0].name,
          distance: nearbyStations[0].distance,
          observation: latestObs.observation,
          timestamp: latestObs.timestamp,
        };
      } catch (error) {
        logger.warn('Could not fetch current weather', { error: error.message });
      }
    }

    // Get forecast if requested
    let forecastData = null;
    let forecastAnalysis = null;
    if (forecast === 'true' || forecast === true) {
      try {
        const forecastResult = await weatherService.getPlotForecast(plotLocation, 7);
        forecastData = forecastResult.forecast;
        forecastAnalysis = weatherService.analyzeForecastForTriggers(forecastData);
      } catch (error) {
        logger.warn('Could not fetch forecast', { error: error.message });
      }
    }

    // Calculate weather statistics from history
    const stats = calculateWeatherStats(weatherHistory);

    res.status(200).json({
      success: true,
      data: {
        plot: {
          id: plot.id,
          name: plot.name,
          acreage: plot.acreage,
          cropType: plot.cropType,
          location: plotLocation,
          farmer: plot.farmer,
          activePolicies: plot.policies.length,
        },
        currentWeather,
        nearbyStations: nearbyStations.slice(0, 5).map((station) => ({
          id: station.id,
          name: station.name,
          distance: station.distance,
          location: station.location,
        })),
        weatherHistory: {
          events: weatherHistory,
          count: weatherHistory.length,
          stats,
        },
        forecast: forecastData
          ? {
              data: forecastData,
              analysis: forecastAnalysis,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Error fetching plot weather:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plot weather data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Get weather stress index for a plot
 * GET /api/weather/plot/:plotId/stress
 * 
 * Calculates weather stress index based on historical data
 */
async function getPlotWeatherStress(req, res) {
  try {
    const { plotId } = req.params;
    const { startDate, endDate } = req.query;

    logger.info('Calculating weather stress index', { plotId, startDate, endDate });

    // Validate plot exists
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      select: {
        id: true,
        name: true,
        cropType: true,
      },
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Plot not found',
      });
    }

    // Default to last 30 days if dates not provided
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate
      ? new Date(startDate)
      : new Date(endDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate weather stress index
    const stressIndex = await weatherService.calculateWeatherStressIndex(plotId, {
      startDate: startDateObj,
      endDate: endDateObj,
    });

    // Get weather events in the period
    const weatherEvents = await prisma.weatherEvent.findMany({
      where: {
        plotId,
        timestamp: {
          gte: startDateObj,
          lte: endDateObj,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Calculate additional metrics
    const totalRainfall = weatherEvents.reduce(
      (sum, event) => sum + (event.rainfall || 0),
      0
    );
    const avgTemperature = weatherEvents.length
      ? weatherEvents.reduce((sum, event) => sum + (event.temperature || 0), 0) /
        weatherEvents.length
      : 0;
    const maxTemperature = weatherEvents.length
      ? Math.max(...weatherEvents.map((e) => e.temperature || 0))
      : 0;

    res.status(200).json({
      success: true,
      data: {
        plot: {
          id: plot.id,
          name: plot.name,
          cropType: plot.cropType,
        },
        period: {
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          days: Math.ceil(
            (endDateObj - startDateObj) / (1000 * 60 * 60 * 24)
          ),
        },
        stressIndex: {
          value: stressIndex,
          level: getStressLevel(stressIndex),
          description: getStressDescription(stressIndex),
        },
        weatherMetrics: {
          totalRainfall: totalRainfall.toFixed(2),
          avgTemperature: avgTemperature.toFixed(2),
          maxTemperature: maxTemperature.toFixed(2),
          dataPoints: weatherEvents.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error calculating weather stress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate weather stress index',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Find weather stations near a location
 * GET /api/weather/stations/near
 * 
 * Query params: lat, lon, radius (optional, default 50000m)
 */
async function findNearbyStations(req, res) {
  try {
    const { lat, lon, radius = 50000 } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: lat and lon',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchRadius = parseInt(radius);

    // Validate numeric values
    if (
      isNaN(latitude) ||
      isNaN(longitude) ||
      isNaN(searchRadius) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates or radius',
      });
    }

    logger.info('Finding nearby weather stations', {
      lat: latitude,
      lon: longitude,
      radius: searchRadius,
    });

    // Find nearby stations
    const stations = await weatherService.getStationsByRadius(
      latitude,
      longitude,
      searchRadius
    );

    res.status(200).json({
      success: true,
      data: {
        location: {
          latitude,
          longitude,
        },
        searchRadius: searchRadius,
        stationsFound: stations.length,
        stations: stations.map((station) => ({
          id: station.id,
          name: station.name,
          distance: station.distance,
          location: station.location,
          active: station.active,
        })),
      },
    });
  } catch (error) {
    logger.error('Error finding nearby stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find nearby weather stations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Update plot's assigned weather station
 * PUT /api/weather/plot/:plotId/station
 * 
 * Assigns a specific WeatherXM station to a plot
 */
async function updatePlotStation(req, res) {
  try {
    const { plotId } = req.params;
    const { stationId } = req.body;

    logger.info('Updating plot weather station', { plotId, stationId });

    // Validate plot exists
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Plot not found',
      });
    }

    // Verify station exists (optional, can skip if just storing ID)
    if (stationId) {
      try {
        await weatherService.getLatestObservation(stationId);
      } catch (error) {
        logger.warn('Station verification failed', { stationId, error: error.message });
        // Continue anyway, station might be temporarily unavailable
      }
    }

    // Update plot with station ID
    const updatedPlot = await prisma.plot.update({
      where: { id: plotId },
      data: {
        weatherStationId: stationId || null,
      },
      include: {
        farmer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: stationId
        ? 'Weather station assigned successfully'
        : 'Weather station removed from plot',
      data: {
        plotId: updatedPlot.id,
        plotName: updatedPlot.name,
        stationId: updatedPlot.weatherStationId,
        farmer: updatedPlot.farmer,
      },
    });
  } catch (error) {
    logger.error('Error updating plot station:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plot weather station',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Helper Functions

/**
 * Calculate weather statistics from historical events
 */
function calculateWeatherStats(weatherEvents) {
  if (!weatherEvents || weatherEvents.length === 0) {
    return {
      totalRainfall: 0,
      avgRainfall: 0,
      avgTemperature: 0,
      avgHumidity: 0,
      maxTemperature: 0,
      minTemperature: 0,
      rainyDays: 0,
    };
  }

  const totalRainfall = weatherEvents.reduce(
    (sum, event) => sum + (event.rainfall || 0),
    0
  );
  const avgRainfall = totalRainfall / weatherEvents.length;

  const temperatures = weatherEvents
    .map((e) => e.temperature)
    .filter((t) => t !== null && t !== undefined);
  const avgTemperature = temperatures.length
    ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length
    : 0;
  const maxTemperature = temperatures.length ? Math.max(...temperatures) : 0;
  const minTemperature = temperatures.length ? Math.min(...temperatures) : 0;

  const humidities = weatherEvents
    .map((e) => e.humidity)
    .filter((h) => h !== null && h !== undefined);
  const avgHumidity = humidities.length
    ? humidities.reduce((sum, h) => sum + h, 0) / humidities.length
    : 0;

  const rainyDays = weatherEvents.filter((e) => (e.rainfall || 0) > 1).length;

  return {
    totalRainfall: totalRainfall.toFixed(2),
    avgRainfall: avgRainfall.toFixed(2),
    avgTemperature: avgTemperature.toFixed(2),
    avgHumidity: avgHumidity.toFixed(2),
    maxTemperature: maxTemperature.toFixed(2),
    minTemperature: minTemperature.toFixed(2),
    rainyDays,
    totalDataPoints: weatherEvents.length,
  };
}

/**
 * Get stress level category from stress index
 */
function getStressLevel(stressIndex) {
  if (stressIndex < 0.3) return 'LOW';
  if (stressIndex < 0.5) return 'MODERATE';
  if (stressIndex < 0.7) return 'HIGH';
  return 'SEVERE';
}

/**
 * Get stress description from stress index
 */
function getStressDescription(stressIndex) {
  if (stressIndex < 0.3) {
    return 'Minimal weather stress. Conditions are favorable for crop growth.';
  }
  if (stressIndex < 0.5) {
    return 'Moderate weather stress. Some impact on crop health expected.';
  }
  if (stressIndex < 0.7) {
    return 'High weather stress. Significant impact on crop yield likely.';
  }
  return 'Severe weather stress. Critical damage to crops expected.';
}

module.exports = {
  handleWeatherWebhook,
  getStationDetails,
  getPlotWeather,
  getPlotWeatherStress,
  findNearbyStations,
  updatePlotStation,
};
