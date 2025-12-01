// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {DamageLib} from "../libraries/DamageLib.sol";
import {IPolicyManager} from "../interfaces/IPolicyManager.sol";

/**
 * @title DamageCalculator
 * @notice Calculates crop damage by combining weather and satellite data
 * @dev Orchestrates damage assessment using 60% weather + 40% satellite weighting
 */
contract DamageCalculator is AccessControl {
    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAYOUT_ENGINE_ROLE = keccak256("PAYOUT_ENGINE_ROLE");

    // ============ State Variables ============

    /// @notice Weather oracle contract
    address public weatherOracle;

    /// @notice Satellite oracle contract
    address public satelliteOracle;

    /// @notice Policy manager contract
    address public policyManager;

    /// @notice Damage assessments (policyId => damage assessment)
    mapping(uint256 => DamageAssessment) public assessments;

    // ============ Structs ============

    /**
     * @notice Complete damage assessment for a policy
     */
    struct DamageAssessment {
        uint256 policyId;
        uint256 damagePercentage;    // Total damage (0-10000 bps)
        uint256 weatherDamage;        // Weather component
        uint256 satelliteDamage;      // Satellite component
        uint256 payoutAmount;         // Calculated payout in USDC
        uint256 assessedAt;           // Assessment timestamp
        bool isAssessed;              // Whether assessment is complete
    }

    // ============ Events ============

    event DamageAssessed(
        uint256 indexed policyId,
        uint256 damagePercentage,
        uint256 weatherDamage,
        uint256 satelliteDamage,
        uint256 payoutAmount
    );
    event OraclesUpdated(address weatherOracle, address satelliteOracle);

    // ============ Constructor ============

    constructor(
        address _weatherOracle,
        address _satelliteOracle,
        address _policyManager,
        address _admin
    ) {
        require(_weatherOracle != address(0), "DamageCalculator: Zero address");
        require(_satelliteOracle != address(0), "DamageCalculator: Zero address");
        require(_policyManager != address(0), "DamageCalculator: Zero address");
        require(_admin != address(0), "DamageCalculator: Zero address");

        weatherOracle = _weatherOracle;
        satelliteOracle = _satelliteOracle;
        policyManager = _policyManager;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Damage Assessment ============

    /**
     * @notice Assess damage for a triggered policy
     * @param policyId ID of the policy
     * @param weatherData Weather observations during coverage period
     * @param satelliteData Satellite observations during coverage period
     * @return damagePercentage Total damage percentage (0-10000 bps)
     * @return payoutAmount Calculated payout in USDC
     */
    function assessDamage(
        uint256 policyId,
        DamageLib.WeatherData memory weatherData,
        DamageLib.SatelliteData memory satelliteData
    )
        external
        onlyRole(PAYOUT_ENGINE_ROLE)
        returns (uint256 damagePercentage, uint256 payoutAmount)
    {
        require(!assessments[policyId].isAssessed, "DamageCalculator: Already assessed");

        // Get policy details
        IPolicyManager.Policy memory policy = IPolicyManager(policyManager).getPolicy(policyId);
        require(
            policy.status == IPolicyManager.PolicyStatus.TRIGGERED,
            "DamageCalculator: Policy not triggered"
        );

        // Validate input data
        (bool weatherValid, string memory weatherReason) = DamageLib.validateWeatherData(weatherData);
        require(weatherValid, weatherReason);

        (bool satelliteValid, string memory satelliteReason) =
            DamageLib.validateSatelliteData(satelliteData);
        require(satelliteValid, satelliteReason);

        // Calculate damage components
        uint256 weatherDamage;
        uint256 satelliteDamage;
        
        (damagePercentage, weatherDamage, satelliteDamage) = DamageLib.calculateDamage(
            weatherData,
            satelliteData,
            DamageLib.Thresholds({
                droughtThreshold: policy.thresholds.droughtThreshold,
                droughtDays: policy.thresholds.droughtDays,
                floodThreshold: policy.thresholds.floodThreshold,
                floodHours: policy.thresholds.floodHours,
                heatThreshold: policy.thresholds.heatThreshold,
                heatDays: policy.thresholds.heatDays
            })
        );

        // Calculate payout amount with deductible
        payoutAmount = DamageLib.calculatePayoutAmount(policy.sumInsured, damagePercentage);

        // Store assessment
        assessments[policyId] = DamageAssessment({
            policyId: policyId,
            damagePercentage: damagePercentage,
            weatherDamage: weatherDamage,
            satelliteDamage: satelliteDamage,
            payoutAmount: payoutAmount,
            assessedAt: block.timestamp,
            isAssessed: true
        });

        emit DamageAssessed(policyId, damagePercentage, weatherDamage, satelliteDamage, payoutAmount);

        return (damagePercentage, payoutAmount);
    }

    /**
     * @notice Quick check if trigger conditions are met
     * @param weatherData Weather observations
     * @param thresholds Policy thresholds
     * @return triggered True if conditions meet trigger thresholds
     */
    function checkTriggerConditions(
        DamageLib.WeatherData memory weatherData,
        IPolicyManager.ThresholdParams memory thresholds
    ) external pure returns (bool triggered) {
        return DamageLib.checkTriggerConditions(
            weatherData,
            DamageLib.Thresholds({
                droughtThreshold: thresholds.droughtThreshold,
                droughtDays: thresholds.droughtDays,
                floodThreshold: thresholds.floodThreshold,
                floodHours: thresholds.floodHours,
                heatThreshold: thresholds.heatThreshold,
                heatDays: thresholds.heatDays
            })
        );
    }

    /**
     * @notice Simulate damage calculation without storing
     * @param weatherData Weather observations
     * @param satelliteData Satellite observations
     * @param thresholds Damage thresholds
     * @param sumInsured Coverage amount
     * @return damagePercentage Damage percentage
     * @return payoutAmount Payout amount
     */
    function simulateDamage(
        DamageLib.WeatherData memory weatherData,
        DamageLib.SatelliteData memory satelliteData,
        IPolicyManager.ThresholdParams memory thresholds,
        uint256 sumInsured
    ) external pure returns (uint256 damagePercentage, uint256 payoutAmount) {
        uint256 weatherDamage;
        uint256 satelliteDamage;

        (damagePercentage, weatherDamage, satelliteDamage) = DamageLib.calculateDamage(
            weatherData,
            satelliteData,
            DamageLib.Thresholds({
                droughtThreshold: thresholds.droughtThreshold,
                droughtDays: thresholds.droughtDays,
                floodThreshold: thresholds.floodThreshold,
                floodHours: thresholds.floodHours,
                heatThreshold: thresholds.heatThreshold,
                heatDays: thresholds.heatDays
            })
        );

        payoutAmount = DamageLib.calculatePayoutAmount(sumInsured, damagePercentage);

        return (damagePercentage, payoutAmount);
    }

    // ============ View Functions ============

    /**
     * @notice Get damage assessment for a policy
     * @param policyId Policy identifier
     * @return assessment DamageAssessment struct
     */
    function getAssessment(uint256 policyId)
        external
        view
        returns (DamageAssessment memory assessment)
    {
        require(assessments[policyId].isAssessed, "DamageCalculator: Not assessed");
        return assessments[policyId];
    }

    /**
     * @notice Check if policy has been assessed
     * @param policyId Policy identifier
     * @return assessed True if assessed
     */
    function isAssessed(uint256 policyId) external view returns (bool assessed) {
        return assessments[policyId].isAssessed;
    }

    /**
     * @notice Calculate expected payout for given damage percentage
     * @param sumInsured Coverage amount
     * @param damagePercentage Damage percentage (0-10000)
     * @return payout Payout amount
     */
    function calculatePayout(uint256 sumInsured, uint256 damagePercentage)
        external
        pure
        returns (uint256 payout)
    {
        return DamageLib.calculatePayoutAmount(sumInsured, damagePercentage);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update oracle addresses
     * @param _weatherOracle New weather oracle address
     * @param _satelliteOracle New satellite oracle address
     */
    function updateOracles(address _weatherOracle, address _satelliteOracle)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_weatherOracle != address(0), "DamageCalculator: Zero address");
        require(_satelliteOracle != address(0), "DamageCalculator: Zero address");

        weatherOracle = _weatherOracle;
        satelliteOracle = _satelliteOracle;

        emit OraclesUpdated(_weatherOracle, _satelliteOracle);
    }

    /**
     * @notice Reassess damage for a policy (admin override)
     * @param policyId Policy identifier
     * @param weatherData New weather data
     * @param satelliteData New satellite data
     * @return damagePercentage New damage percentage
     * @return payoutAmount New payout amount
     */
    function reassessDamage(
        uint256 policyId,
        DamageLib.WeatherData memory weatherData,
        DamageLib.SatelliteData memory satelliteData
    )
        external
        onlyRole(ADMIN_ROLE)
        returns (uint256 damagePercentage, uint256 payoutAmount)
    {
        // Get policy details
        IPolicyManager.Policy memory policy = IPolicyManager(policyManager).getPolicy(policyId);

        // Calculate new damage
        uint256 weatherDamage;
        uint256 satelliteDamage;
        
        (damagePercentage, weatherDamage, satelliteDamage) = DamageLib.calculateDamage(
            weatherData,
            satelliteData,
            DamageLib.Thresholds({
                droughtThreshold: policy.thresholds.droughtThreshold,
                droughtDays: policy.thresholds.droughtDays,
                floodThreshold: policy.thresholds.floodThreshold,
                floodHours: policy.thresholds.floodHours,
                heatThreshold: policy.thresholds.heatThreshold,
                heatDays: policy.thresholds.heatDays
            })
        );

        payoutAmount = DamageLib.calculatePayoutAmount(policy.sumInsured, damagePercentage);

        // Update assessment
        assessments[policyId] = DamageAssessment({
            policyId: policyId,
            damagePercentage: damagePercentage,
            weatherDamage: weatherDamage,
            satelliteDamage: satelliteDamage,
            payoutAmount: payoutAmount,
            assessedAt: block.timestamp,
            isAssessed: true
        });

        emit DamageAssessed(policyId, damagePercentage, weatherDamage, satelliteDamage, payoutAmount);

        return (damagePercentage, payoutAmount);
    }
}
