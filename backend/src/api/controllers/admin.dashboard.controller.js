const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

const prisma = new PrismaClient();

/**
 * Get admin platform-wide dashboard statistics
 * GET /api/admin/dashboard/stats
 */
const getAdminDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      // Cooperatives
      totalCooperatives,
      activeCooperatives,
      lastMonthCooperatives,

      // Farmers across all cooperatives
      totalFarmers,
      lastMonthFarmers,
      pendingKycFarmers,

      // Policies across all cooperatives
      totalPolicies,
      activePolicies,
      lastMonthPolicies,

      // Financial stats across platform
      totalPremiumStats,
      lastMonthPremiumStats,
      totalPayoutStats,

      // Claims across platform
      totalClaims,
      pendingClaims,
      lastMonthClaims,

      // Coverage
      totalPlotSize,

      // Top cooperatives by premium
      topCooperatives,
    ] = await Promise.all([
      // Cooperatives
      prisma.cooperative.count(),
      prisma.cooperative.count({ where: { status: 'ACTIVE' } }),
      prisma.cooperative.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Farmers
      prisma.farmer.count(),
      prisma.farmer.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),
      prisma.farmer.count({ where: { kycStatus: 'PENDING' } }),

      // Policies
      prisma.policy.count(),
      prisma.policy.count({ where: { status: 'ACTIVE' } }),
      prisma.policy.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Premiums
      prisma.policy.aggregate({
        _sum: { premium: true },
      }),
      prisma.policy.aggregate({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
        _sum: { premium: true },
      }),

      // Payouts
      prisma.payout.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),

      // Claims
      prisma.damageAssessment.count(),
      prisma.payout.count({
        where: {
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
      }),
      prisma.damageAssessment.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Coverage
      prisma.plot.aggregate({
        _sum: { size: true },
      }),

      // Top cooperatives
      prisma.cooperative.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          policies: {
            select: {
              premium: true,
            },
          },
          farmers: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    // Calculate growth
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

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

    const currentMonthClaims = await prisma.damageAssessment.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate platform metrics
    const lossRatio = totalPremiumStats._sum.premium > 0
      ? (totalPayoutStats._sum.amount / totalPremiumStats._sum.premium) * 100
      : 0;

    // Process top cooperatives
    const topCooperativesData = topCooperatives.map(coop => ({
      id: coop.id,
      name: coop.name,
      totalFarmers: coop.farmers.length,
      totalPremium: coop.policies.reduce((sum, p) => sum + (p.premium || 0), 0),
    })).sort((a, b) => b.totalPremium - a.totalPremium);

    res.json({
      success: true,
      role: 'ADMIN',
      platformStats: {
        totalCooperatives,
        activeCooperatives,
        totalFarmers,
        activePolicies,
        totalPremiumCollected: totalPremiumStats._sum.premium || 0,
        totalPayoutsDistributed: totalPayoutStats._sum.amount || 0,
        totalClaims,
        pendingClaims,
        pendingKycFarmers,
        coverageArea: totalPlotSize._sum.size || 0,
        lossRatio: Math.round(lossRatio * 10) / 10,
      },
      trends: {
        cooperativeGrowth: calculateGrowth(
          await prisma.cooperative.count({
            where: { createdAt: { gte: startOfMonth } },
          }),
          lastMonthCooperatives
        ),
        farmerGrowth: calculateGrowth(currentMonthFarmers, lastMonthFarmers),
        policyGrowth: calculateGrowth(
          await prisma.policy.count({
            where: { createdAt: { gte: startOfMonth } },
          }),
          lastMonthPolicies
        ),
        premiumGrowth: calculateGrowth(
          currentMonthPremiums._sum.premium || 0,
          lastMonthPremiumStats._sum.premium || 0
        ),
        claimGrowth: calculateGrowth(currentMonthClaims, lastMonthClaims),
      },
      topCooperatives: topCooperativesData,
    });

    logger.info('Admin dashboard stats retrieved', {
      totalCooperatives,
      totalFarmers,
      activePolicies,
    });
  } catch (error) {
    logger.error('Error retrieving admin dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin dashboard statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get admin platform-wide revenue chart
 * GET /api/admin/dashboard/revenue-chart?period=30d
 */
const getAdminRevenueChart = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };

    const days = periodMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all policies and payouts across all cooperatives
    const policies = await prisma.policy.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        premium: true,
        createdAt: true,
        cooperativeId: true,
      },
    });

    const payouts = await prisma.payout.findMany({
      where: {
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
        cooperatives: new Set(),
      };
    }

    // Aggregate
    policies.forEach(policy => {
      const date = new Date(policy.createdAt);
      const key = days <= 90
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (dateGroups[key]) {
        dateGroups[key].premiums += policy.premium || 0;
        if (policy.cooperativeId) {
          dateGroups[key].cooperatives.add(policy.cooperativeId);
        }
      }
    });

    payouts.forEach(payout => {
      const date = new Date(payout.completedAt);
      const key = days <= 90
        ? date.toISOString().split('T')[0]
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (dateGroups[key]) {
        dateGroups[key].payouts += payout.amount || 0;
      }
    });

    const sortedKeys = Object.keys(dateGroups).sort();
    const labels = sortedKeys.map(key => dateGroups[key].label);
    const premiumsData = sortedKeys.map(key => Math.round(dateGroups[key].premiums * 100) / 100);
    const payoutsData = sortedKeys.map(key => Math.round(dateGroups[key].payouts * 100) / 100);
    const cooperativesActive = sortedKeys.map(key => dateGroups[key].cooperatives.size);

    res.json({
      success: true,
      role: 'ADMIN',
      period,
      labels,
      premiums: premiumsData,
      payouts: payoutsData,
      activeCooperatives: cooperativesActive,
    });

    logger.info('Admin revenue chart data retrieved', { period });
  } catch (error) {
    logger.error('Error retrieving admin revenue chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin revenue chart data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get admin system health metrics
 * GET /api/admin/dashboard/system-health
 */
const getSystemHealth = async (req, res) => {
  try {
    const [
      databaseHealth,
      recentErrors,
      processingQueue,
    ] = await Promise.all([
      // Check database connectivity
      prisma.$queryRaw`SELECT 1 as health`
        .then(() => ({ status: 'healthy', latency: Date.now() }))
        .catch(err => ({ status: 'unhealthy', error: err.message })),

      // Get recent failed payouts (as proxy for errors)
      prisma.payout.count({
        where: {
          status: 'FAILED',
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Processing queue size
      prisma.payout.count({
        where: {
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
      }),
    ]);

    res.json({
      success: true,
      role: 'ADMIN',
      systemHealth: {
        database: databaseHealth,
        recentErrors,
        processingQueue,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info('System health metrics retrieved');
  } catch (error) {
    logger.error('Error retrieving system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health metrics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAdminDashboardStats,
  getAdminRevenueChart,
  getSystemHealth,
};
