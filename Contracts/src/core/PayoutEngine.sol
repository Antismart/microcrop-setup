// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IPayoutEngine} from "../interfaces/IPayoutEngine.sol";
import {IPolicyManager} from "../interfaces/IPolicyManager.sol";
import {DamageLib} from "../libraries/DamageLib.sol";

/**
 * @title PayoutEngine
 * @notice Manages insurance payout workflow from damage assessment to payment
 * @dev Orchestrates damage calculation, approval, and off-chain payment integration
 */
contract PayoutEngine is IPayoutEngine, AccessControl, ReentrancyGuard, Pausable {
    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");

    // ============ State Variables ============

    /// @notice Damage calculator contract
    address public damageCalculator;

    /// @notice Policy manager contract
    address public policyManager;

    /// @notice Treasury contract
    address public treasury;

    /// @notice Liquidity pool contract
    address public liquidityPool;

    /// @notice Payout counter
    uint256 public payoutCount;

    /// @notice Batch counter
    uint256 public batchCount;

    /// @notice Payouts mapping
    mapping(uint256 => Payout) public payouts;

    /// @notice Batches mapping
    mapping(uint256 => PayoutBatch) public batches;

    /// @notice Policy to payout IDs
    mapping(uint256 => uint256[]) public policyPayouts;

    /// @notice Farmer to payout IDs
    mapping(address => uint256[]) public farmerPayouts;

    /// @notice Total payouts processed
    uint256 public totalPayoutsProcessed;

    /// @notice Total amount paid out
    uint256 public totalAmountPaid;

    // ============ Events ============

    event DamageCalculatorUpdated(address newCalculator);
    event PayoutReassessed(uint256 indexed payoutId, uint256 newAmount);

    // ============ Constructor ============

    constructor(
        address _damageCalculator,
        address _policyManager,
        address _treasury,
        address _liquidityPool,
        address _admin
    ) {
        require(_damageCalculator != address(0), "PayoutEngine: Zero address");
        require(_policyManager != address(0), "PayoutEngine: Zero address");
        require(_treasury != address(0), "PayoutEngine: Zero address");
        require(_liquidityPool != address(0), "PayoutEngine: Zero address");
        require(_admin != address(0), "PayoutEngine: Zero address");

        damageCalculator = _damageCalculator;
        policyManager = _policyManager;
        treasury = _treasury;
        liquidityPool = _liquidityPool;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(APPROVER_ROLE, _admin);
        _grantRole(PROCESSOR_ROLE, _admin);
    }

    // ============ Payout Functions ============

    /**
     * @notice Initiate payout for a triggered policy
     * @param policyId ID of the triggered policy
     * @return payoutId Unique payout identifier
     */
    function initiatePayout(uint256 policyId)
        external
        override
        onlyRole(PROCESSOR_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 payoutId)
    {
        // Get policy details
        IPolicyManager.Policy memory policy = IPolicyManager(policyManager).getPolicy(policyId);
        require(
            policy.status == IPolicyManager.PolicyStatus.TRIGGERED,
            "PayoutEngine: Policy not triggered"
        );

        // Create payout
        payoutCount++;
        payoutId = payoutCount;

        payouts[payoutId] = Payout({
            payoutId: payoutId,
            policyId: policyId,
            farmer: policy.farmer,
            externalId: policy.externalId,
            sumInsured: policy.sumInsured,
            damagePercentage: 0,
            payoutAmount: 0,
            status: PayoutStatus.PENDING,
            createdAt: block.timestamp,
            processedAt: 0,
            transactionHash: ""
        });

        policyPayouts[policyId].push(payoutId);
        farmerPayouts[policy.farmer].push(payoutId);

        emit PayoutInitiated(payoutId, policyId, policy.farmer, 0);

        return payoutId;
    }

    /**
     * @notice Calculate damage and payout amount
     * @param payoutId ID of the payout
     * @return damagePercentage Calculated damage (0-10000 bps)
     * @return payoutAmount Payout amount in USDC
     */
    function calculatePayout(uint256 payoutId)
        external
        override
        onlyRole(PROCESSOR_ROLE)
        nonReentrant
        returns (uint256 damagePercentage, uint256 payoutAmount)
    {
        Payout storage payout = payouts[payoutId];
        require(payout.payoutId != 0, "PayoutEngine: Payout not found");
        require(payout.status == PayoutStatus.PENDING, "PayoutEngine: Invalid status");

        // Call damage calculator (would need weather and satellite data in real implementation)
        // For now, we'll use a simplified approach
        (bool success, bytes memory data) = damageCalculator.call(
            abi.encodeWithSignature("getAssessment(uint256)", payout.policyId)
        );
        require(success, "PayoutEngine: Assessment failed");

        // Decode assessment
        (
            ,
            damagePercentage,
            ,
            ,
            payoutAmount,
            ,
        ) = abi.decode(data, (uint256, uint256, uint256, uint256, uint256, uint256, bool));

        // Update payout
        payout.damagePercentage = damagePercentage;
        payout.payoutAmount = payoutAmount;
        payout.status = PayoutStatus.CALCULATED;

        emit PayoutCalculated(payoutId, damagePercentage, payoutAmount);

        return (damagePercentage, payoutAmount);
    }

    /**
     * @notice Approve a calculated payout
     * @param payoutId ID of the payout
     */
    function approvePayout(uint256 payoutId)
        external
        override
        onlyRole(APPROVER_ROLE)
    {
        Payout storage payout = payouts[payoutId];
        require(payout.payoutId != 0, "PayoutEngine: Payout not found");
        require(payout.status == PayoutStatus.CALCULATED, "PayoutEngine: Invalid status");
        require(payout.payoutAmount > 0, "PayoutEngine: Zero payout");

        payout.status = PayoutStatus.APPROVED;

        emit PayoutApproved(payoutId, msg.sender);
    }

    /**
     * @notice Process a single payout
     * @param payoutId ID of the payout
     * @return success True if processing initiated
     */
    function processPayout(uint256 payoutId)
        external
        override
        onlyRole(PROCESSOR_ROLE)
        nonReentrant
        whenNotPaused
        returns (bool success)
    {
        Payout storage payout = payouts[payoutId];
        require(payout.payoutId != 0, "PayoutEngine: Payout not found");
        require(payout.status == PayoutStatus.APPROVED, "PayoutEngine: Invalid status");

        // Update status
        payout.status = PayoutStatus.PROCESSING;

        // Execute payout via Treasury
        (bool treasurySuccess,) = treasury.call(
            abi.encodeWithSignature(
                "executePayout(uint256,address,uint256)",
                payoutId,
                payout.farmer,
                payout.payoutAmount
            )
        );

        if (!treasurySuccess) {
            payout.status = PayoutStatus.FAILED;
            emit PayoutFailed(payoutId, "Treasury transfer failed");
            return false;
        }

        // Unlock capital in liquidity pool
        (bool unlockSuccess,) = liquidityPool.call(
            abi.encodeWithSignature(
                "unlockCapital(uint256,uint256,string)",
                payout.policyId,
                payout.sumInsured,
                "paid_out"
            )
        );

        if (!unlockSuccess) {
            // Log but don't fail (capital might already be unlocked)
            emit PayoutFailed(payoutId, "Capital unlock warning");
        }

        return true;
    }

    /**
     * @notice Confirm payout completion
     * @param payoutId ID of the payout
     * @param transactionHash Off-chain transaction reference
     */
    function confirmPayout(uint256 payoutId, string memory transactionHash)
        external
        override
        onlyRole(PROCESSOR_ROLE)
    {
        Payout storage payout = payouts[payoutId];
        require(payout.payoutId != 0, "PayoutEngine: Payout not found");
        require(payout.status == PayoutStatus.PROCESSING, "PayoutEngine: Invalid status");

        payout.status = PayoutStatus.COMPLETED;
        payout.processedAt = block.timestamp;
        payout.transactionHash = transactionHash;

        totalPayoutsProcessed++;
        totalAmountPaid += payout.payoutAmount;

        emit PayoutCompleted(payoutId, transactionHash, block.timestamp);
    }

    /**
     * @notice Mark payout as failed
     * @param payoutId ID of the payout
     * @param reason Failure reason
     */
    function failPayout(uint256 payoutId, string memory reason)
        external
        override
        onlyRole(PROCESSOR_ROLE)
    {
        Payout storage payout = payouts[payoutId];
        require(payout.payoutId != 0, "PayoutEngine: Payout not found");
        require(
            payout.status == PayoutStatus.PROCESSING || payout.status == PayoutStatus.APPROVED,
            "PayoutEngine: Invalid status"
        );

        payout.status = PayoutStatus.FAILED;

        emit PayoutFailed(payoutId, reason);
    }

    // ============ Batch Operations ============

    /**
     * @notice Create a batch of payouts
     * @param payoutIds Array of payout IDs
     * @return batchId Unique batch identifier
     */
    function createBatch(uint256[] memory payoutIds)
        external
        override
        onlyRole(PROCESSOR_ROLE)
        nonReentrant
        returns (uint256 batchId)
    {
        require(payoutIds.length > 0, "PayoutEngine: Empty batch");

        uint256 totalAmount = 0;

        // Validate all payouts are approved
        for (uint256 i = 0; i < payoutIds.length; i++) {
            Payout storage payout = payouts[payoutIds[i]];
            require(payout.status == PayoutStatus.APPROVED, "PayoutEngine: Not approved");
            totalAmount += payout.payoutAmount;
        }

        // Create batch
        batchCount++;
        batchId = batchCount;

        batches[batchId] = PayoutBatch({
            batchId: batchId,
            payoutIds: payoutIds,
            totalAmount: totalAmount,
            status: PayoutStatus.APPROVED,
            createdAt: block.timestamp,
            processedAt: 0
        });

        emit BatchCreated(batchId, payoutIds.length, totalAmount);

        return batchId;
    }

    /**
     * @notice Process a batch of payouts
     * @param batchId ID of the batch
     * @return successCount Number of successful payouts
     * @return failedCount Number of failed payouts
     */
    function processBatch(uint256 batchId)
        external
        override
        onlyRole(PROCESSOR_ROLE)
        nonReentrant
        whenNotPaused
        returns (uint256 successCount, uint256 failedCount)
    {
        PayoutBatch storage batch = batches[batchId];
        require(batch.batchId != 0, "PayoutEngine: Batch not found");
        require(batch.status == PayoutStatus.APPROVED, "PayoutEngine: Invalid status");

        batch.status = PayoutStatus.PROCESSING;

        uint256[] memory payoutIds = batch.payoutIds;

        for (uint256 i = 0; i < payoutIds.length; i++) {
            Payout storage payout = payouts[payoutIds[i]];
            
            if (payout.status != PayoutStatus.APPROVED) {
                failedCount++;
                continue;
            }

            payout.status = PayoutStatus.PROCESSING;

            // Execute payout
            (bool success,) = treasury.call(
                abi.encodeWithSignature(
                    "executePayout(uint256,address,uint256)",
                    payout.payoutId,
                    payout.farmer,
                    payout.payoutAmount
                )
            );

            if (success) {
                payout.status = PayoutStatus.COMPLETED;
                payout.processedAt = block.timestamp;
                totalPayoutsProcessed++;
                totalAmountPaid += payout.payoutAmount;
                successCount++;

                // Unlock capital
                liquidityPool.call(
                    abi.encodeWithSignature(
                        "unlockCapital(uint256,uint256,string)",
                        payout.policyId,
                        payout.sumInsured,
                        "paid_out"
                    )
                );
            } else {
                payout.status = PayoutStatus.FAILED;
                failedCount++;
            }
        }

        batch.status = PayoutStatus.COMPLETED;
        batch.processedAt = block.timestamp;

        emit BatchProcessed(batchId, successCount, failedCount);

        return (successCount, failedCount);
    }

    /**
     * @notice Get pending payouts ready for batching
     * @return payoutIds Array of approved payout IDs
     */
    function getPendingPayouts() external view override returns (uint256[] memory payoutIds) {
        // Count approved payouts
        uint256 approvedCount = 0;
        for (uint256 i = 1; i <= payoutCount; i++) {
            if (payouts[i].status == PayoutStatus.APPROVED) {
                approvedCount++;
            }
        }

        // Build array
        payoutIds = new uint256[](approvedCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= payoutCount; i++) {
            if (payouts[i].status == PayoutStatus.APPROVED) {
                payoutIds[index] = i;
                index++;
            }
        }

        return payoutIds;
    }

    // ============ View Functions ============

    /**
     * @notice Get payout details
     * @param payoutId ID of the payout
     * @return payout Payout struct
     */
    function getPayout(uint256 payoutId) external view override returns (Payout memory payout) {
        require(payouts[payoutId].payoutId != 0, "PayoutEngine: Payout not found");
        return payouts[payoutId];
    }

    /**
     * @notice Get batch details
     * @param batchId ID of the batch
     * @return batch PayoutBatch struct
     */
    function getBatch(uint256 batchId) external view override returns (PayoutBatch memory batch) {
        require(batches[batchId].batchId != 0, "PayoutEngine: Batch not found");
        return batches[batchId];
    }

    /**
     * @notice Get all payouts for a policy
     * @param policyId ID of the policy
     * @return policyPayoutList Array of Payout structs
     */
    function getPolicyPayouts(uint256 policyId)
        external
        view
        override
        returns (Payout[] memory policyPayoutList)
    {
        uint256[] memory ids = policyPayouts[policyId];
        policyPayoutList = new Payout[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            policyPayoutList[i] = payouts[ids[i]];
        }

        return policyPayoutList;
    }

    /**
     * @notice Get all payouts for a farmer
     * @param farmer Address of the farmer
     * @return farmerPayoutList Array of Payout structs
     */
    function getFarmerPayouts(address farmer)
        external
        view
        override
        returns (Payout[] memory farmerPayoutList)
    {
        uint256[] memory ids = farmerPayouts[farmer];
        farmerPayoutList = new Payout[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            farmerPayoutList[i] = payouts[ids[i]];
        }

        return farmerPayoutList;
    }

    /**
     * @notice Check if payout is eligible for processing
     * @param payoutId ID of the payout
     * @return eligible True if payout can be processed
     */
    function isEligibleForPayout(uint256 payoutId) external view override returns (bool eligible) {
        Payout memory payout = payouts[payoutId];
        return payout.payoutId != 0 && 
               payout.status == PayoutStatus.APPROVED && 
               payout.payoutAmount > 0;
    }

    /**
     * @notice Get payout statistics
     * @return totalPayouts Number of payouts completed
     * @return totalAmount Total USDC paid out
     */
    function getPayoutStats()
        external
        view
        override
        returns (uint256 totalPayouts, uint256 totalAmount)
    {
        return (totalPayoutsProcessed, totalAmountPaid);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update damage calculator address
     * @param newCalculator New calculator address
     */
    function updateDamageCalculator(address newCalculator) external onlyRole(ADMIN_ROLE) {
        require(newCalculator != address(0), "PayoutEngine: Zero address");
        damageCalculator = newCalculator;
        emit DamageCalculatorUpdated(newCalculator);
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
}
