const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

const prisma = new PrismaClient();

/**
 * Get dashboard statistics and metrics
 * GET /api/admin/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days to look back
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Run multiple queries in parallel for performance
    const [
      // Farmer statistics
      totalFarmers,
      newFarmers,
      farmersByKycStatus,
      farmersByCounty,
      
      // Policy statistics
      totalPolicies,
      newPolicies,
      policiesByStatus,
      policiesByCoverage,
      
      // Financial statistics
      totalPremiums,
      totalPayouts,
      totalSumInsured,
      
      // Recent activity
      recentPolicies,
      recentPayouts,
      pendingPayouts,
      
      // Plot statistics
      totalPlots,
      plotsByCrop,
      
      // Transaction statistics
      recentTransactions,
    ] = await Promise.all([
      // Farmers
      prisma.farmer.count(),
      prisma.farmer.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.farmer.groupBy({
        by: ['kycStatus'],
        _count: true,
      }),
      prisma.farmer.groupBy({
        by: ['county'],
        _count: true,
        orderBy: {
          _count: {
            county: 'desc',
          },
        },
        take: 10,
      }),
      
      // Policies
      prisma.policy.count(),
      prisma.policy.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.policy.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.policy.groupBy({
        by: ['coverageType'],
        _count: true,
      }),
      
      // Financial aggregations
      prisma.policy.aggregate({
        _sum: {
          premium: true,
        },
      }),
      prisma.payout.aggregate({
        where: {
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.policy.aggregate({
        where: {
          status: {
            in: ['ACTIVE', 'CLAIMED'],
          },
        },
        _sum: {
          sumInsured: true,
        },
      }),
      
      // Recent activity
      prisma.policy.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          policyNumber: true,
          status: true,
          premium: true,
          sumInsured: true,
          createdAt: true,
          farmer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.payout.findMany({
        take: 10,
        orderBy: {
          initiatedAt: 'desc',
        },
        select: {
          id: true,
          amount: true,
          status: true,
          initiatedAt: true,
          completedAt: true,
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
      }),
      prisma.payout.findMany({
        where: {
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
        orderBy: {
          initiatedAt: 'asc',
        },
        select: {
          id: true,
          amount: true,
          status: true,
          initiatedAt: true,
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          policy: {
            select: {
              policyNumber: true,
              coverageType: true,
            },
          },
        },
      }),
      
      // Plots
      prisma.plot.count(),
      prisma.plot.groupBy({
        by: ['cropType'],
        _count: true,
        orderBy: {
          _count: {
            cropType: 'desc',
          },
        },
      }),
      
      // Transactions
      prisma.transaction.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          reference: true,
          createdAt: true,
          farmer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    // Calculate metrics
    const activePolicies = policiesByStatus.find(p => p.status === 'ACTIVE')?._count || 0;
    const claimedPolicies = policiesByStatus.find(p => p.status === 'CLAIMED')?._count || 0;
    const pendingPolicies = policiesByStatus.find(p => p.status === 'PENDING_PAYMENT')?._count || 0;
    
    const totalPremiumAmount = totalPremiums._sum.premium || 0;
    const totalPayoutAmount = totalPayouts._sum.amount || 0;
    const totalCoverage = totalSumInsured._sum.sumInsured || 0;
    
    const lossRatio = totalPremiumAmount > 0 
      ? ((totalPayoutAmount / totalPremiumAmount) * 100).toFixed(2) 
      : 0;
    
    const approvedFarmers = farmersByKycStatus.find(f => f.kycStatus === 'APPROVED')?._count || 0;
    const pendingKyc = farmersByKycStatus.find(f => f.kycStatus === 'PENDING')?._count || 0;

    // Calculate growth rates
    const farmerGrowthRate = totalFarmers > 0 
      ? ((newFarmers / totalFarmers) * 100).toFixed(2)
      : 0;
    
    const policyGrowthRate = totalPolicies > 0
      ? ((newPolicies / totalPolicies) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      period: `Last ${daysAgo} days`,
      dashboard: {
        overview: {
          totalFarmers,
          totalPolicies,
          totalPlots,
          activePolicies,
          claimedPolicies,
          pendingPolicies,
        },
        financial: {
          totalPremiumsCollected: totalPremiumAmount,
          totalPayoutsDisbursed: totalPayoutAmount,
          totalCoverageInForce: totalCoverage,
          lossRatio: `${lossRatio}%`,
          netIncome: totalPremiumAmount - totalPayoutAmount,
          averagePremium: totalPolicies > 0 ? (totalPremiumAmount / totalPolicies).toFixed(2) : 0,
        },
        growth: {
          newFarmers,
          newPolicies,
          farmerGrowthRate: `${farmerGrowthRate}%`,
          policyGrowthRate: `${policyGrowthRate}%`,
        },
        farmers: {
          byKycStatus: farmersByKycStatus.map(f => ({
            status: f.kycStatus,
            count: f._count,
            percentage: ((f._count / totalFarmers) * 100).toFixed(1) + '%',
          })),
          byCounty: farmersByCounty.map(f => ({
            county: f.county,
            count: f._count,
          })),
          approvedFarmers,
          pendingKyc,
        },
        policies: {
          byStatus: policiesByStatus.map(p => ({
            status: p.status,
            count: p._count,
            percentage: ((p._count / totalPolicies) * 100).toFixed(1) + '%',
          })),
          byCoverage: policiesByCoverage.map(p => ({
            type: p.coverageType,
            count: p._count,
            percentage: ((p._count / totalPolicies) * 100).toFixed(1) + '%',
          })),
        },
        plots: {
          total: totalPlots,
          byCrop: plotsByCrop.map(p => ({
            crop: p.cropType,
            count: p._count,
            percentage: totalPlots > 0 ? ((p._count / totalPlots) * 100).toFixed(1) + '%' : '0%',
          })),
        },
        payouts: {
          pending: pendingPayouts.length,
          pendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
          recentPayouts: recentPayouts.length,
        },
        recentActivity: {
          policies: recentPolicies.map(p => ({
            id: p.id,
            policyNumber: p.policyNumber,
            farmer: `${p.farmer.firstName} ${p.farmer.lastName}`,
            premium: p.premium,
            sumInsured: p.sumInsured,
            status: p.status,
            createdAt: p.createdAt,
          })),
          payouts: recentPayouts.map(p => ({
            id: p.id,
            farmer: `${p.farmer.firstName} ${p.farmer.lastName}`,
            policyNumber: p.policy.policyNumber,
            amount: p.amount,
            status: p.status,
            initiatedAt: p.initiatedAt,
            completedAt: p.completedAt,
          })),
          transactions: recentTransactions.map(t => ({
            id: t.id,
            farmer: `${t.farmer.firstName} ${t.farmer.lastName}`,
            type: t.type,
            amount: t.amount,
            status: t.status,
            reference: t.reference,
            createdAt: t.createdAt,
          })),
        },
        pendingActions: {
          pendingKyc,
          pendingPayouts: pendingPayouts.length,
          pendingPolicies,
          items: pendingPayouts.map(p => ({
            id: p.id,
            type: 'PAYOUT',
            farmerId: p.farmer.id,
            farmer: `${p.farmer.firstName} ${p.farmer.lastName}`,
            phoneNumber: p.farmer.phoneNumber,
            policyNumber: p.policy.policyNumber,
            coverageType: p.policy.coverageType,
            amount: p.amount,
            status: p.status,
            initiatedAt: p.initiatedAt,
          })),
        },
      },
    });

    logger.info('Dashboard data retrieved', {
      period: daysAgo,
      totalFarmers,
      totalPolicies,
      activePolicies,
    });
  } catch (error) {
    logger.error('Error retrieving dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Simulate weather event for testing
 * POST /api/admin/weather/simulate
 * Body: { policyId, eventType, weatherStressIndex, vegetationIndex, triggerDate? }
 */
