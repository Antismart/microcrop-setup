// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MathLib} from "./MathLib.sol";

/**
 * @title DamageLib
 * @notice Library for calculating crop damage based on weather and satellite data
 * @dev Combines weather indices (60%) and NDVI satellite data (40%) for damage assessment
 */
library DamageLib {
    using MathLib for uint256;

    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant WEATHER_WEIGHT = 6000; // 60%
    uint256 private constant SATELLITE_WEIGHT = 4000; // 40%

    // Scaling factors
    uint256 private constant TEMPERATURE_SCALE = 100; // Temperature in Celsius * 100
    uint256 private constant RAINFALL_SCALE = 100; // Rainfall in mm * 100
    uint256 private constant NDVI_SCALE = 10000; // NDVI scaled to 0-10000

    // ============ Structs ============

    /**
     * @notice Weather data for damage calculation
     * @param totalRainfall Cumulative rainfall in period (mm * 100)
     * @param avgTemperature Average temperature (°C * 100)
     * @param maxTemperature Maximum temperature (°C * 100)
     * @param dryDays Number of consecutive dry days
     * @param floodDays Number of days with excessive rainfall
     * @param heatStressDays Number of days above heat threshold
     */
    struct WeatherData {
        uint256 totalRainfall;
        uint256 avgTemperature;
        uint256 maxTemperature;
        uint256 dryDays;
        uint256 floodDays;
        uint256 heatStressDays;
    }

    /**
     * @notice Satellite vegetation data
     * @param avgNDVI Average NDVI over coverage period (0-10000)
     * @param minNDVI Minimum NDVI recorded (0-10000)
     * @param ndviTrend Trend direction (-10000 to +10000)
     * @param baselineNDVI Historical baseline NDVI (0-10000)
     */
    struct SatelliteData {
        uint256 avgNDVI;
        uint256 minNDVI;
        int256 ndviTrend;
        uint256 baselineNDVI;
    }

    /**
     * @notice Damage assessment thresholds
     * @param droughtThreshold Minimum rainfall (mm * 100)
     * @param droughtDays Consecutive dry days to trigger
     * @param floodThreshold Maximum daily rainfall (mm * 100)
     * @param floodHours Hours of flooding to trigger
     * @param heatThreshold Temperature threshold (°C * 100)
     * @param heatDays Heat stress days to trigger
     */
    struct Thresholds {
        uint256 droughtThreshold;
        uint256 droughtDays;
        uint256 floodThreshold;
        uint256 floodHours;
        uint256 heatThreshold;
        uint256 heatDays;
    }

    // ============ Main Damage Calculation ============

    /**
     * @notice Calculate total crop damage percentage
     * @param weatherData Weather observations during coverage period
     * @param satelliteData NDVI satellite observations
     * @param thresholds Policy-specific damage thresholds
     * @return damagePercentage Damage in basis points (0-10000)
     * @return weatherDamage Weather component of damage
     * @return satelliteDamage Satellite component of damage
     */
    function calculateDamage(
        WeatherData memory weatherData,
        SatelliteData memory satelliteData,
        Thresholds memory thresholds
    )
        internal
        pure
        returns (uint256 damagePercentage, uint256 weatherDamage, uint256 satelliteDamage)
    {
        // Calculate weather-based damage (60% weight)
        weatherDamage = calculateWeatherDamage(weatherData, thresholds);

        // Calculate satellite-based damage (40% weight)
        satelliteDamage = calculateSatelliteDamage(satelliteData);

        // Weighted combination
        damagePercentage = (weatherDamage * WEATHER_WEIGHT + satelliteDamage * SATELLITE_WEIGHT)
            / BASIS_POINTS;

        // Cap at 100%
        damagePercentage = damagePercentage.min(BASIS_POINTS);

        return (damagePercentage, weatherDamage, satelliteDamage);
    }

    // ============ Weather Damage Calculation ============

    /**
     * @notice Calculate damage based on weather conditions
     * @param data Weather observations
     * @param thresholds Damage thresholds
     * @return damage Weather damage percentage (0-10000 bps)
     */
    function calculateWeatherDamage(WeatherData memory data, Thresholds memory thresholds)
        internal
        pure
        returns (uint256 damage)
    {
        uint256 droughtDamage = calculateDroughtDamage(
            data.totalRainfall, data.dryDays, thresholds.droughtThreshold, thresholds.droughtDays
        );

        uint256 floodDamage = calculateFloodDamage(data.floodDays, thresholds.floodHours);

        uint256 heatDamage =
            calculateHeatDamage(data.maxTemperature, data.heatStressDays, thresholds.heatThreshold);

        // Take maximum damage from any single peril
        damage = droughtDamage.max(floodDamage).max(heatDamage);

        return damage;
    }

    /**
     * @notice Calculate drought damage
     * @param totalRainfall Cumulative rainfall (mm * 100)
     * @param dryDays Consecutive dry days
     * @param threshold Drought threshold (mm * 100)
     * @param triggerDays Days required to trigger
     * @return damage Drought damage percentage (0-10000 bps)
     */
    function calculateDroughtDamage(
        uint256 totalRainfall,
        uint256 dryDays,
        uint256 threshold,
        uint256 triggerDays
    ) internal pure returns (uint256 damage) {
        // No damage if rainfall above threshold and insufficient dry days
        if (totalRainfall >= threshold && dryDays < triggerDays) {
            return 0;
        }

        uint256 rainfallDeficit = 0;
        if (totalRainfall < threshold) {
            rainfallDeficit = threshold - totalRainfall;
        }

        // Rainfall component (0-70% damage based on deficit)
        uint256 rainfallDamage = 0;
        if (rainfallDeficit > 0) {
            // Severe deficit (>50%) = 70% damage
            // Moderate deficit (25-50%) = 35% damage
            // Mild deficit (<25%) = 15% damage
            uint256 deficitPercent = (rainfallDeficit * BASIS_POINTS) / threshold;
            if (deficitPercent >= 5000) {
                rainfallDamage = 7000; // 70%
            } else if (deficitPercent >= 2500) {
                rainfallDamage = 3500; // 35%
            } else {
                rainfallDamage = 1500; // 15%
            }
        }

        // Dry days component (0-30% additional damage)
        uint256 dryDayDamage = 0;
        if (dryDays >= triggerDays) {
            uint256 excessDays = dryDays - triggerDays;
            // Each day beyond trigger adds 1% damage, capped at 30%
            dryDayDamage = (excessDays * 100).min(3000);
        }

        damage = (rainfallDamage + dryDayDamage).min(BASIS_POINTS);

        return damage;
    }

    /**
     * @notice Calculate flood damage
     * @param floodDays Days with excessive rainfall
     * @param triggerHours Hours of flooding to trigger payout
     * @return damage Flood damage percentage (0-10000 bps)
     */
    function calculateFloodDamage(uint256 floodDays, uint256 triggerHours)
        internal
        pure
        returns (uint256 damage)
    {
        // Convert days to hours for comparison
        uint256 floodHours = floodDays * 24;

        if (floodHours < triggerHours) {
            return 0;
        }

        uint256 excessHours = floodHours - triggerHours;

        // Progressive damage:
        // 0-24 hours excess: 30% damage
        // 24-72 hours excess: 60% damage
        // >72 hours excess: 90% damage
        if (excessHours <= 24) {
            damage = 3000; // 30%
        } else if (excessHours <= 72) {
            damage = 6000; // 60%
        } else {
            damage = 9000; // 90%
        }

        return damage;
    }

    /**
     * @notice Calculate heat stress damage
     * @param maxTemp Maximum temperature recorded (°C * 100)
     * @param heatDays Days above threshold
     * @param threshold Heat stress threshold (°C * 100)
     * @return damage Heat damage percentage (0-10000 bps)
     */
    function calculateHeatDamage(uint256 maxTemp, uint256 heatDays, uint256 threshold)
        internal
        pure
        returns (uint256 damage)
    {
        if (maxTemp < threshold || heatDays == 0) {
            return 0;
        }

        uint256 tempExcess = maxTemp - threshold;

        // Temperature severity (0-50% damage)
        uint256 tempDamage = 0;
        if (tempExcess >= 500) {
            // >5°C above threshold = 50% damage
            tempDamage = 5000;
        } else if (tempExcess >= 300) {
            // 3-5°C above = 30% damage
            tempDamage = 3000;
        } else {
            // <3°C above = 15% damage
            tempDamage = 1500;
        }

        // Duration component (0-25% additional damage)
        // Each heat stress day adds 5% damage, capped at 25%
        uint256 durationDamage = (heatDays * 500).min(2500);

        damage = (tempDamage + durationDamage).min(BASIS_POINTS);

        return damage;
    }

    // ============ Satellite Damage Calculation ============

    /**
     * @notice Calculate damage based on NDVI satellite data
     * @param data Satellite observations
     * @return damage Satellite damage percentage (0-10000 bps)
     */
    function calculateSatelliteDamage(SatelliteData memory data)
        internal
        pure
        returns (uint256 damage)
    {
        // NDVI decline from baseline
        uint256 ndviDecline = 0;
        if (data.avgNDVI < data.baselineNDVI) {
            ndviDecline = data.baselineNDVI - data.avgNDVI;
        }

        // Minimum NDVI factor (indicates stress episodes)
        uint256 minNDVIFactor = 0;
        if (data.minNDVI < data.baselineNDVI) {
            minNDVIFactor = data.baselineNDVI - data.minNDVI;
        }

        // Trend penalty (negative trend indicates deteriorating conditions)
        uint256 trendPenalty = 0;
        if (data.ndviTrend < 0) {
            // Negative trend adds up to 20% damage
            uint256 negativeTrend = uint256(-data.ndviTrend);
            trendPenalty = (negativeTrend * 2000) / NDVI_SCALE;
            trendPenalty = trendPenalty.min(2000); // Cap at 20%
        }

        // Damage calculation:
        // - Average NDVI decline contributes 60%
        // - Minimum NDVI contributes 20%
        // - Trend penalty contributes 20%

        uint256 avgDamage = (ndviDecline * BASIS_POINTS) / data.baselineNDVI;
        avgDamage = (avgDamage * 6000) / BASIS_POINTS; // 60% weight

        uint256 minDamage = (minNDVIFactor * BASIS_POINTS) / data.baselineNDVI;
        minDamage = (minDamage * 2000) / BASIS_POINTS; // 20% weight

        damage = avgDamage + minDamage + trendPenalty;

        // Cap at 100%
        damage = damage.min(BASIS_POINTS);

        return damage;
    }

    // ============ Data Normalization ============

    /**
     * @notice Normalize temperature to standard scale
     * @param tempCelsius Temperature in Celsius * 100
     * @return normalized Normalized temperature (0-10000)
     */
    function normalizeTemperature(uint256 tempCelsius) internal pure returns (uint256 normalized) {
        // Normalize to 0°C - 50°C range
        return tempCelsius.normalize(0, 5000);
    }

    /**
     * @notice Normalize rainfall to standard scale
     * @param rainfallMM Rainfall in mm * 100
     * @return normalized Normalized rainfall (0-10000)
     */
    function normalizeRainfall(uint256 rainfallMM) internal pure returns (uint256 normalized) {
        // Normalize to 0mm - 1000mm range
        return rainfallMM.normalize(0, 100_000);
    }

    /**
     * @notice Normalize NDVI value
     * @param ndvi NDVI value (0-10000)
     * @return normalized Normalized NDVI
     */
    function normalizeNDVI(uint256 ndvi) internal pure returns (uint256 normalized) {
        // NDVI is already in 0-10000 range
        return ndvi.clamp(0, NDVI_SCALE);
    }

    // ============ Validation ============

    /**
     * @notice Validate weather data is within reasonable bounds
     * @param data Weather observations
     * @return valid True if data is valid
     * @return reason Error message if invalid
     */
    function validateWeatherData(WeatherData memory data)
        internal
        pure
        returns (bool valid, string memory reason)
    {
        // Temperature checks (-10°C to 60°C)
        if (data.avgTemperature < 0 || data.avgTemperature > 6000) {
            return (false, "Invalid average temperature");
        }
        if (data.maxTemperature < 0 || data.maxTemperature > 6000) {
            return (false, "Invalid max temperature");
        }

        // Rainfall checks (0-2000mm)
        if (data.totalRainfall > 200_000) {
            return (false, "Invalid rainfall amount");
        }

        // Day counts (0-180 days for 6 month policy)
        if (data.dryDays > 180 || data.floodDays > 180 || data.heatStressDays > 180) {
            return (false, "Invalid day count");
        }

        return (true, "");
    }

    /**
     * @notice Validate satellite data is within reasonable bounds
     * @param data Satellite observations
     * @return valid True if data is valid
     * @return reason Error message if invalid
     */
    function validateSatelliteData(SatelliteData memory data)
        internal
        pure
        returns (bool valid, string memory reason)
    {
        // NDVI checks (0-1 scaled to 0-10000)
        if (data.avgNDVI > NDVI_SCALE) {
            return (false, "Invalid average NDVI");
        }
        if (data.minNDVI > NDVI_SCALE) {
            return (false, "Invalid minimum NDVI");
        }
        if (data.baselineNDVI > NDVI_SCALE) {
            return (false, "Invalid baseline NDVI");
        }

        // Trend checks (-1 to +1 scaled to -10000 to +10000)
        if (data.ndviTrend < -10000 || data.ndviTrend > 10000) {
            return (false, "Invalid NDVI trend");
        }

        // Baseline must be positive
        if (data.baselineNDVI == 0) {
            return (false, "Zero baseline NDVI");
        }

        return (true, "");
    }

    // ============ Helper Functions ============

    /**
     * @notice Calculate payout amount based on damage percentage
     * @param sumInsured Policy coverage amount
     * @param damagePercentage Damage in basis points (0-10000)
     * @return payout Payout amount in USDC
     */
    function calculatePayoutAmount(uint256 sumInsured, uint256 damagePercentage)
        internal
        pure
        returns (uint256 payout)
    {
        require(damagePercentage <= BASIS_POINTS, "DamageLib: Invalid damage percentage");

        // Progressive payout structure:
        // 0-30% damage: No payout (deductible)
        // 30-100% damage: Linear payout

        if (damagePercentage < 3000) {
            return 0; // Below deductible
        }

        // Adjust for deductible
        uint256 adjustedDamage = damagePercentage - 3000; // Remove 30% deductible
        uint256 payoutRatio = (adjustedDamage * BASIS_POINTS) / 7000; // Scale to 0-100%

        payout = sumInsured.percentageOf(payoutRatio);

        return payout;
    }

    /**
     * @notice Check if conditions meet trigger thresholds
     * @param data Weather data
     * @param thresholds Trigger thresholds
     * @return triggered True if any threshold is breached
     */
    function checkTriggerConditions(WeatherData memory data, Thresholds memory thresholds)
        internal
        pure
        returns (bool triggered)
    {
        // Drought trigger
        if (data.totalRainfall < thresholds.droughtThreshold && data.dryDays >= thresholds.droughtDays)
        {
            return true;
        }

        // Flood trigger
        if (data.floodDays * 24 >= thresholds.floodHours) {
            return true;
        }

        // Heat trigger
        if (data.maxTemperature >= thresholds.heatThreshold && data.heatStressDays >= thresholds.heatDays)
        {
            return true;
        }

        return false;
    }
}
