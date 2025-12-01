const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');
const ipfsService = require('../../services/ipfs.service');

const prisma = new PrismaClient();

/**
 * Damage Calculation Logic
 * 
 * Damage Index Formula:
 * damageIndex = (weatherStressIndex × 0.6) + (vegetationIndex × 0.4)
 * 
 * Where:
 * - weatherStressIndex: 0-1 scale (0 = no stress, 1 = severe stress)
 * - vegetationIndex: 0-1 scale (0 = healthy, 1 = severely damaged)
 * 
 * Payout Tiers:
 * - damageIndex < 0.3: No payout (0%)
 * - damageIndex 0.3-0.5: Partial payout (30-50% of sum insured)
 * - damageIndex 0.5-0.7: Moderate payout (50-70% of sum insured)
 * - damageIndex > 0.7: Full payout (70-100% of sum insured)
 * 
 * Formula: Payout = SumInsured × PayoutPercentage
 * PayoutPercentage = min(damageIndex, 1.0)
 */

/**
 * Calculate payout amount based on damage index
 */
function calculatePayoutAmount(sumInsured, damageIndex) {
  // No payout for minor damage
  if (damageIndex < 0.3) {
    return 0;
  }
  
  // Calculate payout percentage based on damage index
  // Linear scale from 30% at damageIndex=0.3 to 100% at damageIndex=1.0
  const minPayout = 0.30;
  const maxPayout = 1.0;
  const minDamage = 0.3;
  const maxDamage = 1.0;
  
  // Linear interpolation
  let payoutPercentage = minPayout + 
    ((damageIndex - minDamage) / (maxDamage - minDamage)) * (maxPayout - minPayout);
  
  // Cap at 100%
  payoutPercentage = Math.min(payoutPercentage, 1.0);
  
  const payoutAmount = sumInsured * payoutPercentage;
  
  return Math.round(payoutAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate damage index from weather and vegetation indices
 */
function calculateDamageIndex(weatherStressIndex, vegetationIndex) {
  // Weighted formula: 60% weather, 40% vegetation
  const damageIndex = (weatherStressIndex * 0.6) + (vegetationIndex * 0.4);
  
  // Ensure within bounds [0, 1]
  return Math.max(0, Math.min(1, damageIndex));
}

/**
 * Get claims (damage assessments) for a policy
 * GET /api/claims/:policyId
 */
const getPolicyClaims = async (req, res) => {
  try {
    const { policyId } = req.params;

    // Get policy with all related data
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        farmer: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        plot: {
          select: {
            id: true,
            name: true,
            acreage: true,
            cropType: true,
            latitude: true,
            longitude: true,
          },
        },
        damageAssessments: {
          orderBy: {
            triggerDate: 'desc',
          },
        },
        payouts: {
          orderBy: {
            initiatedAt: 'desc',
          },
        },
      },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Calculate totals
    const totalDamageAssessments = policy.damageAssessments.length;
    const totalPayouts = policy.payouts.length;
    const completedPayouts = policy.payouts.filter(p => p.status === 'COMPLETED');
    const totalPayoutAmount = completedPayouts.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayouts = policy.payouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING');
    const pendingPayoutAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    // Calculate remaining coverage
    const remainingCoverage = policy.sumInsured - totalPayoutAmount;

    // Check if policy can still receive payouts
    const canReceivePayouts = policy.status === 'ACTIVE' && remainingCoverage > 0;

    res.json({
      success: true,
      policy: {
        id: policy.id,
        policyNumber: policy.policyNumber,
        status: policy.status,
        coverageType: policy.coverageType,
        sumInsured: policy.sumInsured,
        premium: policy.premium,
        startDate: policy.startDate,
        endDate: policy.endDate,
        farmer: policy.farmer,
        plot: policy.plot,
      },
      claims: {
        damageAssessments: policy.damageAssessments.map(assessment => ({
          ...assessment,
          payoutEligibility: calculatePayoutAmount(policy.sumInsured, assessment.damageIndex),
          severity: assessment.damageIndex < 0.3 ? 'Minor' :
                   assessment.damageIndex < 0.5 ? 'Moderate' :
                   assessment.damageIndex < 0.7 ? 'Severe' : 'Critical',
        })),
        payouts: policy.payouts,
      },
      summary: {
        totalDamageAssessments,
        totalPayouts,
        completedPayouts: completedPayouts.length,
        totalPayoutAmount,
        pendingPayouts: pendingPayouts.length,
        pendingPayoutAmount,
        remainingCoverage,
        canReceivePayouts,
        utilizationRate: ((totalPayoutAmount / policy.sumInsured) * 100).toFixed(2) + '%',
      },
    });

    logger.info('Claims retrieved for policy', {
      policyId,
      policyNumber: policy.policyNumber,
      totalClaims: totalDamageAssessments,
      totalPayouts,
    });
  } catch (error) {
    logger.error('Error retrieving policy claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve claims',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all payouts for a farmer
 * GET /api/claims/payouts/:farmerId
 */
const getFarmerPayouts = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = { farmerId };
    
    if (status) {
      where.status = status;
    }

    // Get payouts with pagination
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take,
        orderBy: {
          initiatedAt: 'desc',
        },
        include: {
          policy: {
            select: {
              id: true,
              policyNumber: true,
              coverageType: true,
              sumInsured: true,
              status: true,
              plot: {
                select: {
                  id: true,
                  name: true,
                  cropType: true,
                  acreage: true,
                },
              },
            },
          },
          farmer: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.payout.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    // Calculate summary statistics
    const allPayouts = await prisma.payout.findMany({
      where: { farmerId },
      select: {
        amount: true,
        status: true,
      },
    });

    const completedPayouts = allPayouts.filter(p => p.status === 'COMPLETED');
    const pendingPayouts = allPayouts.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING');
    const failedPayouts = allPayouts.filter(p => p.status === 'FAILED');

    const totalReceived = completedPayouts.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      payouts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
        limit: take,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
      summary: {
        totalPayouts: allPayouts.length,
        completedPayouts: completedPayouts.length,
        pendingPayouts: pendingPayouts.length,
        failedPayouts: failedPayouts.length,
        totalAmountReceived: totalReceived,
        totalAmountPending: totalPending,
      },
    });

    logger.info('Farmer payouts retrieved', {
      farmerId,
      totalPayouts: allPayouts.length,
      statusFilter: status,
    });
  } catch (error) {
    logger.error('Error retrieving farmer payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payouts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Process a payout manually (admin function)
 * POST /api/claims/process
 * Body: { policyId, weatherStressIndex, vegetationIndex, weatherData?, vegetationData? }
 */
const processPayout = async (req, res) => {
  try {
    const {
      policyId,
      weatherStressIndex,
      vegetationIndex,
      triggerDate,
      weatherData,
      vegetationData,
    } = req.body;

    // Validation
    if (!policyId || weatherStressIndex === undefined || vegetationIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: policyId, weatherStressIndex, vegetationIndex',
      });
    }

    // Validate indices are between 0 and 1
    if (weatherStressIndex < 0 || weatherStressIndex > 1 ||
        vegetationIndex < 0 || vegetationIndex > 1) {
      return res.status(400).json({
        success: false,
        error: 'Indices must be between 0 and 1',
      });
    }

    // Get policy
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        farmer: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        plot: {
          select: {
            id: true,
            name: true,
            cropType: true,
          },
        },
        payouts: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    // Check if policy is active
    if (policy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Cannot process payout for policy with status: ${policy.status}`,
      });
    }

    // Check if policy period is valid
    const now = new Date();
    const trigger = triggerDate ? new Date(triggerDate) : now;
    
    if (trigger < policy.startDate || trigger > policy.endDate) {
      return res.status(400).json({
        success: false,
        error: 'Trigger date must be within policy coverage period',
        policyStart: policy.startDate,
        policyEnd: policy.endDate,
      });
    }

    // Calculate damage index
    const damageIndex = calculateDamageIndex(weatherStressIndex, vegetationIndex);

    // Calculate payout amount
    const payoutAmount = calculatePayoutAmount(policy.sumInsured, damageIndex);

    // Check if damage is sufficient for payout
    if (payoutAmount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Damage index below payout threshold (minimum 0.3 required)',
        damageIndex,
        minimumRequired: 0.3,
      });
    }

    // Calculate total previous payouts
    const totalPreviousPayouts = policy.payouts.reduce((sum, p) => sum + p.amount, 0);

    // Check remaining coverage
    const remainingCoverage = policy.sumInsured - totalPreviousPayouts;
    
    if (remainingCoverage <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Policy coverage exhausted. No remaining coverage available.',
        sumInsured: policy.sumInsured,
        totalPayouts: totalPreviousPayouts,
      });
    }

    // Cap payout at remaining coverage
    const actualPayoutAmount = Math.min(payoutAmount, remainingCoverage);

    // ========================================
    // IPFS INTEGRATION: Upload damage proof to IPFS
    // ========================================
    let proofHash = null;
    let ipfsUrl = null;
    let gatewayUrl = null;

    try {
      // Initialize IPFS service if not already done
      await ipfsService.initialize();

      // Create comprehensive proof document
      const proofData = {
        claimId: `CLAIM-${Date.now()}`, // Temporary ID, will be updated after payout creation
        plotId: policy.plot.id,
        farmerId: policy.farmerId,
        damageIndex,
        weatherData: weatherData || {
          stationId: 'UNKNOWN',
          observations: [],
          period: {
            start: policy.startDate,
            end: trigger,
          },
          metrics: {
            weatherStressIndex,
          },
        },
        vegetationData: vegetationData || {
          source: 'Manual Assessment',
          ndviValues: [],
          changeDetection: null,
          analysisDate: trigger,
        },
        calculationDetails: {
          weatherStress: weatherStressIndex,
          vegetationStress: vegetationIndex,
          components: {
            weatherWeight: 0.6,
            vegetationWeight: 0.4,
          },
          thresholds: {
            noPayout: 0.3,
            maxPayout: 1.0,
          },
        },
        assessmentTimestamp: trigger,
      };

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadDamageProof(proofData);

      proofHash = ipfsResult.cid;
      ipfsUrl = ipfsResult.ipfsUrl;
      gatewayUrl = ipfsResult.gatewayUrl;

      logger.info('Damage proof uploaded to IPFS', {
        policyId,
        cid: proofHash,
        damageIndex,
      });
    } catch (ipfsError) {
      // Log IPFS error but don't fail the payout
      logger.error('Failed to upload proof to IPFS (non-blocking):', ipfsError);
      proofHash = 'IPFS_UPLOAD_FAILED';
    }

    // Create damage assessment record with IPFS proof hash
    const damageAssessment = await prisma.damageAssessment.create({
      data: {
        policyId,
        weatherStressIndex,
        vegetationIndex,
        damageIndex,
        triggerDate: trigger,
        proofHash,
      },
    });

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        policyId,
        farmerId: policy.farmerId,
        amount: actualPayoutAmount,
        status: 'PENDING',
      },
    });

    // Update policy status if this is a significant claim
    if (damageIndex > 0.7 || actualPayoutAmount >= policy.sumInsured * 0.8) {
      await prisma.policy.update({
        where: { id: policyId },
        data: {
          status: 'CLAIMED',
        },
      });
    }

    logger.info('Payout processed with IPFS proof', {
      policyId,
      policyNumber: policy.policyNumber,
      farmerId: policy.farmerId,
      damageIndex,
      payoutAmount: actualPayoutAmount,
      damageAssessmentId: damageAssessment.id,
      payoutId: payout.id,
      proofHash,
    });

    res.status(201).json({
      success: true,
      message: 'Payout processed successfully with IPFS proof',
      damageAssessment: {
        id: damageAssessment.id,
        weatherStressIndex: damageAssessment.weatherStressIndex,
        vegetationIndex: damageAssessment.vegetationIndex,
        damageIndex: damageAssessment.damageIndex,
        triggerDate: damageAssessment.triggerDate,
        proofHash: damageAssessment.proofHash,
        ipfsUrl,
        gatewayUrl,
        severity: damageIndex < 0.3 ? 'Minor' :
                 damageIndex < 0.5 ? 'Moderate' :
                 damageIndex < 0.7 ? 'Severe' : 'Critical',
      },
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        initiatedAt: payout.initiatedAt,
        capped: actualPayoutAmount < payoutAmount,
        requestedAmount: payoutAmount,
        actualAmount: actualPayoutAmount,
      },
      policy: {
        policyNumber: policy.policyNumber,
        sumInsured: policy.sumInsured,
        previousPayouts: totalPreviousPayouts,
        remainingCoverage: remainingCoverage - actualPayoutAmount,
      },
      farmer: {
        id: policy.farmer.id,
        name: `${policy.farmer.firstName} ${policy.farmer.lastName}`,
        phoneNumber: policy.farmer.phoneNumber,
      },
      instructions: {
        next: 'Payout is pending. Complete M-Pesa transfer to activate.',
        amount: actualPayoutAmount,
        phoneNumber: policy.farmer.phoneNumber,
      },
      blockchain: {
        proofVerifiable: proofHash !== null && proofHash !== 'IPFS_UPLOAD_FAILED',
        proofCID: proofHash,
        gatewayUrl,
        ipfsUrl,
      },
    });
  } catch (error) {
    logger.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update payout status (typically called by payment webhook or admin)
 * PUT /api/claims/payout/:payoutId/status
 * Body: { status, transactionHash?, mpesaRef?, failureReason? }
 */
const updatePayoutStatus = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { status, transactionHash, mpesaRef, failureReason } = req.body;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be PENDING, PROCESSING, COMPLETED, or FAILED',
      });
    }

    // Get existing payout
    const existingPayout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        farmer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        policy: {
          select: {
            policyNumber: true,
          },
        },
      },
    });

    if (!existingPayout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found',
      });
    }

    // Prepare update data
    const updateData = {
      status,
      transactionHash: transactionHash || existingPayout.transactionHash,
      mpesaRef: mpesaRef || existingPayout.mpesaRef,
      failureReason: status === 'FAILED' ? failureReason : existingPayout.failureReason,
    };

    // Set completion time if status is COMPLETED
    if (status === 'COMPLETED' && existingPayout.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    // Update payout
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: updateData,
    });

    logger.info('Payout status updated', {
      payoutId,
      oldStatus: existingPayout.status,
      newStatus: status,
      amount: existingPayout.amount,
      farmerId: existingPayout.farmerId,
    });

    res.json({
      success: true,
      message: `Payout status updated to ${status}`,
      payout: {
        id: updatedPayout.id,
        amount: updatedPayout.amount,
        status: updatedPayout.status,
        transactionHash: updatedPayout.transactionHash,
        mpesaRef: updatedPayout.mpesaRef,
        initiatedAt: updatedPayout.initiatedAt,
        completedAt: updatedPayout.completedAt,
        failureReason: updatedPayout.failureReason,
      },
      policy: {
        policyNumber: existingPayout.policy.policyNumber,
      },
      farmer: {
        name: `${existingPayout.farmer.firstName} ${existingPayout.farmer.lastName}`,
      },
    });
  } catch (error) {
    logger.error('Error updating payout status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payout status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get payout details by ID
 * GET /api/claims/payout/:payoutId
 */
const getPayoutDetails = async (req, res) => {
  try {
    const { payoutId } = req.params;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        policy: {
          include: {
            plot: {
              select: {
                name: true,
                cropType: true,
                acreage: true,
              },
            },
            damageAssessments: {
              orderBy: {
                triggerDate: 'desc',
              },
              take: 1, // Get the most recent damage assessment
            },
          },
        },
        farmer: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found',
      });
    }

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        transactionHash: payout.transactionHash,
        mpesaRef: payout.mpesaRef,
        initiatedAt: payout.initiatedAt,
        completedAt: payout.completedAt,
        failureReason: payout.failureReason,
        farmer: payout.farmer,
        policy: {
          id: payout.policy.id,
          policyNumber: payout.policy.policyNumber,
          coverageType: payout.policy.coverageType,
          sumInsured: payout.policy.sumInsured,
          status: payout.policy.status,
          plot: payout.policy.plot,
          latestDamageAssessment: payout.policy.damageAssessments[0] || null,
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving payout details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payout details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getPolicyClaims,
  getFarmerPayouts,
  processPayout,
  updatePayoutStatus,
  getPayoutDetails,
};
