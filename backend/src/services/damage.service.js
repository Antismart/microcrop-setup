const prisma = require('../config/database');
const weatherService = require('./weather.service');
const biomassService = require('./biomass.service');
const { publishMessage, QUEUES } = require('../config/queue');
const logger = require('../config/logger');

class DamageService {
  /**
   * Calculate damage index for a policy
   * Combines weather and vegetation stress indices
   */
  async calculateDamageIndex(policyId) {
    try {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: { plot: true },
      });

      if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
      }

      logger.info('Calculating damage index', { policyId, policyNumber: policy.policyNumber });

      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Get Weather Stress Index (WSI) from data-processor
      const wsi = await weatherService.getRainfallAnalysis(policy.plotId, 30)
        .then(data => data.stressIndex || 0);

      // Get Vegetation Stress Index (NVI) from data-processor
      const nvi = await biomassService.getVegetationHealth(policy.plotId)
        .then(data => data.stressIndex || 0);

      // Calculate Damage Index: DI = (0.6 * WSI) + (0.4 * NVI)
      // Weight weather more heavily as it's the primary trigger
      const damageIndex = (0.6 * wsi) + (0.4 * nvi);

      logger.info('Damage indices calculated', {
        policyId,
        wsi,
        nvi,
        damageIndex,
      });

      // Create damage assessment record
      const assessment = await prisma.damageAssessment.create({
        data: {
          policyId,
          weatherStressIndex: wsi,
          vegetationIndex: nvi,
          damageIndex,
          triggerDate: new Date(),
          proofHash: null, // TODO: Store IPFS hash of evidence
        },
      });

      // Determine if payout should be triggered
      const payoutInfo = this.calculatePayoutAmount(damageIndex, policy.sumInsured);

      if (payoutInfo.shouldPayout) {
        logger.info('Damage threshold exceeded, triggering payout', {
          policyId,
          damageIndex,
          payoutAmount: payoutInfo.amount,
        });

        // Queue payout processing
        await publishMessage(QUEUES.PAYOUT_TRIGGER, {
          policyId: policy.id,
          assessmentId: assessment.id,
          amount: payoutInfo.amount,
          damageIndex,
        });
      } else {
        logger.info('Damage below payout threshold', {
          policyId,
          damageIndex,
          threshold: 0.3,
        });
      }

      return {
        assessment,
        payoutInfo,
      };
    } catch (error) {
      logger.error('Error calculating damage index:', error);
      throw error;
    }
  }

  /**
   * Calculate payout amount based on damage index
   * DI < 0.3: No payout
   * DI 0.3-0.6: 30-50% payout (linear)
   * DI > 0.6: 100% payout
   */
  calculatePayoutAmount(damageIndex, sumInsured) {
    let payoutPercentage = 0;
    let shouldPayout = false;

    if (damageIndex < 0.3) {
      // No payout - damage not significant enough
      payoutPercentage = 0;
      shouldPayout = false;
    } else if (damageIndex >= 0.3 && damageIndex <= 0.6) {
      // Partial payout - linear scale from 30% to 50%
      const range = damageIndex - 0.3;
      payoutPercentage = 30 + (range / 0.3) * 20;
      shouldPayout = true;
    } else {
      // Full payout - severe damage
      payoutPercentage = 100;
      shouldPayout = true;
    }

    const amount = (sumInsured * payoutPercentage) / 100;

    return {
      shouldPayout,
      payoutPercentage,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      damageIndex,
    };
  }

  /**
   * Get damage assessments for a policy
   */
  async getPolicyAssessments(policyId) {
    return await prisma.damageAssessment.findMany({
      where: { policyId },
      orderBy: { triggerDate: 'desc' },
    });
  }

  /**
   * Generate proof package for blockchain verification
   */
  async generateProofPackage(assessmentId) {
    try {
      const assessment = await prisma.damageAssessment.findUnique({
        where: { id: assessmentId },
        include: {
          policy: {
            include: {
              plot: true,
              farmer: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error(`Assessment ${assessmentId} not found`);
      }

      // Get supporting evidence
      const endDate = assessment.triggerDate;
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);

      const weatherData = await prisma.weatherEvent.findMany({
        where: {
          plotId: assessment.policy.plotId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const satelliteData = await prisma.satelliteData.findMany({
        where: {
          plotId: assessment.policy.plotId,
          captureDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const proofPackage = {
        assessmentId: assessment.id,
        policyNumber: assessment.policy.policyNumber,
        farmer: {
          id: assessment.policy.farmer.id,
          phoneNumber: assessment.policy.farmer.phoneNumber,
        },
        plot: {
          id: assessment.policy.plot.id,
          latitude: assessment.policy.plot.latitude,
          longitude: assessment.policy.plot.longitude,
          acreage: assessment.policy.plot.acreage,
          cropType: assessment.policy.plot.cropType,
        },
        indices: {
          weatherStressIndex: assessment.weatherStressIndex,
          vegetationIndex: assessment.vegetationIndex,
          damageIndex: assessment.damageIndex,
        },
        evidence: {
          weatherEvents: weatherData.length,
          satelliteImages: satelliteData.length,
        },
        triggerDate: assessment.triggerDate,
        timestamp: new Date().toISOString(),
      };

      // TODO: Upload to IPFS and store hash
      logger.info('Proof package generated', { assessmentId, proofPackage });

      return proofPackage;
    } catch (error) {
      logger.error('Error generating proof package:', error);
      throw error;
    }
  }
}

module.exports = new DamageService();
