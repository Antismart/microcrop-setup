// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MathLib} from "./MathLib.sol";

/**
 * @title PolicyLib
 * @notice Library for policy-related calculations (premiums, risk scoring, eligibility)
 * @dev Pure functions for use across PolicyManager and related contracts
 */
library PolicyLib {
    using MathLib for uint256;

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant MIN_COVERAGE_PERIOD = 30 days;
    uint256 private constant MAX_COVERAGE_PERIOD = 180 days;
    uint256 private constant MIN_SUM_INSURED = 100 * 1e6; // 100 USDC
    uint256 private constant MAX_SUM_INSURED = 10_000 * 1e6; // 10,000 USDC

    // ============ Enums ============

    enum CropType {
        MAIZE,
        BEANS,
        WHEAT,
        SORGHUM,
        MILLET,
        RICE
    }

    enum CoverageType {
        DROUGHT,
        FLOOD,
        MULTI_PERIL
    }

    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        VERY_HIGH
    }

    // ============ Structs ============

    /**
     * @notice Base rates for different crop and coverage combinations (in bps)
     */
    struct RateCard {
        uint256 maizeDrought;      // 500 bps (5%)
        uint256 maizeFlood;        // 400 bps (4%)
        uint256 maizeMultiPeril;   // 800 bps (8%)
        uint256 beansDrought;      // 600 bps (6%)
        uint256 beansFlood;        // 450 bps (4.5%)
        uint256 beansMultiPeril;   // 900 bps (9%)
        uint256 wheatDrought;      // 450 bps (4.5%)
        uint256 wheatFlood;        // 400 bps (4%)
        uint256 wheatMultiPeril;   // 750 bps (7.5%)
        uint256 sorghumDrought;    // 400 bps (4%)
        uint256 sorghumFlood;      // 350 bps (3.5%)
        uint256 sorghumMultiPeril; // 700 bps (7%)
        uint256 milletDrought;     // 350 bps (3.5%)
        uint256 milletFlood;       // 300 bps (3%)
        uint256 milletMultiPeril;  // 600 bps (6%)
        uint256 riceDrought;       // 550 bps (5.5%)
        uint256 riceFlood;         // 500 bps (5%)
        uint256 riceMultiPeril;    // 850 bps (8.5%)
    }

    /**
     * @notice Risk factors for premium adjustment
     */
    struct RiskFactors {
        uint256 historicalLosses;   // Historical loss ratio (0-10000)
        uint256 weatherVolatility;  // Regional weather variance (0-10000)
        uint256 soilQuality;        // Soil health score (0-10000)
        uint256 irrigationAccess;   // 0 = no irrigation, 10000 = full irrigation
        uint256 experienceModifier; // Farmer's claims history (5000-15000)
    }

    // ============ Premium Calculation ============

    /**
     * @notice Calculate premium for a policy
     * @param sumInsured Coverage amount in USDC (6 decimals)
     * @param cropType Type of crop being insured
     * @param coverageType Type of coverage
     * @param rateCard Base rate configuration
     * @param riskFactors Additional risk adjustment factors
     * @return premium Premium amount in USDC (6 decimals)
     */
    function calculatePremium(
        uint256 sumInsured,
        CropType cropType,
        CoverageType coverageType,
        RateCard memory rateCard,
        RiskFactors memory riskFactors
    ) internal pure returns (uint256 premium) {
        require(sumInsured >= MIN_SUM_INSURED, "PolicyLib: Sum insured too low");
        require(sumInsured <= MAX_SUM_INSURED, "PolicyLib: Sum insured too high");

        // Get base rate from rate card
        uint256 baseRate = getBaseRate(cropType, coverageType, rateCard);

        // Calculate risk-adjusted rate
        uint256 adjustedRate = applyRiskFactors(baseRate, riskFactors);

        // Calculate premium
        premium = sumInsured.percentageOf(adjustedRate);

        return premium;
    }

    /**
     * @notice Get base rate for crop and coverage type combination
     * @param cropType Type of crop
     * @param coverageType Type of coverage
     * @param rateCard Rate configuration
     * @return baseRate Rate in basis points
     */
    function getBaseRate(CropType cropType, CoverageType coverageType, RateCard memory rateCard)
        internal
        pure
        returns (uint256 baseRate)
    {
        if (cropType == CropType.MAIZE) {
            if (coverageType == CoverageType.DROUGHT) return rateCard.maizeDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.maizeFlood;
            return rateCard.maizeMultiPeril;
        } else if (cropType == CropType.BEANS) {
            if (coverageType == CoverageType.DROUGHT) return rateCard.beansDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.beansFlood;
            return rateCard.beansMultiPeril;
        } else if (cropType == CropType.WHEAT) {
            if (coverageType == CoverageType.DROUGHT) return rateCard.wheatDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.wheatFlood;
            return rateCard.wheatMultiPeril;
        } else if (cropType == CropType.SORGHUM) {
            if (coverageType == CoverageType.DROUGHT) return rateCard.sorghumDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.sorghumFlood;
            return rateCard.sorghumMultiPeril;
        } else if (cropType == CropType.MILLET) {
            if (coverageType == CoverageType.DROUGHT) return rateCard.milletDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.milletFlood;
            return rateCard.milletMultiPeril;
        } else {
            // RICE
            if (coverageType == CoverageType.DROUGHT) return rateCard.riceDrought;
            if (coverageType == CoverageType.FLOOD) return rateCard.riceFlood;
            return rateCard.riceMultiPeril;
        }
    }

    /**
     * @notice Apply risk factors to adjust base rate
     * @param baseRate Base rate in basis points
     * @param factors Risk adjustment factors
     * @return adjustedRate Risk-adjusted rate in basis points
     */
    function applyRiskFactors(uint256 baseRate, RiskFactors memory factors)
        internal
        pure
        returns (uint256 adjustedRate)
    {
        // Start with base rate
        uint256 rate = baseRate;

        // Historical losses adjustment (±30%)
        // Higher losses = higher premium
        if (factors.historicalLosses > 5000) {
            uint256 increase = ((factors.historicalLosses - 5000) * 3000) / 5000; // Up to 30% increase
            rate = rate + rate.percentageOf(increase);
        }

        // Weather volatility adjustment (±20%)
        if (factors.weatherVolatility > 5000) {
            uint256 increase = ((factors.weatherVolatility - 5000) * 2000) / 5000; // Up to 20% increase
            rate = rate + rate.percentageOf(increase);
        }

        // Soil quality adjustment (±15%)
        // Better soil = lower premium
        if (factors.soilQuality > 5000) {
            uint256 decrease = ((factors.soilQuality - 5000) * 1500) / 5000; // Up to 15% decrease
            rate = rate - rate.percentageOf(decrease);
        } else {
            uint256 increase = ((5000 - factors.soilQuality) * 1500) / 5000; // Up to 15% increase
            rate = rate + rate.percentageOf(increase);
        }

        // Irrigation access adjustment (up to -25%)
        // Full irrigation = 25% discount
        if (factors.irrigationAccess > 0) {
            uint256 decrease = (factors.irrigationAccess * 2500) / 10000; // Up to 25% decrease
            rate = rate - rate.percentageOf(decrease);
        }

        // Experience modifier (farmer's claims history)
        // 10000 = neutral, <10000 = discount, >10000 = surcharge
        rate = (rate * factors.experienceModifier) / 10000;

        // Ensure rate doesn't go below 100 bps (1%) or above 2000 bps (20%)
        adjustedRate = rate.clamp(100, 2000);

        return adjustedRate;
    }

    // ============ Risk Scoring ============

    /**
     * @notice Calculate risk score for a policy
     * @param cropType Type of crop
     * @param coverageType Type of coverage
     * @param factors Risk factors
     * @return riskLevel Overall risk classification
     * @return score Numeric risk score (0-10000)
     */
    function calculateRiskScore(
        CropType cropType,
        CoverageType coverageType,
        RiskFactors memory factors
    ) internal pure returns (RiskLevel riskLevel, uint256 score) {
        // Base risk by crop (drought-resistant crops are lower risk)
        uint256 cropRisk = getCropRisk(cropType);

        // Coverage risk (multi-peril is higher risk)
        uint256 coverageRisk = getCoverageRisk(coverageType);

        // Weighted risk score
        uint256[] memory values = new uint256[](5);
        values[0] = cropRisk;
        values[1] = coverageRisk;
        values[2] = factors.historicalLosses;
        values[3] = factors.weatherVolatility;
        values[4] = 10000 - factors.soilQuality; // Invert so higher is worse

        uint256[] memory weights = new uint256[](5);
        weights[0] = 2000; // 20% crop risk
        weights[1] = 2000; // 20% coverage risk
        weights[2] = 3000; // 30% historical losses
        weights[3] = 2000; // 20% weather volatility
        weights[4] = 1000; // 10% soil quality

        score = MathLib.weightedAverage(values, weights);

        // Classify risk level
        if (score < 3000) {
            riskLevel = RiskLevel.LOW;
        } else if (score < 5000) {
            riskLevel = RiskLevel.MEDIUM;
        } else if (score < 7000) {
            riskLevel = RiskLevel.HIGH;
        } else {
            riskLevel = RiskLevel.VERY_HIGH;
        }

        return (riskLevel, score);
    }

    /**
     * @notice Get risk score for crop type
     * @param cropType Type of crop
     * @return risk Risk score (0-10000)
     */
    function getCropRisk(CropType cropType) internal pure returns (uint256 risk) {
        if (cropType == CropType.MILLET || cropType == CropType.SORGHUM) {
            return 3000; // Drought-resistant crops
        } else if (cropType == CropType.MAIZE || cropType == CropType.WHEAT) {
            return 5000; // Medium risk
        } else if (cropType == CropType.BEANS) {
            return 6000; // Higher risk
        } else {
            return 5500; // Rice - medium-high risk
        }
    }

    /**
     * @notice Get risk score for coverage type
     * @param coverageType Type of coverage
     * @return risk Risk score (0-10000)
     */
    function getCoverageRisk(CoverageType coverageType) internal pure returns (uint256 risk) {
        if (coverageType == CoverageType.DROUGHT) {
            return 4000;
        } else if (coverageType == CoverageType.FLOOD) {
            return 3500;
        } else {
            return 7000; // Multi-peril is highest risk
        }
    }

    // ============ Eligibility Checks ============

    /**
     * @notice Check if policy parameters are valid
     * @param sumInsured Coverage amount
     * @param startTime Policy start timestamp
     * @param endTime Policy end timestamp
     * @return valid True if parameters are valid
     * @return reason Error message if invalid
     */
    function validatePolicyParameters(uint256 sumInsured, uint256 startTime, uint256 endTime)
        internal
        view
        returns (bool valid, string memory reason)
    {
        if (sumInsured < MIN_SUM_INSURED) {
            return (false, "Sum insured below minimum");
        }

        if (sumInsured > MAX_SUM_INSURED) {
            return (false, "Sum insured exceeds maximum");
        }

        if (startTime < block.timestamp) {
            return (false, "Start time in the past");
        }

        if (endTime <= startTime) {
            return (false, "End time before start time");
        }

        uint256 duration = endTime - startTime;
        if (duration < MIN_COVERAGE_PERIOD) {
            return (false, "Coverage period too short");
        }

        if (duration > MAX_COVERAGE_PERIOD) {
            return (false, "Coverage period too long");
        }

        return (true, "");
    }

    /**
     * @notice Check if farmer is eligible for coverage
     * @param existingPolicies Number of active policies farmer already has
     * @param claimsHistory Number of claims in last 12 months
     * @param lossRatio Farmer's historical loss ratio (0-10000)
     * @return eligible True if farmer is eligible
     * @return reason Error message if ineligible
     */
    function checkFarmerEligibility(
        uint256 existingPolicies,
        uint256 claimsHistory,
        uint256 lossRatio
    ) internal pure returns (bool eligible, string memory reason) {
        // Maximum 5 active policies per farmer
        if (existingPolicies >= 5) {
            return (false, "Maximum active policies exceeded");
        }

        // Maximum 3 claims in last 12 months
        if (claimsHistory > 3) {
            return (false, "Too many recent claims");
        }

        // Loss ratio must be below 150% (15000 bps)
        if (lossRatio > 15000) {
            return (false, "Loss ratio too high");
        }

        return (true, "");
    }

    // ============ Helper Functions ============

    /**
     * @notice Calculate pro-rata refund for cancelled policy
     * @param premium Original premium paid
     * @param startTime Policy start timestamp
     * @param endTime Policy end timestamp
     * @param cancelTime Cancellation timestamp
     * @return refund Refund amount (80% of unused premium)
     */
    function calculateCancellationRefund(
        uint256 premium,
        uint256 startTime,
        uint256 endTime,
        uint256 cancelTime
    ) internal pure returns (uint256 refund) {
        require(cancelTime >= startTime && cancelTime < endTime, "PolicyLib: Invalid cancel time");

        uint256 totalDuration = endTime - startTime;
        uint256 unusedDuration = endTime - cancelTime;
        uint256 unusedPremium = (premium * unusedDuration) / totalDuration;

        // 80% refund of unused premium (20% cancellation fee)
        refund = unusedPremium.percentageOf(8000);

        return refund;
    }

    /**
     * @notice Check if policy is within active coverage period
     * @param startTime Policy start timestamp
     * @param endTime Policy end timestamp
     * @return active True if currently within coverage period
     */
    function isWithinCoveragePeriod(uint256 startTime, uint256 endTime)
        internal
        view
        returns (bool active)
    {
        return block.timestamp >= startTime && block.timestamp <= endTime;
    }
}
