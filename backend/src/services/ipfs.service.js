/**
 * IPFS Service using Pinata
 * 
 * Handles decentralized storage of:
 * - Damage assessment proofs
 * - Policy documents
 * - Satellite imagery references
 * - Weather data snapshots
 * 
 * Returns IPFS CIDs for blockchain verification
 */

const { PinataSDK } = require('pinata');
const logger = require('../config/logger');

class IPFSService {
  constructor() {
    this.pinata = null;
    this.initialized = false;
  }

  /**
   * Initialize Pinata SDK
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (!process.env.PINATA_JWT) {
        throw new Error('PINATA_JWT not configured');
      }

      this.pinata = new PinataSDK({
        pinataJwt: process.env.PINATA_JWT,
        pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
      });

      this.initialized = true;
      logger.info('IPFS Service initialized successfully');
      
      // Test connection after marking as initialized
      await this.testConnection();
    } catch (error) {
      logger.error('Failed to initialize IPFS Service:', error);
      throw error;
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection() {
    try {
      // Upload a small test object
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        service: 'MicroCrop Insurance'
      };

      const result = await this.uploadJSON(testData, {
        name: 'connection-test',
        keyvalues: { type: 'test' }
      });

      logger.info('Pinata connection test successful', { cid: result.cid });
      return result;
    } catch (error) {
      logger.error('Pinata connection test failed:', error);
      throw error;
    }
  }

  /**
   * Upload JSON data to IPFS
   * @param {Object} data - JSON data to upload
   * @param {Object} metadata - Optional metadata (name, keyvalues)
   * @returns {Object} { cid, ipfsUrl, gatewayUrl, size }
   */
  async uploadJSON(data, metadata = {}) {
    await this.ensureInitialized();

    try {
      logger.info('Uploading JSON to IPFS', { 
        name: metadata.name || 'data.json'
      });

      // Use pinata.upload.public.json() for JSON data
      const result = await this.pinata.upload.public.json(data);

      const response = {
        cid: result.cid,
        ipfsUrl: `ipfs://${result.cid}`,
        gatewayUrl: this.getGatewayUrl(result.cid),
        size: result.size,
        pinataId: result.id,
        timestamp: result.created_at
      };

      logger.info('JSON uploaded to IPFS successfully', { 
        cid: response.cid,
        size: response.size 
      });

      return response;
    } catch (error) {
      logger.error('Failed to upload JSON to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload file buffer to IPFS
   * @param {Buffer} buffer - File buffer
   * @param {String} filename - File name
   * @param {String} mimeType - MIME type
   * @param {Object} metadata - Optional metadata
   * @returns {Object} Upload result
   */
  async uploadFile(buffer, filename, mimeType, metadata = {}) {
    await this.ensureInitialized();

    try {
      const blob = new Blob([buffer], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });

      logger.info('Uploading file to IPFS', { 
        filename, 
        mimeType, 
        size: buffer.length 
      });

      const result = await this.pinata.upload.public.file(file);

      const response = {
        cid: result.cid,
        ipfsUrl: `ipfs://${result.cid}`,
        gatewayUrl: this.getGatewayUrl(result.cid),
        size: result.size,
        timestamp: result.created_at
      };

      logger.info('File uploaded to IPFS successfully', { 
        cid: response.cid,
        filename 
      });

      return response;
    } catch (error) {
      logger.error('Failed to upload file to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload damage assessment proof to IPFS
   * Stores comprehensive proof data for blockchain verification
   * 
   * @param {Object} proofData - Damage assessment data
   * @returns {Object} Upload result with CID
   */
  async uploadDamageProof(proofData) {
    await this.ensureInitialized();

    try {
      const {
        claimId,
        plotId,
        farmerId,
        damageIndex,
        weatherData,
        vegetationData,
        calculationDetails,
        assessmentTimestamp
      } = proofData;

      // Create comprehensive proof document
      const proofDocument = {
        version: '1.0',
        type: 'damage-assessment',
        timestamp: assessmentTimestamp || new Date().toISOString(),
        claim: {
          id: claimId,
          plotId,
          farmerId
        },
        assessment: {
          damageIndex,
          weatherStress: calculationDetails.weatherStress,
          vegetationStress: calculationDetails.vegetationStress,
          weights: {
            weather: 0.6,
            vegetation: 0.4
          }
        },
        evidence: {
          weather: {
            source: 'WeatherXM',
            stationId: weatherData.stationId,
            observations: weatherData.observations,
            period: weatherData.period,
            metrics: weatherData.metrics
          },
          vegetation: vegetationData ? {
            source: 'Spexi',
            ndviValues: vegetationData.ndviValues,
            changeDetection: vegetationData.changeDetection,
            analysisDate: vegetationData.analysisDate
          } : null
        },
        calculation: {
          formula: 'damageIndex = (weatherStress × 0.6) + (vegetationStress × 0.4)',
          components: calculationDetails.components,
          thresholds: calculationDetails.thresholds
        },
        metadata: {
          ipfsUploadTimestamp: new Date().toISOString(),
          system: 'MicroCrop Insurance Platform',
          version: '1.0'
        }
      };

      // Upload to IPFS with metadata
      const result = await this.uploadJSON(proofDocument, {
        name: `damage-proof-${claimId}.json`,
        keyvalues: {
          type: 'damage-proof',
          claimId,
          plotId,
          farmerId,
          damageIndex: damageIndex.toString(),
          timestamp: proofDocument.timestamp
        }
      });

      logger.info('Damage proof uploaded to IPFS', {
        claimId,
        cid: result.cid,
        damageIndex
      });

      return result;
    } catch (error) {
      logger.error('Failed to upload damage proof:', error);
      throw error;
    }
  }

  /**
   * Upload policy document to IPFS
   * Stores policy terms and coverage details
   * 
   * @param {Object} policyData - Policy document data
   * @returns {Object} Upload result with CID
   */
  async uploadPolicyDocument(policyData) {
    await this.ensureInitialized();

    try {
      const {
        policyId,
        farmerId,
        plotId,
        coverageType,
        sumInsured,
        premium,
        duration,
        terms
      } = policyData;

      const policyDocument = {
        version: '1.0',
        type: 'insurance-policy',
        timestamp: new Date().toISOString(),
        policy: {
          id: policyId,
          farmerId,
          plotId,
          status: 'ACTIVE'
        },
        coverage: {
          type: coverageType,
          sumInsured,
          premium,
          duration,
          startDate: terms.startDate,
          endDate: terms.endDate
        },
        terms: {
          cropType: terms.cropType,
          plotSize: terms.plotSize,
          triggers: terms.triggers,
          payoutStructure: terms.payoutStructure,
          exclusions: terms.exclusions
        },
        metadata: {
          ipfsUploadTimestamp: new Date().toISOString(),
          system: 'MicroCrop Insurance Platform',
          version: '1.0'
        }
      };

      const result = await this.uploadJSON(policyDocument, {
        name: `policy-${policyId}.json`,
        keyvalues: {
          type: 'policy-document',
          policyId,
          farmerId,
          plotId,
          coverageType,
          timestamp: policyDocument.timestamp
        }
      });

      logger.info('Policy document uploaded to IPFS', {
        policyId,
        cid: result.cid
      });

      return result;
    } catch (error) {
      logger.error('Failed to upload policy document:', error);
      throw error;
    }
  }

  /**
   * Upload weather snapshot to IPFS
   * Stores weather data at specific point in time
   * 
   * @param {Object} weatherSnapshot - Weather data snapshot
   * @returns {Object} Upload result with CID
   */
  async uploadWeatherSnapshot(weatherSnapshot) {
    await this.ensureInitialized();

    try {
      const {
        plotId,
        stationId,
        observations,
        period,
        triggerType
      } = weatherSnapshot;

      const snapshotDocument = {
        version: '1.0',
        type: 'weather-snapshot',
        timestamp: new Date().toISOString(),
        plot: {
          id: plotId
        },
        station: {
          id: stationId,
          provider: 'WeatherXM'
        },
        data: {
          observations,
          period,
          triggerType
        },
        metadata: {
          ipfsUploadTimestamp: new Date().toISOString(),
          system: 'MicroCrop Insurance Platform'
        }
      };

      const result = await this.uploadJSON(snapshotDocument, {
        name: `weather-${plotId}-${Date.now()}.json`,
        keyvalues: {
          type: 'weather-snapshot',
          plotId,
          stationId,
          triggerType: triggerType || 'none',
          timestamp: snapshotDocument.timestamp
        }
      });

      logger.info('Weather snapshot uploaded to IPFS', {
        plotId,
        cid: result.cid,
        triggerType
      });

      return result;
    } catch (error) {
      logger.error('Failed to upload weather snapshot:', error);
      throw error;
    }
  }

  /**
   * Upload satellite imagery reference to IPFS
   * 
   * @param {Object} imageryData - Satellite imagery data
   * @returns {Object} Upload result with CID
   */
  async uploadSatelliteImagery(imageryData) {
    await this.ensureInitialized();

    try {
      const {
        plotId,
        imageUrl,
        ndviData,
        analysisResults,
        captureDate
      } = imageryData;

      const imageryDocument = {
        version: '1.0',
        type: 'satellite-imagery',
        timestamp: new Date().toISOString(),
        plot: {
          id: plotId
        },
        imagery: {
          source: 'Spexi',
          imageUrl,
          captureDate,
          resolution: 'HIGH'
        },
        analysis: {
          ndvi: ndviData,
          results: analysisResults
        },
        metadata: {
          ipfsUploadTimestamp: new Date().toISOString(),
          system: 'MicroCrop Insurance Platform'
        }
      };

      const result = await this.uploadJSON(imageryDocument, {
        name: `imagery-${plotId}-${Date.now()}.json`,
        keyvalues: {
          type: 'satellite-imagery',
          plotId,
          captureDate,
          timestamp: imageryDocument.timestamp
        }
      });

      logger.info('Satellite imagery uploaded to IPFS', {
        plotId,
        cid: result.cid,
        captureDate
      });

      return result;
    } catch (error) {
      logger.error('Failed to upload satellite imagery:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from IPFS by CID
   * @param {String} cid - IPFS Content Identifier
   * @returns {Object} Retrieved data
   */
  async getData(cid) {
    await this.ensureInitialized();

    try {
      logger.info('Retrieving data from IPFS', { cid });

      const data = await this.pinata.gateways.public.get(cid);

      logger.info('Data retrieved from IPFS successfully', { cid });

      return data;
    } catch (error) {
      logger.error('Failed to retrieve data from IPFS:', error);
      throw error;
    }
  }

  /**
   * Get gateway URL for a CID
   * @param {String} cid - IPFS Content Identifier
   * @returns {String} Gateway URL
   */
  getGatewayUrl(cid) {
    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    return `https://${gateway}/ipfs/${cid}`;
  }

  /**
   * Verify proof hash matches IPFS content
   * Used for blockchain verification
   * 
   * @param {String} cid - IPFS CID
   * @param {Object} expectedData - Expected data to verify
   * @returns {Boolean} True if verified
   */
  async verifyProofHash(cid, expectedData) {
    try {
      const storedData = await this.getData(cid);
      
      // Compare critical fields
      const isValid = JSON.stringify(storedData) === JSON.stringify(expectedData);

      if (!isValid) {
        logger.warn('IPFS proof verification failed', { cid });
      } else {
        logger.info('IPFS proof verified successfully', { cid });
      }

      return isValid;
    } catch (error) {
      logger.error('Failed to verify proof hash:', error);
      return false;
    }
  }

  /**
   * Get metadata for pinned content
   * @param {String} cid - IPFS CID
   * @returns {Object} Metadata
   */
  async getMetadata(cid) {
    await this.ensureInitialized();

    try {
      // Note: Pinata SDK doesn't have direct metadata retrieval
      // This would require API call to Pinata's REST API
      const url = `https://api.pinata.cloud/data/pinList?hashContains=${cid}`;
      
      logger.info('Retrieving metadata for CID', { cid });

      // This is a placeholder - actual implementation would need fetch
      return {
        cid,
        gatewayUrl: this.getGatewayUrl(cid),
        note: 'Metadata retrieval requires additional API implementation'
      };
    } catch (error) {
      logger.error('Failed to get metadata:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      gateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud',
      hasCredentials: !!process.env.PINATA_JWT
    };
  }
}

// Export singleton instance
module.exports = new IPFSService();
