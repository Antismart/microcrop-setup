const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

const prisma = new PrismaClient();

/**
 * Premium Calculation Logic
 * 
 * Base Formula: Premium = SumInsured × BaseRate × CropFactor × CoverageFactor × RegionFactor
 * 
 * Base Rates:
 * - Drought: 5% of sum insured
 * - Flood: 4% of sum insured
 * - Both: 8% of sum insured (10% discount vs buying separately)
 * 
 * Crop Risk Factors:
 * - MAIZE: 1.0 (baseline)
 * - BEANS: 1.2 (more vulnerable)
 * - POTATOES: 0.9 (less vulnerable)
 * - WHEAT: 1.1
 * - RICE: 1.3 (water-intensive)
 * - SORGHUM: 0.8 (drought-resistant)
 * - MILLET: 0.7 (very drought-resistant)
 * - CASSAVA: 0.75 (hardy)
 * - SWEET_POTATO: 0.85
 * - VEGETABLES: 1.4 (high value, high risk)
 * - OTHER: 1.0
 * 
 * Coverage Duration Factor:
 * - 3 months: 0.8
 * - 4-6 months: 1.0
 * - 7-9 months: 1.2
 * - 10+ months: 1.4
 */

const BASE_RATES = {
  DROUGHT: 0.05,  // 5%
  FLOOD: 0.04,    // 4%
  BOTH: 0.08,     // 8% (10% discount)
};

const CROP_RISK_FACTORS = {
  MAIZE: 1.0,
  BEANS: 1.2,
  POTATOES: 0.9,
  WHEAT: 1.1,
  RICE: 1.3,
  SORGHUM: 0.8,
  MILLET: 0.7,
  CASSAVA: 0.75,
  SWEET_POTATO: 0.85,
  VEGETABLES: 1.4,
  OTHER: 1.0,
};

// Default thresholds for different coverage types
const DEFAULT_THRESHOLDS = {
  DROUGHT: {
    precipitationThreshold: 50, // mm per month (below this triggers)
    consecutiveDays: 21,        // days
    severityMultiplier: 1.5,    // for calculating damage
  },
  FLOOD: {
    precipitationThreshold: 300, // mm per week (above this triggers)
    consecutiveHours: 48,        // hours
    severityMultiplier: 1.8,
  },
  BOTH: {
    // Combines both thresholds
    droughtThreshold: 50,
    droughtDays: 21,
    floodThreshold: 300,
    floodHours: 48,
  },
};

/**
 * Calculate insurance premium
 */
