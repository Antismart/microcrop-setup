// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MathLib
 * @notice Library for mathematical operations used across insurance contracts
 * @dev All functions are pure for gas efficiency and reusability
 */
library MathLib {
    // ============ Constants ============

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant PRECISION = 1e18;

    // ============ Basic Operations ============

    /**
     * @notice Get minimum of two values
     * @param a First value
     * @param b Second value
     * @return Minimum value
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @notice Get maximum of two values
     * @param a First value
     * @param b Second value
     * @return Maximum value
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @notice Clamp a value between min and max bounds
     * @param value Value to clamp
     * @param minValue Lower bound
     * @param maxValue Upper bound
     * @return Clamped value
     */
    function clamp(uint256 value, uint256 minValue, uint256 maxValue) internal pure returns (uint256) {
        return min(max(value, minValue), maxValue);
    }

    // ============ Percentage & Basis Points ============

    /**
     * @notice Calculate percentage of a value (with basis points precision)
     * @param value Base value
     * @param bps Percentage in basis points (100 bps = 1%)
     * @return Result of (value * bps / 10000)
     */
    function percentageOf(uint256 value, uint256 bps) internal pure returns (uint256) {
        require(bps <= BASIS_POINTS, "MathLib: BPS exceeds maximum");
        return (value * bps) / BASIS_POINTS;
    }

    /**
     * @notice Calculate percentage with rounding up
     * @param value Base value
     * @param bps Percentage in basis points
     * @return Result of (value * bps / 10000) rounded up
     */
    function percentageOfRoundUp(uint256 value, uint256 bps) internal pure returns (uint256) {
        require(bps <= BASIS_POINTS, "MathLib: BPS exceeds maximum");
        return (value * bps + BASIS_POINTS - 1) / BASIS_POINTS;
    }

    /**
     * @notice Calculate what percentage one value is of another (in basis points)
     * @param value Numerator
     * @param total Denominator
     * @return Percentage in basis points (0-10000)
     */
    function calculatePercentage(uint256 value, uint256 total) internal pure returns (uint256) {
        if (total == 0) return 0;
        return (value * BASIS_POINTS) / total;
    }

    // ============ Statistical Functions ============

    /**
     * @notice Calculate average of an array of values
     * @param values Array of uint256 values
     * @return Average value
     */
    function average(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 0, "MathLib: Empty array");
        
        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i];
        }
        
        return sum / values.length;
    }

    /**
     * @notice Calculate weighted average
     * @param values Array of values
     * @param weights Array of weights (must sum to BASIS_POINTS)
     * @return Weighted average
     */
    function weightedAverage(uint256[] memory values, uint256[] memory weights)
        internal
        pure
        returns (uint256)
    {
        require(values.length == weights.length, "MathLib: Length mismatch");
        require(values.length > 0, "MathLib: Empty arrays");
        
        uint256 sum = 0;
        uint256 weightSum = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i] * weights[i];
            weightSum += weights[i];
        }
        
        require(weightSum > 0, "MathLib: Zero weight sum");
        return sum / weightSum;
    }

    /**
     * @notice Calculate median of an array (modifies input array)
     * @param values Array of values (will be sorted in place)
     * @return Median value
     */
    function median(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 0, "MathLib: Empty array");
        
        // Bubble sort (sufficient for small arrays)
        for (uint256 i = 0; i < values.length; i++) {
            for (uint256 j = i + 1; j < values.length; j++) {
                if (values[i] > values[j]) {
                    (values[i], values[j]) = (values[j], values[i]);
                }
            }
        }
        
        uint256 mid = values.length / 2;
        if (values.length % 2 == 0) {
            return (values[mid - 1] + values[mid]) / 2;
        } else {
            return values[mid];
        }
    }

    /**
     * @notice Calculate standard deviation (simplified, returns variance)
     * @param values Array of values
     * @return Variance (standard deviation squared)
     */
    function variance(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 1, "MathLib: Insufficient data");
        
        uint256 avg = average(values);
        uint256 sumSquaredDiff = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            uint256 diff = values[i] > avg ? values[i] - avg : avg - values[i];
            sumSquaredDiff += diff * diff;
        }
        
        return sumSquaredDiff / values.length;
    }

    // ============ Scaling & Normalization ============

    /**
     * @notice Scale a value from one range to another
     * @param value Value in original range
     * @param fromMin Original range minimum
     * @param fromMax Original range maximum
     * @param toMin Target range minimum
     * @param toMax Target range maximum
     * @return Scaled value in target range
     */
    function scale(
        uint256 value,
        uint256 fromMin,
        uint256 fromMax,
        uint256 toMin,
        uint256 toMax
    ) internal pure returns (uint256) {
        require(fromMax > fromMin, "MathLib: Invalid from range");
        require(toMax > toMin, "MathLib: Invalid to range");
        require(value >= fromMin && value <= fromMax, "MathLib: Value out of range");
        
        uint256 fromRange = fromMax - fromMin;
        uint256 toRange = toMax - toMin;
        uint256 normalizedValue = value - fromMin;
        
        return toMin + (normalizedValue * toRange) / fromRange;
    }

    /**
     * @notice Normalize a value to 0-10000 basis points range
     * @param value Value to normalize
     * @param minValue Minimum possible value
     * @param maxValue Maximum possible value
     * @return Normalized value (0-10000)
     */
    function normalize(uint256 value, uint256 minValue, uint256 maxValue)
        internal
        pure
        returns (uint256)
    {
        return scale(value, minValue, maxValue, 0, BASIS_POINTS);
    }

    // ============ Interpolation ============

    /**
     * @notice Linear interpolation between two values
     * @param start Starting value
     * @param end Ending value
     * @param progress Progress from start to end (0-10000 basis points)
     * @return Interpolated value
     */
    function lerp(uint256 start, uint256 end, uint256 progress) internal pure returns (uint256) {
        require(progress <= BASIS_POINTS, "MathLib: Progress exceeds 100%");
        
        if (end >= start) {
            uint256 range = end - start;
            return start + (range * progress) / BASIS_POINTS;
        } else {
            uint256 range = start - end;
            return start - (range * progress) / BASIS_POINTS;
        }
    }

    // ============ Threshold Checks ============

    /**
     * @notice Check if value exceeds threshold by a minimum percentage
     * @param value Current value
     * @param threshold Threshold value
     * @param minExcessBps Minimum excess required (basis points)
     * @return True if value exceeds threshold by at least minExcessBps
     */
    function exceedsThreshold(uint256 value, uint256 threshold, uint256 minExcessBps)
        internal
        pure
        returns (bool)
    {
        if (value <= threshold) return false;
        
        uint256 excess = value - threshold;
        uint256 minExcess = percentageOf(threshold, minExcessBps);
        
        return excess >= minExcess;
    }

    /**
     * @notice Check if value is below threshold by a minimum percentage
     * @param value Current value
     * @param threshold Threshold value
     * @param minDeficitBps Minimum deficit required (basis points)
     * @return True if value is below threshold by at least minDeficitBps
     */
    function belowThreshold(uint256 value, uint256 threshold, uint256 minDeficitBps)
        internal
        pure
        returns (bool)
    {
        if (value >= threshold) return false;
        
        uint256 deficit = threshold - value;
        uint256 minDeficit = percentageOf(threshold, minDeficitBps);
        
        return deficit >= minDeficit;
    }

    // ============ Safe Arithmetic with Caps ============

    /**
     * @notice Add with overflow protection and max cap
     * @param a First value
     * @param b Second value
     * @param maxValue Maximum allowed result
     * @return Sum capped at maxValue
     */
    function addCapped(uint256 a, uint256 b, uint256 maxValue) internal pure returns (uint256) {
        uint256 sum = a + b;
        return min(sum, maxValue);
    }

    /**
     * @notice Subtract with underflow protection (returns 0 if would be negative)
     * @param a Value to subtract from
     * @param b Value to subtract
     * @return Difference or 0 if would be negative
     */
    function subFloor(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : 0;
    }

    /**
     * @notice Multiply with precision and rounding
     * @param a First value
     * @param b Second value
     * @param precision Precision denominator
     * @return Product divided by precision
     */
    function mulDiv(uint256 a, uint256 b, uint256 precision) internal pure returns (uint256) {
        require(precision > 0, "MathLib: Zero precision");
        return (a * b) / precision;
    }
}
