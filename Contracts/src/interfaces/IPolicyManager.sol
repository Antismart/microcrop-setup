// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicyManager
 * @notice Interface for managing parametric crop insurance policies
 */
interface IPolicyManager {
    // ============ Enums ============

    /// @notice Crop types supported by the insurance platform
    enum CropType { MAIZE, BEANS, WHEAT, SORGHUM, MILLET, RICE }
    
    /// @notice Types of coverage available
    enum CoverageType { DROUGHT, FLOOD, MULTI_PERIL }
    
    /// @notice Policy lifecycle states
    enum PolicyStatus { PENDING, ACTIVE, EXPIRED, TRIGGERED, PAID_OUT, CANCELLED }
    
    // ============ Structs ============

    /// @notice Weather threshold parameters for trigger conditions
    struct ThresholdParams {
        uint256 droughtThreshold;   // Minimum rainfall (mm * 100)
        uint256 droughtDays;        // Consecutive dry days
        uint256 floodThreshold;     // Rainfall mm * 100
        uint256 floodHours;         // Time period
        uint256 heatThreshold;      // Temperature °C * 100
        uint256 heatDays;           // Consecutive days
    }
    
    /// @notice Complete policy information
    struct Policy {
        uint256 policyId;
        address farmer;             // Wallet linked to farmer
        string externalId;          // Off-chain reference
        uint256 plotId;
        uint256 sumInsured;         // USDC amount (6 decimals)
        uint256 premium;            // USDC amount paid
        uint256 startTime;
        uint256 endTime;
        CropType cropType;
        CoverageType coverageType;
        PolicyStatus status;
        ThresholdParams thresholds;
    }
    
    // ============ Events ============

    /// @notice Emitted when a new policy is created
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed farmer,
        string externalId,
        uint256 sumInsured,
        uint256 premium
    );
    
    /// @notice Emitted when a policy is activated (premium paid)
    event PolicyActivated(uint256 indexed policyId, uint256 timestamp);
    
    /// @notice Emitted when a policy is triggered by damage assessment
    event PolicyTriggered(uint256 indexed policyId, uint256 timestamp);
    
    /// @notice Emitted when a policy is cancelled
    event PolicyCancelled(uint256 indexed policyId, string reason);
    
    /// @notice Emitted when a policy expires
    event PolicyExpired(uint256 indexed policyId);
    
    // ============ Functions ============

    /**
     * @notice Create a new insurance policy
     * @param farmer Address of the farmer
     * @param externalId External ID for off-chain integration (e.g., farmer's phone number)
     * @param plotId Plot/field identifier
     * @param sumInsured Maximum coverage amount (USDC, 6 decimals)
     * @param startTime Policy start timestamp
     * @param endTime Policy end timestamp
     * @param cropType Type of crop being insured
     * @param coverageType Type of coverage (drought, flood, multi-peril)
     * @param thresholds Weather trigger thresholds
     * @return policyId Unique identifier for the created policy
     */
    function createPolicy(
        address farmer,
        string memory externalId,
        uint256 plotId,
        uint256 sumInsured,
        uint256 startTime,
        uint256 endTime,
        CropType cropType,
        CoverageType coverageType,
        ThresholdParams memory thresholds
    ) external returns (uint256 policyId);
    
    /**
     * @notice Activate a policy after premium payment
     * @param policyId Policy to activate
     */
    function activatePolicy(uint256 policyId) external;
    
    /**
     * @notice Trigger a policy based on damage assessment
     * @param policyId Policy to trigger
     */
    function triggerPolicy(uint256 policyId) external;
    
    /**
     * @notice Cancel a policy
     * @param policyId Policy to cancel
     */
    function cancelPolicy(uint256 policyId) external;
    
    /**
     * @notice Check if a policy is currently active
     * @param policyId Policy to check
     * @return bool True if policy is active
     */
    function isPolicyActive(uint256 policyId) external view returns (bool);
    
    /**
     * @notice Get expected payout amount for a policy
     * @param policyId Policy identifier
     * @return uint256 Expected payout amount in USDC
     */
    function getPolicyPayout(uint256 policyId) 
        external 
        view 
        returns (uint256);
    
    /**
     * @notice Get policy details
     * @param policyId Policy identifier
     * @return Policy Complete policy information
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory);
    
    /**
     * @notice Get all policies for a farmer
     * @param farmer Farmer address
     * @return uint256[] Array of policy IDs
     */
    function getFarmerPolicies(address farmer) external view returns (uint256[] memory);
}