function calculatePremium(sumInsured, cropType, coverageType, durationMonths = 6) {
  const baseRate = BASE_RATES[coverageType] || 0.05;
  const cropFactor = CROP_RISK_FACTORS[cropType] || 1.0;
  
  // Duration factor
  let durationFactor = 1.0;
  if (durationMonths <= 3) durationFactor = 0.8;
  else if (durationMonths <= 6) durationFactor = 1.0;
  else if (durationMonths <= 9) durationFactor = 1.2;
  else durationFactor = 1.4;
  
  const premium = sumInsured * baseRate * cropFactor * durationFactor;
  
  return Math.round(premium * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate unique policy number
 */
function generatePolicyNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `POL-${year}${month}${day}-${random}`;
}

/**
 * Get insurance quote
 * POST /api/policies/quote
 * Body: { plotId, coverageType, sumInsured, durationMonths? }
 */
const getQuote = async (req, res) => {
  try {
    const { plotId, coverageType, sumInsured, durationMonths = 6 } = req.body;

    // Validation
    if (!plotId || !coverageType || !sumInsured) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: plotId, coverageType, sumInsured',
      });
    }

    if (!['DROUGHT', 'FLOOD', 'BOTH'].includes(coverageType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coverageType. Must be DROUGHT, FLOOD, or BOTH',
      });
    }

    if (sumInsured < 1000 || sumInsured > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Sum insured must be between KES 1,000 and KES 1,000,000',
      });
    }

    // Get plot details
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      include: {
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            kycStatus: true,
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

    // Calculate premium
    const premium = calculatePremium(
      sumInsured,
      plot.cropType,
      coverageType,
      durationMonths
    );

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // Get thresholds
    const thresholds = DEFAULT_THRESHOLDS[coverageType];

    res.json({
      success: true,
      quote: {
        plotId: plot.id,
        plotName: plot.name,
        acreage: plot.acreage,
        cropType: plot.cropType,
        coverageType,
        sumInsured,
        premium,
        premiumRate: ((premium / sumInsured) * 100).toFixed(2) + '%',
        durationMonths,
        startDate,
        endDate,
        thresholds,
        farmer: {
          id: plot.farmer.id,
          name: `${plot.farmer.firstName} ${plot.farmer.lastName}`,
          kycStatus: plot.farmer.kycStatus,
        },
        breakdown: {
          baseRate: (BASE_RATES[coverageType] * 100).toFixed(1) + '%',
          cropRiskFactor: CROP_RISK_FACTORS[plot.cropType],
          durationFactor: durationMonths <= 3 ? 0.8 : durationMonths <= 6 ? 1.0 : durationMonths <= 9 ? 1.2 : 1.4,
        },
      },
    });

    logger.info('Quote generated', {
      plotId,
      coverageType,
      sumInsured,
      premium,
      farmerId: plot.farmer.id,
    });
  } catch (error) {
    logger.error('Error generating quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quote',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Purchase insurance policy
 * POST /api/policies/purchase
 * Body: { plotId, coverageType, sumInsured, durationMonths?, customThresholds? }
 */
const purchasePolicy = async (req, res) => {
  try {
    const {
      plotId,
      coverageType,
      sumInsured,
      durationMonths = 6,
      customThresholds,
    } = req.body;

    // Validation
    if (!plotId || !coverageType || !sumInsured) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: plotId, coverageType, sumInsured',
      });
    }

    // Get plot with farmer details
    const plot = await prisma.plot.findUnique({
      where: { id: plotId },
      include: {
        farmer: true,
      },
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        error: 'Plot not found',
      });
    }

    // Check KYC status
    if (plot.farmer.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'KYC approval required before purchasing insurance',
        kycStatus: plot.farmer.kycStatus,
      });
    }

    // Check for existing active policies on this plot
    const existingPolicy = await prisma.policy.findFirst({
      where: {
        plotId,
        status: {
          in: ['PENDING_PAYMENT', 'ACTIVE'],
        },
      },
    });

    if (existingPolicy) {
      return res.status(409).json({
        success: false,
        error: 'Plot already has an active or pending policy',
        existingPolicyId: existingPolicy.id,
        existingPolicyNumber: existingPolicy.policyNumber,
      });
    }

    // Calculate premium
    const premium = calculatePremium(
      sumInsured,
      plot.cropType,
      coverageType,
      durationMonths
    );

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // Prepare thresholds
    const thresholds = customThresholds || DEFAULT_THRESHOLDS[coverageType];
    
    let droughtThreshold = null;
    let floodThreshold = null;

    if (coverageType === 'DROUGHT') {
      droughtThreshold = thresholds;
    } else if (coverageType === 'FLOOD') {
      floodThreshold = thresholds;
    } else if (coverageType === 'BOTH') {
      droughtThreshold = {
        precipitationThreshold: thresholds.droughtThreshold,
        consecutiveDays: thresholds.droughtDays,
        severityMultiplier: 1.5,
      };
      floodThreshold = {
        precipitationThreshold: thresholds.floodThreshold,
        consecutiveHours: thresholds.floodHours,
        severityMultiplier: 1.8,
      };
    }

    // Create policy
    const policy = await prisma.policy.create({
      data: {
        policyNumber: generatePolicyNumber(),
        farmerId: plot.farmerId,
        plotId,
        coverageType,
        sumInsured,
        premium,
        startDate,
        endDate,
        status: 'PENDING_PAYMENT',
        droughtThreshold: droughtThreshold ? JSON.stringify(droughtThreshold) : null,
        floodThreshold: floodThreshold ? JSON.stringify(floodThreshold) : null,
      },
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
          },
        },
      },
    });

    logger.info('Policy created', {
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      farmerId: plot.farmerId,
      premium,
    });

    res.status(201).json({
      success: true,
      message: 'Policy created successfully. Awaiting payment confirmation.',
      policy: {
        id: policy.id,
        policyNumber: policy.policyNumber,
        coverageType: policy.coverageType,
        sumInsured: policy.sumInsured,
        premium: policy.premium,
        startDate: policy.startDate,
        endDate: policy.endDate,
        status: policy.status,
        farmer: policy.farmer,
        plot: policy.plot,
        droughtThreshold: policy.droughtThreshold ? JSON.parse(policy.droughtThreshold) : null,
        floodThreshold: policy.floodThreshold ? JSON.parse(policy.floodThreshold) : null,
      },
      paymentInstructions: {
        amount: premium,
        phoneNumber: plot.farmer.phoneNumber,
        reference: policy.policyNumber,
        note: 'Complete payment to activate policy',
      },
    });
  } catch (error) {
    logger.error('Error purchasing policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create policy',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get farmer's policies
 * GET /api/policies/:farmerId
 */
const getFarmerPolicies = async (req, res) => {
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

    // Get policies with pagination
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
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
            select: {
              id: true,
              damageIndex: true,
              triggerDate: true,
            },
            orderBy: {
              triggerDate: 'desc',
            },
          },
          payouts: {
            select: {
              id: true,
              amount: true,
              status: true,
              initiatedAt: true,
              completedAt: true,
            },
          },
        },
      }),
      prisma.policy.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      policies: policies.map((policy) => ({
        ...policy,
        droughtThreshold: policy.droughtThreshold ? JSON.parse(policy.droughtThreshold) : null,
        floodThreshold: policy.floodThreshold ? JSON.parse(policy.floodThreshold) : null,
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
        limit: take,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching farmer policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get policy status and details
 * GET /api/policies/:id/status
 */
const getPolicyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await prisma.policy.findUnique({
      where: { id },
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
            weatherStationId: true,
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

    // Check if policy is active
    const now = new Date();
    const isActive = policy.status === 'ACTIVE' && 
                     now >= policy.startDate && 
                     now <= policy.endDate;

    // Calculate days remaining
    const daysRemaining = isActive 
      ? Math.ceil((policy.endDate - now) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate total payouts
    const totalPayouts = policy.payouts
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

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
        isActive,
        daysRemaining,
        createdAt: policy.createdAt,
        farmer: policy.farmer,
        plot: policy.plot,
        droughtThreshold: policy.droughtThreshold ? JSON.parse(policy.droughtThreshold) : null,
        floodThreshold: policy.floodThreshold ? JSON.parse(policy.floodThreshold) : null,
        damageAssessments: policy.damageAssessments,
        payouts: policy.payouts,
        summary: {
          totalDamageAssessments: policy.damageAssessments.length,
          totalPayouts: policy.payouts.length,
          totalPayoutAmount: totalPayouts,
          remainingCoverage: policy.sumInsured - totalPayouts,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching policy status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Activate policy after payment confirmation
 * PUT /api/policies/:id/activate
 * (Typically called by payment webhook)
 */
const activatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionReference } = req.body;

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        farmer: true,
      },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    if (policy.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        success: false,
        error: `Cannot activate policy with status: ${policy.status}`,
      });
    }

    // Update policy status to ACTIVE
    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    logger.info('Policy activated', {
      policyId: id,
      policyNumber: policy.policyNumber,
      farmerId: policy.farmerId,
      transactionReference,
    });

    res.json({
      success: true,
      message: 'Policy activated successfully',
      policy: {
        id: updatedPolicy.id,
        policyNumber: updatedPolicy.policyNumber,
        status: updatedPolicy.status,
        startDate: updatedPolicy.startDate,
        endDate: updatedPolicy.endDate,
      },
    });
  } catch (error) {
    logger.error('Error activating policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate policy',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Cancel policy
 * PUT /api/policies/:id/cancel
 */
const cancelPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const policy = await prisma.policy.findUnique({
      where: { id },
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
      });
    }

    if (policy.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({
        success: false,
        error: 'Only pending policies can be cancelled',
        currentStatus: policy.status,
      });
    }

    // Update policy status
    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    logger.warn('Policy cancelled', {
      policyId: id,
      policyNumber: policy.policyNumber,
      farmerId: policy.farmerId,
      reason,
    });

    res.json({
      success: true,
      message: 'Policy cancelled successfully',
      policy: {
        id: updatedPolicy.id,
        policyNumber: updatedPolicy.policyNumber,
        status: updatedPolicy.status,
      },
    });
  } catch (error) {
    logger.error('Error cancelling policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel policy',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all policies with pagination (for cooperative dashboard)
 */
const getPolicies = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where clause
    const where = {};

    // Filter by cooperativeId if user is cooperative
    if (req.user && req.user.cooperativeId) {
      where.cooperativeId = req.user.cooperativeId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Search by policy number or farmer name
    if (search) {
      where.OR = [
        { policyNumber: { contains: search, mode: 'insensitive' } },
        { farmer: { firstName: { contains: search, mode: 'insensitive' } } },
        { farmer: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get policies with farmer and plot info
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          plot: {
            select: {
              id: true,
              name: true,
              acreage: true,
              cropType: true,
            },
          },
        },
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      success: true,
      data: policies,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    logger.error('Error fetching policies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policies',
      message: error.message,
    });
  }
};

module.exports = {
  getQuote,
  purchasePolicy,
  getFarmerPolicies,
  getPolicyStatus,
  activatePolicy,
  cancelPolicy,
  getPolicies,
};
