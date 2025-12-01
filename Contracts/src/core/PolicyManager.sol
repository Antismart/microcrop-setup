// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IPolicyManager} from "../interfaces/IPolicyManager.sol";
import {PolicyLib} from "../libraries/PolicyLib.sol";
import {MathLib} from "../libraries/MathLib.sol";

/**
 * @title PolicyManager
 * @notice Manages the full lifecycle of parametric crop insurance policies
 * @dev Core contract for policy creation, activation, triggering, and lifecycle management
 */
contract PolicyManager is IPolicyManager, AccessControl, ReentrancyGuard, Pausable {
    using PolicyLib for *;
    using MathLib for uint256;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    // ============ State Variables ============

    /// @notice Treasury contract
    address public immutable treasury;

    /// @notice Liquidity pool contract
    address public immutable liquidityPool;

    /// @notice USDC token
    IERC20 public immutable USDC;

    /// @notice Policy counter
    uint256 public policyCount;

    /// @notice Policies mapping
    mapping(uint256 => Policy) public policies;

    /// @notice Farmer to policy IDs
    mapping(address => uint256[]) public farmerPolicies;

    /// @notice External ID to policy ID mapping (for off-chain integration)
    mapping(string => uint256) public externalIdToPolicy;

    /// @notice Rate card for premium calculation
    PolicyLib.RateCard public rateCard;

    /// @notice Maximum active policies per farmer
    uint256 public maxPoliciesPerFarmer = 5;

    /// @notice Maximum claims per farmer (12 months)
    uint256 public maxClaimsPerYear = 3;

    /// @notice Farmer claim history (farmer => count in last 12 months)
    mapping(address => uint256) public farmerClaimCount;

    /// @notice Last claim timestamp per farmer
    mapping(address => uint256) public lastClaimTime;

    // ============ Events ============

    event RateCardUpdated();
    event MaxPoliciesUpdated(uint256 newMax);
    event MaxClaimsUpdated(uint256 newMax);

    // ============ Errors ============

    error PolicyNotFound();
    error InvalidPolicyState();
    error Unauthorized();
    error MaxPoliciesExceeded();
    error InvalidParameters();

    // ============ Constructor ============

    constructor(address _usdc, address _treasury, address _liquidityPool, address _admin) {
        require(_usdc != address(0), "PolicyManager: Zero address");
        require(_treasury != address(0), "PolicyManager: Zero address");
        require(_liquidityPool != address(0), "PolicyManager: Zero address");
        require(_admin != address(0), "PolicyManager: Zero address");

        USDC = IERC20(_usdc);
        treasury = _treasury;
        liquidityPool = _liquidityPool;

        // Initialize default rate card (all rates in basis points)
        rateCard = PolicyLib.RateCard({
            maizeDrought: 500,      // 5%
            maizeFlood: 400,        // 4%
            maizeMultiPeril: 800,   // 8%
            beansDrought: 600,      // 6%
            beansFlood: 450,        // 4.5%
            beansMultiPeril: 900,   // 9%
            wheatDrought: 450,      // 4.5%
            wheatFlood: 400,        // 4%
            wheatMultiPeril: 750,   // 7.5%
            sorghumDrought: 400,    // 4%
            sorghumFlood: 350,      // 3.5%
            sorghumMultiPeril: 700, // 7%
            milletDrought: 350,     // 3.5%
            milletFlood: 300,       // 3%
            milletMultiPeril: 600,  // 6%
            riceDrought: 550,       // 5.5%
            riceFlood: 500,         // 5%
            riceMultiPeril: 850     // 8.5%
        });

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
    }

    // ============ Policy Creation ============

    /**
     * @notice Create a new insurance policy
     * @param farmer Address of the farmer
     * @param externalId External identifier (from backend)
     * @param plotId Plot/field identifier
     * @param sumInsured Coverage amount in USDC
     * @param startTime Policy start timestamp
     * @param endTime Policy end timestamp
     * @param cropType Type of crop being insured
     * @param coverageType Type of coverage
     * @param thresholds Damage assessment thresholds
     * @return policyId Unique policy identifier
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
    ) external override onlyRole(BACKEND_ROLE) nonReentrant whenNotPaused returns (uint256 policyId) {
        require(farmer != address(0), "PolicyManager: Zero address");
        require(bytes(externalId).length > 0, "PolicyManager: Empty external ID");
        
        // Validate policy parameters
        (bool valid, string memory reason) = PolicyLib.validatePolicyParameters(sumInsured, startTime, endTime);
        require(valid, reason);

        // Check farmer eligibility
        uint256 activePolicies = getActivePolicyCount(farmer);
        uint256 claimCount = _getRecentClaimCount(farmer);
        uint256 lossRatio = 0; // TODO: Calculate from history
        
        (bool eligible, string memory eligibilityReason) = 
            PolicyLib.checkFarmerEligibility(activePolicies, claimCount, lossRatio);
        require(eligible, eligibilityReason);

        // Calculate premium
        PolicyLib.RiskFactors memory riskFactors = PolicyLib.RiskFactors({
            historicalLosses: 5000,      // 50% (neutral)
            weatherVolatility: 5000,     // 50% (neutral)
            soilQuality: 7000,           // 70% (good)
            irrigationAccess: 5000,      // 50% (partial)
            experienceModifier: 10000    // 100% (neutral)
        });

        uint256 premium = PolicyLib.calculatePremium(
            sumInsured,
            PolicyLib.CropType(uint8(cropType)),
            PolicyLib.CoverageType(uint8(coverageType)),
            rateCard,
            riskFactors
        );

        // Create policy
        policyCount++;
        policyId = policyCount;

        policies[policyId] = Policy({
            policyId: policyId,
            farmer: farmer,
            externalId: externalId,
            plotId: plotId,
            sumInsured: sumInsured,
            premium: premium,
            startTime: startTime,
            endTime: endTime,
            cropType: cropType,
            coverageType: coverageType,
            status: PolicyStatus.PENDING,
            thresholds: thresholds
        });

        farmerPolicies[farmer].push(policyId);
        externalIdToPolicy[externalId] = policyId;

        emit PolicyCreated(policyId, farmer, externalId, sumInsured, premium);

        return policyId;
    }

    // ============ Policy Activation ============

    /**
     * @notice Activate a policy after premium payment
     * @param policyId ID of the policy to activate
     */
    function activatePolicy(uint256 policyId)
        external
        override
        onlyRole(BACKEND_ROLE)
        nonReentrant
        whenNotPaused
    {
        Policy storage policy = policies[policyId];
        require(policy.policyId != 0, "PolicyManager: Policy not found");
        require(policy.status == PolicyStatus.PENDING, "PolicyManager: Invalid status");
        require(block.timestamp < policy.startTime, "PolicyManager: Policy already started");

        // Collect premium from farmer (must be approved first)
        USDC.transferFrom(policy.farmer, treasury, policy.premium);

        // Lock capital in liquidity pool
        (bool success,) = liquidityPool.call(
            abi.encodeWithSignature("lockCapital(uint256,uint256)", policyId, policy.sumInsured)
        );
        require(success, "PolicyManager: Failed to lock capital");

        // Update status
        policy.status = PolicyStatus.ACTIVE;

        emit PolicyActivated(policyId, block.timestamp);
    }

    // ============ Policy Triggering ============

    /**
     * @notice Trigger a policy for payout assessment
     * @param policyId ID of the policy to trigger
     */
    function triggerPolicy(uint256 policyId)
        external
        override
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        Policy storage policy = policies[policyId];
        require(policy.policyId != 0, "PolicyManager: Policy not found");
        require(policy.status == PolicyStatus.ACTIVE, "PolicyManager: Invalid status");
        require(PolicyLib.isWithinCoveragePeriod(policy.startTime, policy.endTime), "PolicyManager: Outside coverage period");

        // Update status
        policy.status = PolicyStatus.TRIGGERED;

        // Update farmer claim count
        if (block.timestamp - lastClaimTime[policy.farmer] > 365 days) {
            farmerClaimCount[policy.farmer] = 0;
        }
        farmerClaimCount[policy.farmer]++;
        lastClaimTime[policy.farmer] = block.timestamp;

        emit PolicyTriggered(policyId, block.timestamp);
    }

    // ============ Policy Cancellation ============

    /**
     * @notice Cancel a policy and issue refund
     * @param policyId ID of the policy to cancel
     */
    function cancelPolicy(uint256 policyId)
        external
        override
        nonReentrant
    {
        Policy storage policy = policies[policyId];
        require(policy.policyId != 0, "PolicyManager: Policy not found");
        require(msg.sender == policy.farmer || hasRole(ADMIN_ROLE, msg.sender), "PolicyManager: Unauthorized");
        require(
            policy.status == PolicyStatus.PENDING || policy.status == PolicyStatus.ACTIVE,
            "PolicyManager: Invalid status"
        );

        if (policy.status == PolicyStatus.ACTIVE) {
            // Calculate refund for active policy
            uint256 refund = PolicyLib.calculateCancellationRefund(
                policy.premium,
                policy.startTime,
                policy.endTime,
                block.timestamp
            );

            // Unlock capital from liquidity pool
            (bool unlockSuccess,) = liquidityPool.call(
                abi.encodeWithSignature(
                    "unlockCapital(uint256,uint256,string)",
                    policyId,
                    policy.sumInsured,
                    "cancelled"
                )
            );
            require(unlockSuccess, "PolicyManager: Failed to unlock capital");

            // Issue refund if applicable
            if (refund > 0) {
                (bool refundSuccess,) = treasury.call(
                    abi.encodeWithSignature("executePayout(uint256,address,uint256)", policyId, policy.farmer, refund)
                );
                require(refundSuccess, "PolicyManager: Failed to issue refund");
            }
        }

        // Update status
        policy.status = PolicyStatus.CANCELLED;

        emit PolicyCancelled(policyId, "Cancelled by user");
    }

    // ============ Policy Expiration ============

    /**
     * @notice Mark expired policies and unlock capital
     * @param policyId ID of the policy to expire
     */
    function expirePolicy(uint256 policyId)
        external
        onlyRole(BACKEND_ROLE)
        nonReentrant
    {
        Policy storage policy = policies[policyId];
        require(policy.policyId != 0, "PolicyManager: Policy not found");
        require(policy.status == PolicyStatus.ACTIVE, "PolicyManager: Invalid status");
        require(block.timestamp > policy.endTime, "PolicyManager: Policy not expired");

        // Unlock capital from liquidity pool
        (bool success,) = liquidityPool.call(
            abi.encodeWithSignature(
                "unlockCapital(uint256,uint256,string)",
                policyId,
                policy.sumInsured,
                "expired"
            )
        );
        require(success, "PolicyManager: Failed to unlock capital");

        // Update status
        policy.status = PolicyStatus.EXPIRED;

        emit PolicyExpired(policyId);
    }

    /**
     * @notice Batch expire multiple policies
     * @param policyIds Array of policy IDs to expire
     */
    function batchExpirePolicies(uint256[] calldata policyIds)
        external
        onlyRole(BACKEND_ROLE)
        nonReentrant
    {
        for (uint256 i = 0; i < policyIds.length; i++) {
            Policy storage policy = policies[policyIds[i]];
            
            if (policy.policyId != 0 && 
                policy.status == PolicyStatus.ACTIVE && 
                block.timestamp > policy.endTime) {
                
                // Unlock capital
                (bool success,) = liquidityPool.call(
                    abi.encodeWithSignature(
                        "unlockCapital(uint256,uint256,string)",
                        policyIds[i],
                        policy.sumInsured,
                        "expired"
                    )
                );
                
                if (success) {
                    policy.status = PolicyStatus.EXPIRED;
                    emit PolicyExpired(policyIds[i]);
                }
            }
        }
    }

    // ============ View Functions ============

    /**
     * @notice Check if a policy is currently active
     * @param policyId ID of the policy
     * @return active True if policy is active
     */
    function isPolicyActive(uint256 policyId) external view override returns (bool active) {
        Policy memory policy = policies[policyId];
        return policy.status == PolicyStatus.ACTIVE &&
               PolicyLib.isWithinCoveragePeriod(policy.startTime, policy.endTime);
    }

    /**
     * @notice Get expected payout for a policy
     * @param policyId ID of the policy
     * @return payout Expected payout amount
     */
    function getPolicyPayout(uint256 policyId) external view override returns (uint256 payout) {
        Policy memory policy = policies[policyId];
        require(policy.policyId != 0, "PolicyManager: Policy not found");
        
        // Return full sum insured for triggered policies
        // Actual damage calculation happens in DamageCalculator
        if (policy.status == PolicyStatus.TRIGGERED) {
            return policy.sumInsured;
        }
        
        return 0;
    }

    /**
     * @notice Get policy details
     * @param policyId ID of the policy
     * @return policy Policy struct
     */
    function getPolicy(uint256 policyId) external view override returns (Policy memory policy) {
        require(policies[policyId].policyId != 0, "PolicyManager: Policy not found");
        return policies[policyId];
    }

    /**
     * @notice Get all policies for a farmer
     * @param farmer Address of the farmer
     * @return policyIds Array of policy IDs
     */
    function getFarmerPolicies(address farmer)
        external
        view
        override
        returns (uint256[] memory policyIds)
    {
        return farmerPolicies[farmer];
    }

    /**
     * @notice Get count of active policies for a farmer
     * @param farmer Address of the farmer
     * @return count Number of active policies
     */
    function getActivePolicyCount(address farmer) public view returns (uint256 count) {
        uint256[] memory policyIds = farmerPolicies[farmer];
        
        for (uint256 i = 0; i < policyIds.length; i++) {
            Policy memory policy = policies[policyIds[i]];
            if (policy.status == PolicyStatus.ACTIVE &&
                PolicyLib.isWithinCoveragePeriod(policy.startTime, policy.endTime)) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @notice Get policy by external ID
     * @param externalId External identifier
     * @return policy Policy struct
     */
    function getPolicyByExternalId(string memory externalId)
        external
        view
        returns (Policy memory policy)
    {
        uint256 policyId = externalIdToPolicy[externalId];
        require(policyId != 0, "PolicyManager: Policy not found");
        return policies[policyId];
    }

    /**
     * @notice Get all policies that need expiration
     * @return expiredIds Array of policy IDs to expire
     */
    function getExpiredPolicies() external view returns (uint256[] memory expiredIds) {
        // Count expired policies first
        uint256 expiredCount = 0;
        for (uint256 i = 1; i <= policyCount; i++) {
            Policy memory policy = policies[i];
            if (policy.status == PolicyStatus.ACTIVE && block.timestamp > policy.endTime) {
                expiredCount++;
            }
        }

        // Build array of expired policy IDs
        expiredIds = new uint256[](expiredCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= policyCount; i++) {
            Policy memory policy = policies[i];
            if (policy.status == PolicyStatus.ACTIVE && block.timestamp > policy.endTime) {
                expiredIds[index] = i;
                index++;
            }
        }

        return expiredIds;
    }

    // ============ Internal Functions ============

    /**
     * @notice Get recent claim count for a farmer (last 12 months)
     * @param farmer Address of the farmer
     * @return count Number of claims
     */
    function _getRecentClaimCount(address farmer) internal view returns (uint256 count) {
        if (block.timestamp - lastClaimTime[farmer] > 365 days) {
            return 0;
        }
        return farmerClaimCount[farmer];
    }

    // ============ Admin Functions ============

    /**
     * @notice Update rate card
     * @param newRateCard New rate card configuration
     */
    function updateRateCard(PolicyLib.RateCard memory newRateCard)
        external
        onlyRole(ADMIN_ROLE)
    {
        rateCard = newRateCard;
        emit RateCardUpdated();
    }

    /**
     * @notice Update maximum policies per farmer
     * @param newMax New maximum
     */
    function updateMaxPolicies(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0 && newMax <= 10, "PolicyManager: Invalid max");
        maxPoliciesPerFarmer = newMax;
        emit MaxPoliciesUpdated(newMax);
    }

    /**
     * @notice Update maximum claims per year
     * @param newMax New maximum
     */
    function updateMaxClaims(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0 && newMax <= 5, "PolicyManager: Invalid max");
        maxClaimsPerYear = newMax;
        emit MaxClaimsUpdated(newMax);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============ CRE Integration Functions ============

    /**
     * @notice Get all active policy IDs (for CRE workflow)
     * @return Array of policy IDs with status ACTIVE
     * @dev Used by Chainlink CRE workflow to identify policies needing assessment
     */
    function getActivePolicies() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // First pass: count active policies
        for (uint256 i = 1; i <= policyCount; i++) {
            if (policies[i].status == PolicyStatus.ACTIVE) {
                activeCount++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory activePolicyIds = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= policyCount; i++) {
            if (policies[i].status == PolicyStatus.ACTIVE) {
                activePolicyIds[index] = i;
                index++;
            }
        }
        
        return activePolicyIds;
    }

    /**
     * @notice Get detailed information for a specific policy (for CRE workflow)
     * @param policyId The ID of the policy
     * @return farmer Address of the farmer
     * @return sumInsured Maximum coverage amount
     * @return startTime Policy start timestamp
     * @return endTime Policy end timestamp
     * @return cropType Type of crop being insured
     * @return coverageType Type of coverage (drought, flood, multi-peril)
     * @return plotId Plot/field identifier (can be used to lookup GPS coordinates off-chain)
     * @dev Used by CRE workflow to fetch policy details for damage assessment
     * @dev GPS coordinates should be stored off-chain and fetched via plotId for privacy
     */
    function getPolicyDetails(uint256 policyId) 
        external 
        view 
        returns (
            address farmer,
            uint256 sumInsured,
            uint256 startTime,
            uint256 endTime,
            CropType cropType,
            CoverageType coverageType,
            uint256 plotId
        ) 
    {
        require(policyId > 0 && policyId <= policyCount, "Invalid policy ID");
        
        Policy storage policy = policies[policyId];
        
        return (
            policy.farmer,
            policy.sumInsured,
            policy.startTime,
            policy.endTime,
            policy.cropType,
            policy.coverageType,
            policy.plotId
        );
    }
}
