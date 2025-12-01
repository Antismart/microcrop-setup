const axios = require('axios');
const logger = require('../config/logger');

const DATA_PROCESSOR_URL = process.env.DATA_PROCESSOR_URL || 'http://localhost:8000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

class WeatherService {
  constructor() {
    this.baseUrl = DATA_PROCESSOR_URL;
    this.headers = {
      'Authorization': `Bearer ${INTERNAL_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async getPlotWeather(plotId, days = 30) {
    try {
      logger.info('Fetching weather data from data-processor', { plotId, days });
      const response = await axios.get(
        `${this.baseUrl}/api/weather/${plotId}`,
        { params: { days }, headers: this.headers, timeout: 30000 }
      );
      logger.info('Weather data fetched successfully', { plotId });
      return response.data;
    } catch (error) {
      logger.error('Error fetching weather data:', { plotId, error: error.message });
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  async getLatestWeather(plotId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/weather/${plotId}/latest`,
        { headers: this.headers, timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching latest weather:', { plotId, error: error.message });
      throw new Error(`Failed to fetch latest weather: ${error.message}`);
    }
  }

  async getRainfallAnalysis(plotId, days = 30) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/weather/${plotId}/rainfall`,
        { params: { days }, headers: this.headers, timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching rainfall analysis:', { plotId, error: error.message });
      throw new Error(`Failed to fetch rainfall analysis: ${error.message}`);
    }
  }

  async refreshWeatherData(plotId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/weather/${plotId}/refresh`,
        {},
        { headers: this.headers, timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error triggering weather refresh:', { plotId, error: error.message });
      throw new Error(`Failed to trigger weather refresh: ${error.message}`);
    }
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error('Data-processor health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new WeatherService();
