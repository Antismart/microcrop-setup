const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weather.controller');

/**
 * Weather API Routes
 * 
 * Handles weather data collection, station management, and forecast retrieval
 * Integrates with WeatherXM Pro API for real-time weather data
 */

// WeatherXM webhook endpoint
// Receives real-time weather observations from WeatherXM stations
router.post('/webhook', weatherController.handleWeatherWebhook);

// Get weather station details and latest observation
router.get('/station/:id', weatherController.getStationDetails);

// Get comprehensive weather data for a plot (history, current, forecast)
router.get('/plot/:plotId', weatherController.getPlotWeather);

// Get weather stress index for a plot
router.get('/plot/:plotId/stress', weatherController.getPlotWeatherStress);

// Find weather stations near a location
// Query params: lat, lon, radius (optional)
router.get('/stations/near', weatherController.findNearbyStations);

// Update plot's assigned weather station
router.put('/plot/:plotId/station', weatherController.updatePlotStation);

module.exports = router;
