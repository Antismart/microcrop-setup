const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

const prisma = new PrismaClient();

/**
 * Get cooperative dashboard statistics
 * GET /api/cooperative/stats
 * Filters data by cooperativeId from authenticated user
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get cooperativeId from authenticated user
    const cooperativeId = req.user.cooperativeId;

    if (!cooperativeId) {
      return res.status(403).json({
        success: false,
        error: 'User is not associated with a cooperative',
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get cooperative details
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!cooperative) {
      return res.status(404).json({
        success: false,
        error: 'Cooperative not found',
      });
    }

    const [
      totalFarmers,
      lastMonthFarmers,
      activePolicies,
      totalPolicies,
      premiumStats,
      lastMonthPremiums,
      claimsThisMonth,
      lastMonthClaims,
      pendingPayouts,
      plotStats,
    ] = await Promise.all([
      // Total farmers in this cooperative
      prisma.farmer.count({
        where: { cooperativeId },
      }),

      // Last month farmers
      prisma.farmer.count({
        where: {
          cooperativeId,
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Active policies for this cooperative
      prisma.policy.count({
        where: {
          cooperativeId,
          status: 'ACTIVE',
        },
      }),

      // Total policies for this cooperative
      prisma.policy.count({
        where: { cooperativeId },
      }),

      // Premium stats for this cooperative
      prisma.policy.aggregate({
        where: { cooperativeId },
        _sum: {
          premium: true,
        },
      }),

      // Last month premiums
      prisma.policy.aggregate({
        where: {
          cooperativeId,
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
        _sum: {
          premium: true,
        },
      }),

      // Claims this month for this cooperative
      prisma.damageAssessment.count({
        where: {
          policy: {
            cooperativeId,
          },
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      // Last month claims
      prisma.damageAssessment.count({
        where: {
          policy: {
            cooperativeId,
          },
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Pending payouts for this cooperative
      prisma.payout.aggregate({
        where: {
          policy: {
            cooperativeId,
          },
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),

      // Plot coverage area for this cooperative
      prisma.plot.aggregate({
        where: {
          farmer: {
            cooperativeId,
          },
        },
        _sum: {
          size: true,
        },
      }),
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const totalPremiumCollected = premiumStats._sum.premium || 0;
    const lastMonthPremiumAmount = lastMonthPremiums._sum.premium || 0;

    // Calculate growth for this month vs last month
    const currentMonthFarmers = await prisma.farmer.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const currentMonthPremiums = await prisma.policy.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        premium: true,
      },
    });

    const farmersGrowth = calculateGrowth(currentMonthFarmers, lastMonthFarmers);
    const premiumGrowth = calculateGrowth(
      currentMonthPremiums._sum.premium || 0,
      lastMonthPremiumAmount
    );
    const claimsGrowth = calculateGrowth(claimsThisMonth, lastMonthClaims);

    res.json({
      success: true,
      role: 'COOPERATIVE',
      cooperative: {
        id: cooperative.id,
        name: cooperative.name,
        status: cooperative.status,
      },
      totalFarmers,
      activePolicies,
      totalPremiumCollected,
      claimsThisMonth,
      pendingPayouts: pendingPayouts._count || 0,
      pendingPayoutsAmount: pendingPayouts._sum.amount || 0,
      coverageArea: plotStats._sum.size || 0,
      trends: {
        farmersGrowth: Math.round(farmersGrowth * 10) / 10,
        premiumGrowth: Math.round(premiumGrowth * 10) / 10,
        claimsGrowth: Math.round(claimsGrowth * 10) / 10,
      },
    });

    logger.info('Cooperative dashboard stats retrieved', {
      cooperativeId,
      cooperativeName: cooperative.name,
      totalFarmers,
      activePolicies,
      totalPremiumCollected,
    });
  } catch (error) {
    logger.error('Error retrieving dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get revenue chart data
 * GET /api/cooperative/revenue-chart?period=30d
 * Filters data by cooperativeId from authenticated user
 */
