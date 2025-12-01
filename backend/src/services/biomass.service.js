const axios = require('axios');
const logger = require('../config/logger');

const DATA_PROCESSOR_URL = process.env.DATA_PROCESSOR_URL || 'http://localhost:8000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

class BiomassService {
  constructor() {
    this.baseUrl = DATA_PROCESSOR_URL;
    this.headers = {
      'Authorization': `Bearer ${INTERNAL_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async getPlotBiomass(plotId) {
    try {
      logger.info('Fetching biomass data from data-processor', { plotId });
      const response = await axios.get(
        `${this.baseUrl}/api/planet/biomass/${plotId}`,
        { headers: this.headers, timeout: 30000 }
      );
      logger.info('Biomass data fetched successfully', { plotId });
      return response.data;
    } catch (error) {
      logger.error('Error fetching biomass data:', { plotId, error: error.message });
      throw new Error(`Failed to fetch biomass data: ${error.message}`);
    }
  }

  async getPlotNDVI(plotId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/planet/ndvi/${plotId}`,
        { headers: this.headers, timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching NDVI data:', { plotId, error: error.message });
      throw new Error(`Failed to fetch NDVI data: ${error.message}`);
    }
  }

  async getVegetationHealth(plotId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/planet/vegetation-health/${plotId}`,
        { headers: this.headers, timeout: 30000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching vegetation health:', { plotId, error: error.message });
      throw new Error(`Failed to fetch vegetation health: ${error.message}`);
    }
  }

  async refreshSatelliteData(plotId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/planet/${plotId}/refresh`,
        {},
        { headers: this.headers, timeout: 120000 }
      );
      return response.data;
    } catch (error) {
      logger.error('Error refreshing satellite data:', { plotId, error: error.message });
      throw new Error(`Failed to refresh satellite data: ${error.message}`);
    }
  }
}

module.exports = new BiomassService();
