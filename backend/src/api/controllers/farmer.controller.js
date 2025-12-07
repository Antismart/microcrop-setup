const { PrismaClient } = require('@prisma/client');
const logger = require('../../config/logger');

const prisma = new PrismaClient();

/**
 * Register a new farmer
 * POST /api/farmers/register
 * Body: { phoneNumber, firstName, lastName, county, subCounty, ward?, village?, nationalId? }
 */
const registerFarmer = async (req, res) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      county,
      subCounty,
      ward,
      village,
      nationalId,
    } = req.body;

    // Validation
    if (!phoneNumber || !firstName || !lastName || !county || !subCounty) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumber, firstName, lastName, county, subCounty',
      });
    }

    // Validate phone number format (Kenya format)
    const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Expected Kenya mobile number (e.g., 0712345678)',
      });
    }

    // Normalize phone number to format +254...
    let normalizedPhone = phoneNumber.replace(/\s+/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+254' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('254')) {
      normalizedPhone = '+' + normalizedPhone;
    } else if (!normalizedPhone.startsWith('+254')) {
      normalizedPhone = '+254' + normalizedPhone;
    }

    // Check if farmer already exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    if (existingFarmer) {
      return res.status(409).json({
        success: false,
        error: 'Farmer with this phone number already exists',
        farmerId: existingFarmer.id,
      });
    }

    // Check if nationalId already exists (if provided)
    if (nationalId) {
      const existingNationalId = await prisma.farmer.findUnique({
        where: { nationalId },
      });

      if (existingNationalId) {
        return res.status(409).json({
          success: false,
          error: 'Farmer with this national ID already exists',
        });
      }
    }

    // Create new farmer
    const farmer = await prisma.farmer.create({
      data: {
        phoneNumber: normalizedPhone,
        firstName,
        lastName,
        county,
        subCounty,
        ward: ward || null,
        village: village || null,
        nationalId: nationalId || null,
        kycStatus: nationalId ? 'PENDING' : 'PENDING', // KYC status starts as PENDING
      },
    });

    logger.info(`Farmer registered successfully: ${farmer.id}`, {
      farmerId: farmer.id,
      phoneNumber: normalizedPhone,
    });

    res.status(201).json({
      success: true,
      message: 'Farmer registered successfully',
      farmer: {
        id: farmer.id,
        phoneNumber: farmer.phoneNumber,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        county: farmer.county,
        subCounty: farmer.subCounty,
        ward: farmer.ward,
        village: farmer.village,
        kycStatus: farmer.kycStatus,
        createdAt: farmer.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error registering farmer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register farmer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get farmer by ID
 * GET /api/farmers/:id
 */
const getFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        plots: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            acreage: true,
            cropType: true,
            plantingDate: true,
            createdAt: true,
          },
        },
        policies: {
          select: {
            id: true,
            policyNumber: true,
            coverageType: true,
            sumInsured: true,
            premium: true,
            startDate: true,
            endDate: true,
            status: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            plots: true,
            policies: true,
            transactions: true,
            payouts: true,
          },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found',
      });
    }

    res.json({
      success: true,
      farmer: {
        id: farmer.id,
        phoneNumber: farmer.phoneNumber,
        nationalId: farmer.nationalId,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        county: farmer.county,
        subCounty: farmer.subCounty,
        ward: farmer.ward,
        village: farmer.village,
        kycStatus: farmer.kycStatus,
        createdAt: farmer.createdAt,
        updatedAt: farmer.updatedAt,
        plots: farmer.plots,
        policies: farmer.policies,
        statistics: {
          totalPlots: farmer._count.plots,
          totalPolicies: farmer._count.policies,
          totalTransactions: farmer._count.transactions,
          totalPayouts: farmer._count.payouts,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching farmer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farmer details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get farmer by phone number
 * GET /api/farmers/phone/:phoneNumber
 */
const getFarmerByPhone = async (req, res) => {
  try {
    let { phoneNumber } = req.params;

    // Normalize phone number
    phoneNumber = phoneNumber.replace(/\s+/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '+254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('254')) {
      phoneNumber = '+' + phoneNumber;
    } else if (!phoneNumber.startsWith('+254')) {
      phoneNumber = '+254' + phoneNumber;
    }

    const farmer = await prisma.farmer.findUnique({
      where: { phoneNumber },
      include: {
        plots: {
          select: {
            id: true,
            name: true,
            acreage: true,
            cropType: true,
          },
        },
        policies: {
          where: {
            status: {
              in: ['ACTIVE', 'PENDING_PAYMENT'],
            },
          },
          select: {
            id: true,
            policyNumber: true,
            status: true,
          },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found',
      });
    }

    res.json({
      success: true,
      farmer: {
        id: farmer.id,
        phoneNumber: farmer.phoneNumber,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        kycStatus: farmer.kycStatus,
        plots: farmer.plots,
        activePolicies: farmer.policies,
      },
    });
  } catch (error) {
    logger.error('Error fetching farmer by phone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farmer details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update farmer profile
 * PUT /api/farmers/:id
 * Body: { firstName?, lastName?, county?, subCounty?, ward?, village?, nationalId? }
 */
const updateFarmer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, county, subCounty, ward, village, nationalId } = req.body;

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id },
    });

    if (!existingFarmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found',
      });
    }

    // If updating nationalId, check it's not already in use
    if (nationalId && nationalId !== existingFarmer.nationalId) {
      const duplicateNationalId = await prisma.farmer.findUnique({
        where: { nationalId },
      });

      if (duplicateNationalId) {
        return res.status(409).json({
          success: false,
          error: 'National ID already in use by another farmer',
        });
      }
    }

    // Update farmer
    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: {
        firstName: firstName || existingFarmer.firstName,
        lastName: lastName || existingFarmer.lastName,
        county: county || existingFarmer.county,
        subCounty: subCounty || existingFarmer.subCounty,
        ward: ward !== undefined ? ward : existingFarmer.ward,
        village: village !== undefined ? village : existingFarmer.village,
        nationalId: nationalId !== undefined ? nationalId : existingFarmer.nationalId,
      },
    });

    logger.info(`Farmer updated successfully: ${id}`, {
      farmerId: id,
      changes: req.body,
    });

    res.json({
      success: true,
      message: 'Farmer updated successfully',
      farmer: {
        id: updatedFarmer.id,
        phoneNumber: updatedFarmer.phoneNumber,
        nationalId: updatedFarmer.nationalId,
        firstName: updatedFarmer.firstName,
        lastName: updatedFarmer.lastName,
        county: updatedFarmer.county,
        subCounty: updatedFarmer.subCounty,
        ward: updatedFarmer.ward,
        village: updatedFarmer.village,
        kycStatus: updatedFarmer.kycStatus,
        updatedAt: updatedFarmer.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Error updating farmer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update farmer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update KYC status
 * PUT /api/farmers/:id/kyc
 * Body: { kycStatus: 'APPROVED' | 'REJECTED' | 'PENDING', rejectionReason? }
 */
const updateKycStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { kycStatus, rejectionReason } = req.body;

    // Validation
    if (!kycStatus) {
      return res.status(400).json({
        success: false,
        error: 'kycStatus is required',
      });
    }

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(kycStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid kycStatus. Must be APPROVED, REJECTED, or PENDING',
      });
    }

    // Check if farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found',
      });
    }

    // Update KYC status
    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: {
        kycStatus,
      },
    });

    logger.info(`KYC status updated for farmer: ${id}`, {
      farmerId: id,
      oldStatus: farmer.kycStatus,
      newStatus: kycStatus,
      rejectionReason: kycStatus === 'REJECTED' ? rejectionReason : undefined,
    });

    res.json({
      success: true,
      message: `KYC status updated to ${kycStatus}`,
      farmer: {
        id: updatedFarmer.id,
        firstName: updatedFarmer.firstName,
        lastName: updatedFarmer.lastName,
        phoneNumber: updatedFarmer.phoneNumber,
        kycStatus: updatedFarmer.kycStatus,
        updatedAt: updatedFarmer.updatedAt,
      },
      rejectionReason: kycStatus === 'REJECTED' ? rejectionReason : undefined,
    });
  } catch (error) {
    logger.error('Error updating KYC status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update KYC status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * List all farmers with pagination and filters
 * GET /api/farmers?page=1&limit=20&kycStatus=APPROVED&county=Nairobi
 */
const listFarmers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      kycStatus,
      county,
      subCounty,
      search,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (kycStatus) {
      where.kycStatus = kycStatus;
    }

    if (county) {
      where.county = county;
    }

    if (subCounty) {
      where.subCounty = subCounty;
    }

    // Search by name or phone number
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    // Get farmers with pagination
    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              plots: true,
              policies: true,
            },
          },
        },
      }),
      prisma.farmer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: farmers.map((farmer) => ({
        id: farmer.id,
        phoneNumber: farmer.phoneNumber,
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        county: farmer.county,
        subCounty: farmer.subCounty,
        kycStatus: farmer.kycStatus,
        createdAt: farmer.createdAt,
        plotCount: farmer._count.plots,
        policyCount: farmer._count.policies,
      })),
      total: total,
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
    logger.error('Error listing farmers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch farmers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete a farmer (soft delete or hard delete based on business logic)
 * DELETE /api/farmers/:id
 */
const deleteFarmer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        policies: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        error: 'Farmer not found',
      });
    }

    // Prevent deletion if farmer has active policies
    if (farmer.policies.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete farmer with active policies',
        activePolicies: farmer.policies.length,
      });
    }

    // Delete farmer (cascade will delete related records)
    await prisma.farmer.delete({
      where: { id },
    });

    logger.warn(`Farmer deleted: ${id}`, {
      farmerId: id,
      farmerName: `${farmer.firstName} ${farmer.lastName}`,
    });

    res.json({
      success: true,
      message: 'Farmer deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting farmer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete farmer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  registerFarmer,
  getFarmer,
  getFarmerByPhone,
  updateFarmer,
  updateKycStatus,
  listFarmers,
  deleteFarmer,
};