const getRevenueChart = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const cooperativeId = req.user.cooperativeId;

    if (!cooperativeId) {
      return res.status(403).json({
        success: false,
        error: 'User is not associated with a cooperative',
      });
    }

    // Parse period
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };

    const days = periodMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get policies and payouts for this cooperative only
    const policies = await prisma.policy.findMany({
      where: {
        cooperativeId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        premium: true,
        createdAt: true,
      },
    });

    const payouts = await prisma.payout.findMany({
      where: {
        policy: {
          cooperativeId,
        },
        completedAt: {
          gte: startDate,
        },
        status: 'COMPLETED',
      },
      select: {
        amount: true,
        completedAt: true,
      },
    });

    // Group by date
    const dateGroups = {};
    const numPoints = days <= 7 ? days : days <= 30 ? 30 : days <= 90 ? 30 : 12;

    // Initialize date buckets
    for (let i = 0; i < numPoints; i++) {
      const date = new Date();
      if (days <= 7) {
        date.setDate(date.getDate() - (days - 1 - i));
      } else if (days <= 90) {
        date.setDate(date.getDate() - (days - 1 - i * Math.floor(days / numPoints)));
      } else {
        date.setMonth(date.getMonth() - (12 - 1 - i));
      }

      const key = days <= 90
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      dateGroups[key] = {
        label: days <= 90
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        premiums: 0,
        payouts: 0,
      };
    }

    // Aggregate premiums
    policies.forEach(policy => {
      const date = new Date(policy.createdAt);
      const key = days <= 90
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (dateGroups[key]) {
        dateGroups[key].premiums += policy.premium || 0;
      }
    });

    // Aggregate payouts
    payouts.forEach(payout => {
      const date = new Date(payout.completedAt);
      const key = days <= 90
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (dateGroups[key]) {
        dateGroups[key].payouts += payout.amount || 0;
      }
    });

    // Convert to arrays
    const sortedKeys = Object.keys(dateGroups).sort();
    const labels = sortedKeys.map(key => dateGroups[key].label);
    const premiumsData = sortedKeys.map(key => Math.round(dateGroups[key].premiums * 100) / 100);
    const payoutsData = sortedKeys.map(key => Math.round(dateGroups[key].payouts * 100) / 100);

    res.json({
      success: true,
      role: 'COOPERATIVE',
      period,
      labels,
      premiums: premiumsData,
      payouts: payoutsData,
    });

    logger.info('Cooperative revenue chart data retrieved', { cooperativeId, period, dataPoints: labels.length });
  } catch (error) {
    logger.error('Error retrieving revenue chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve revenue chart data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get claims analytics
 * GET /api/cooperative/claims-analytics
 * Filters data by cooperativeId from authenticated user
 */
const getClaimsAnalytics = async (req, res) => {
  try {
    const cooperativeId = req.user.cooperativeId;

    if (!cooperativeId) {
      return res.status(403).json({
        success: false,
        error: 'User is not associated with a cooperative',
      });
    }

    const [
      totalClaims,
      claimsByStatus,
      averageClaimAmount,
      claimsByType,
      recentClaims,
    ] = await Promise.all([
      // Total claims for this cooperative
      prisma.damageAssessment.count({
        where: {
          policy: {
            cooperativeId,
          },
        },
      }),

      // Claims by status (using payout status as proxy)
      prisma.payout.groupBy({
        by: ['status'],
        where: {
          policy: {
            cooperativeId,
          },
        },
        _count: true,
      }),

      // Average claim amount for this cooperative
      prisma.payout.aggregate({
        where: {
          policy: {
            cooperativeId,
          },
          status: 'COMPLETED',
        },
        _avg: {
          amount: true,
        },
      }),

      // Claims by type (using policy coverage type) for this cooperative
      prisma.policy.groupBy({
        by: ['coverageType'],
        _count: true,
        where: {
          cooperativeId,
          status: 'CLAIMED',
        },
      }),

      // Recent claims for this cooperative
      prisma.damageAssessment.findMany({
        take: 10,
        where: {
          policy: {
            cooperativeId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          policy: {
            select: {
              policyNumber: true,
              coverageType: true,
              farmer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      role: 'COOPERATIVE',
      totalClaims,
      averageClaimAmount: averageClaimAmount._avg.amount || 0,
      claimsByStatus: claimsByStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
      claimsByType: claimsByType.map(item => ({
        type: item.coverageType,
        count: item._count,
      })),
      recentClaims: recentClaims.map(claim => ({
        id: claim.id,
        policyNumber: claim.policy.policyNumber,
        farmer: `${claim.policy.farmer.firstName} ${claim.policy.farmer.lastName}`,
        coverageType: claim.policy.coverageType,
        weatherStressIndex: claim.weatherStressIndex,
        vegetationIndex: claim.vegetationIndex,
        damageIndex: claim.damageIndex,
        createdAt: claim.createdAt,
      })),
    });

    logger.info('Cooperative claims analytics retrieved', { cooperativeId, totalClaims });
  } catch (error) {
    logger.error('Error retrieving claims analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve claims analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueChart,
  getClaimsAnalytics,
};