const simulateWeatherEvent = async (req, res) => {
  try {
    const {
      policyId,
      eventType,
      weatherStressIndex,
      vegetationIndex,
      triggerDate,
    } = req.body;

    // Validation
    if (!policyId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: policyId, eventType',
      });
    }

    if (!['DROUGHT', 'FLOOD', 'HEAT'].includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid eventType. Must be DROUGHT, FLOOD, or HEAT',
      });
    }

    // Default indices based on event type if not provided
    let weatherStress = weatherStressIndex;
    let vegIndex = vegetationIndex;

    if (weatherStress === undefined) {
      weatherStress = eventType === 'DROUGHT' ? 0.8 :
                     eventType === 'FLOOD' ? 0.7 :
                     0.6; // HEAT
    }

    if (vegIndex === undefined) {
      vegIndex = eventType === 'DROUGHT' ? 0.7 :
                eventType === 'FLOOD' ? 0.5 :
                0.4; // HEAT
    }

    // Validate indices
    if (weatherStress < 0 || weatherStress > 1 || vegIndex < 0 || vegIndex > 1) {
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
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        plot: {
          select: {
            name: true,
            cropType: true,
            latitude: true,
            longitude: true,
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

    if (policy.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Cannot simulate event for policy with status: ${policy.status}`,
      });
    }

    // Calculate damage index (60% weather, 40% vegetation)
    const damageIndex = (weatherStress * 0.6) + (vegIndex * 0.4);

    // Create damage assessment
    const damageAssessment = await prisma.damageAssessment.create({
      data: {
        policyId,
        weatherStressIndex: weatherStress,
        vegetationIndex: vegIndex,
        damageIndex,
        triggerDate: triggerDate ? new Date(triggerDate) : new Date(),
        proofHash: `SIMULATED-${eventType}-${Date.now()}`,
      },
    });

    // Calculate payout amount
    let payoutAmount = 0;
    if (damageIndex >= 0.3) {
      const minPayout = 0.30;
      const maxPayout = 1.0;
      const minDamage = 0.3;
      const maxDamage = 1.0;
      
      let payoutPercentage = minPayout + 
        ((damageIndex - minDamage) / (maxDamage - minDamage)) * (maxPayout - minPayout);
      
      payoutPercentage = Math.min(payoutPercentage, 1.0);
      payoutAmount = Math.round(policy.sumInsured * payoutPercentage * 100) / 100;
    }

    // Create payout if eligible
    let payout = null;
    if (payoutAmount > 0) {
      payout = await prisma.payout.create({
        data: {
          policyId,
          farmerId: policy.farmerId,
          amount: payoutAmount,
          status: 'PENDING',
        },
      });
    }

    logger.warn('Weather event simulated', {
      policyId,
      policyNumber: policy.policyNumber,
      eventType,
      damageIndex,
      payoutAmount,
      simulated: true,
    });

    res.status(201).json({
      success: true,
      message: 'Weather event simulated successfully',
      simulation: {
        eventType,
        policyNumber: policy.policyNumber,
        plot: policy.plot,
        farmer: policy.farmer,
      },
      damageAssessment: {
        id: damageAssessment.id,
        weatherStressIndex: damageAssessment.weatherStressIndex,
        vegetationIndex: damageAssessment.vegetationIndex,
        damageIndex: damageAssessment.damageIndex,
        triggerDate: damageAssessment.triggerDate,
        severity: damageIndex < 0.3 ? 'Minor' :
                 damageIndex < 0.5 ? 'Moderate' :
                 damageIndex < 0.7 ? 'Severe' : 'Critical',
      },
      payout: payout ? {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        eligible: true,
      } : {
        eligible: false,
        reason: 'Damage index below threshold (0.3)',
      },
      warning: '⚠️  This is a SIMULATED event for testing purposes',
    });
  } catch (error) {
    logger.error('Error simulating weather event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate weather event',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Manually approve/process a payout
 * POST /api/admin/payout/approve
 * Body: { payoutId, approve, transactionHash?, mpesaRef?, rejectionReason? }
 */
const approvePayout = async (req, res) => {
  try {
    const {
      payoutId,
      approve,
      transactionHash,
      mpesaRef,
      rejectionReason,
    } = req.body;

    // Validation
    if (!payoutId || approve === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payoutId, approve',
      });
    }

    // Get payout
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        farmer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        policy: {
          select: {
            policyNumber: true,
            sumInsured: true,
            coverageType: true,
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

    if (payout.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Payout already completed',
      });
    }

    if (payout.status === 'FAILED') {
      return res.status(400).json({
        success: false,
        error: 'Payout already failed. Create a new payout if needed.',
      });
    }

    // Update payout based on approval
    const updateData = approve ? {
      status: 'COMPLETED',
      transactionHash: transactionHash || null,
      mpesaRef: mpesaRef || null,
      completedAt: new Date(),
    } : {
      status: 'FAILED',
      failureReason: rejectionReason || 'Manually rejected by admin',
    };

    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: updateData,
    });

    logger.info(`Payout ${approve ? 'approved' : 'rejected'} by admin`, {
      payoutId,
      farmerId: payout.farmerId,
      amount: payout.amount,
      approve,
      transactionHash,
      mpesaRef,
    });

    res.json({
      success: true,
      message: approve ? 'Payout approved and completed' : 'Payout rejected',
      payout: {
        id: updatedPayout.id,
        amount: updatedPayout.amount,
        status: updatedPayout.status,
        transactionHash: updatedPayout.transactionHash,
        mpesaRef: updatedPayout.mpesaRef,
        completedAt: updatedPayout.completedAt,
        failureReason: updatedPayout.failureReason,
      },
      policy: {
        policyNumber: payout.policy.policyNumber,
        coverageType: payout.policy.coverageType,
        sumInsured: payout.policy.sumInsured,
      },
      farmer: {
        name: `${payout.farmer.firstName} ${payout.farmer.lastName}`,
        phoneNumber: payout.farmer.phoneNumber,
      },
    });
  } catch (error) {
    logger.error('Error approving payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve payout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get system statistics
 * GET /api/admin/stats
 */
const getSystemStats = async (req, res) => {
  try {
    const [
      // Database counts
      farmers,
      policies,
      plots,
      damageAssessments,
      payouts,
      transactions,
      
      // Financial aggregates
      premiumStats,
      payoutStats,
      coverageStats,
    ] = await Promise.all([
      prisma.farmer.count(),
      prisma.policy.count(),
      prisma.plot.count(),
      prisma.damageAssessment.count(),
      prisma.payout.count(),
      prisma.transaction.count(),
      
      prisma.policy.aggregate({
        _sum: { premium: true },
        _avg: { premium: true },
        _max: { premium: true },
        _min: { premium: true },
      }),
      
      prisma.payout.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
      
      prisma.policy.aggregate({
        where: { status: { in: ['ACTIVE', 'CLAIMED'] } },
        _sum: { sumInsured: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      stats: {
        counts: {
          farmers,
          policies,
          plots,
          damageAssessments,
          payouts,
          transactions,
        },
        premiums: {
          total: premiumStats._sum.premium || 0,
          average: premiumStats._avg.premium || 0,
          max: premiumStats._max.premium || 0,
          min: premiumStats._min.premium || 0,
        },
        payouts: {
          total: payoutStats._sum.amount || 0,
          average: payoutStats._avg.amount || 0,
          count: payoutStats._count,
        },
        coverage: {
          totalInForce: coverageStats._sum.sumInsured || 0,
          activePolicies: coverageStats._count,
        },
        ratios: {
          lossRatio: premiumStats._sum.premium 
            ? ((payoutStats._sum.amount / premiumStats._sum.premium) * 100).toFixed(2) + '%'
            : '0%',
          plotsPerFarmer: farmers > 0 ? (plots / farmers).toFixed(2) : 0,
          policiesPerFarmer: farmers > 0 ? (policies / farmers).toFixed(2) : 0,
          claimRate: policies > 0 ? ((damageAssessments / policies) * 100).toFixed(2) + '%' : '0%',
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Bulk approve KYC
 * POST /api/admin/kyc/bulk-approve
 * Body: { farmerIds: string[] }
 */
const bulkApproveKyc = async (req, res) => {
  try {
    const { farmerIds } = req.body;

    if (!farmerIds || !Array.isArray(farmerIds) || farmerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'farmerIds array is required',
      });
    }

    // Update all farmers in one query
    const result = await prisma.farmer.updateMany({
      where: {
        id: {
          in: farmerIds,
        },
        kycStatus: 'PENDING', // Only update pending ones
      },
      data: {
        kycStatus: 'APPROVED',
      },
    });

    logger.info('Bulk KYC approval', {
      requestedCount: farmerIds.length,
      approvedCount: result.count,
    });

    res.json({
      success: true,
      message: `Successfully approved ${result.count} farmers`,
      approved: result.count,
      requested: farmerIds.length,
    });
  } catch (error) {
    logger.error('Error bulk approving KYC:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk approve KYC',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboard,
  simulateWeatherEvent,
  approvePayout,
  getSystemStats,
  bulkApproveKyc,
};
