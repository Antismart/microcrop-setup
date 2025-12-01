// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPayoutEngine
 * @notice Interface for processing insurance payouts with batch operations and off-chain integration
 * @dev Coordinates between DamageCalculator, Treasury, and Swypt payment rails
 */
interface IPayoutEngine {
    // ============ Enums ============

    /**
     * @notice Status of a payout request
     */
    enum PayoutStatus {
        PENDING,        // Awaiting damage assessment
        CALCULATED,     // Damage calculated, awaiting approval
        APPROVED,       // Approved for payment
        PROCESSING,     // Payment in progress (off-chain)
        COMPLETED,      // Payment successful
        FAILED,         // Payment failed (retryable)
        REJECTED        // Rejected (ineligible)
    }

    // ============ Structs ============

    /**
     * @notice Represents a payout request for a triggered policy
     * @param payoutId Unique identifier for this payout
     * @param policyId Associated policy ID
     * @param farmer Address of the farmer (on-chain)
     * @param externalId Farmer's external ID (for off-chain payment)
     * @param sumInsured Maximum possible payout (policy coverage)
     * @param damagePercentage Calculated damage (0-10000 basis points)
     * @param payoutAmount Calculated payout in USDC (6 decimals)
     * @param status Current payout status
     * @param createdAt When payout was initiated
     * @param processedAt When payout was completed
     * @param transactionHash Off-chain transaction reference
     */
    struct Payout {
        uint256 payoutId;
        uint256 policyId;
        address farmer;
        string externalId;
        uint256 sumInsured;
        uint256 damagePercentage;
        uint256 payoutAmount;
        PayoutStatus status;
        uint256 createdAt;
        uint256 processedAt;
        string transactionHash;
    }

    /**
     * @notice Batch payout operation for efficient processing
     * @param batchId Unique identifier for this batch
     * @param payoutIds Array of payout IDs in this batch
     * @param totalAmount Total USDC to be paid in this batch
     * @param status Current batch status
     * @param createdAt When batch was created
     * @param processedAt When batch processing completed
     */
    struct PayoutBatch {
        uint256 batchId;
        uint256[] payoutIds;
        uint256 totalAmount;
        PayoutStatus status;
        uint256 createdAt;
        uint256 processedAt;
    }

    // ============ Events ============

    /**
     * @notice Emitted when a new payout is initiated
     * @param payoutId Unique payout identifier
     * @param policyId Associated policy
     * @param farmer Farmer address
     * @param amount Payout amount in USDC
     */
    event PayoutInitiated(
        uint256 indexed payoutId, uint256 indexed policyId, address indexed farmer, uint256 amount
    );

    /**
     * @notice Emitted when damage is calculated for a payout
     * @param payoutId Unique payout identifier
     * @param damagePercentage Damage percentage (basis points)
     * @param payoutAmount Calculated payout amount
     */
    event PayoutCalculated(uint256 indexed payoutId, uint256 damagePercentage, uint256 payoutAmount);

    /**
     * @notice Emitted when a payout is approved
     * @param payoutId Unique payout identifier
     * @param approver Address that approved the payout
     */
    event PayoutApproved(uint256 indexed payoutId, address indexed approver);

    /**
     * @notice Emitted when a payout batch is created
     * @param batchId Batch identifier
     * @param payoutCount Number of payouts in batch
     * @param totalAmount Total USDC amount
     */
    event BatchCreated(uint256 indexed batchId, uint256 payoutCount, uint256 totalAmount);

    /**
     * @notice Emitted when a batch is processed
     * @param batchId Batch identifier
     * @param successCount Number of successful payouts
     * @param failedCount Number of failed payouts
     */
    event BatchProcessed(uint256 indexed batchId, uint256 successCount, uint256 failedCount);

    /**
     * @notice Emitted when a payout is completed
     * @param payoutId Unique payout identifier
     * @param transactionHash Off-chain transaction reference
     * @param timestamp Completion timestamp
     */
    event PayoutCompleted(uint256 indexed payoutId, string transactionHash, uint256 timestamp);

    /**
     * @notice Emitted when a payout fails and needs retry
     * @param payoutId Unique payout identifier
     * @param reason Failure reason
     */
    event PayoutFailed(uint256 indexed payoutId, string reason);

    // ============ Payout Functions ============

    /**
     * @notice Initiate payout for a triggered policy
     * @param policyId ID of the triggered policy
     * @return payoutId Unique identifier for the payout request
     */
    function initiatePayout(uint256 policyId) external returns (uint256 payoutId);

    /**
     * @notice Calculate damage and payout amount (calls DamageCalculator)
     * @param payoutId ID of the payout to calculate
     * @return damagePercentage Calculated damage (basis points)
     * @return payoutAmount Payout amount in USDC
     */
    function calculatePayout(uint256 payoutId)
        external
        returns (uint256 damagePercentage, uint256 payoutAmount);

    /**
     * @notice Approve a calculated payout for processing (admin only)
     * @param payoutId ID of the payout to approve
     */
    function approvePayout(uint256 payoutId) external;

    /**
     * @notice Process a single payout immediately
     * @param payoutId ID of the payout to process
     * @return success True if processing initiated successfully
     */
    function processPayout(uint256 payoutId) external returns (bool success);

    /**
     * @notice Mark payout as completed after off-chain confirmation
     * @param payoutId ID of the payout
     * @param transactionHash Off-chain transaction reference
     */
    function confirmPayout(uint256 payoutId, string memory transactionHash) external;

    /**
     * @notice Mark payout as failed for retry
     * @param payoutId ID of the payout
     * @param reason Failure reason
     */
    function failPayout(uint256 payoutId, string memory reason) external;

    // ============ Batch Operations ============

    /**
     * @notice Create a batch of payouts for efficient processing
     * @param payoutIds Array of payout IDs to batch
     * @return batchId Unique identifier for the batch
     */
    function createBatch(uint256[] memory payoutIds) external returns (uint256 batchId);

    /**
     * @notice Process an entire batch of payouts
     * @param batchId ID of the batch to process
     * @return successCount Number of successful payouts
     * @return failedCount Number of failed payouts
     */
    function processBatch(uint256 batchId) external returns (uint256 successCount, uint256 failedCount);

    /**
     * @notice Get all pending payouts ready for batching
     * @return payoutIds Array of payout IDs with APPROVED status
     */
    function getPendingPayouts() external view returns (uint256[] memory payoutIds);

    // ============ View Functions ============

    /**
     * @notice Get payout details
     * @param payoutId ID of the payout
     * @return payout Payout struct with all details
     */
    function getPayout(uint256 payoutId) external view returns (Payout memory payout);

    /**
     * @notice Get batch details
     * @param batchId ID of the batch
     * @return batch PayoutBatch struct
     */
    function getBatch(uint256 batchId) external view returns (PayoutBatch memory batch);

    /**
     * @notice Get all payouts for a specific policy
     * @param policyId ID of the policy
     * @return payouts Array of Payout structs
     */
    function getPolicyPayouts(uint256 policyId) external view returns (Payout[] memory payouts);

    /**
     * @notice Get all payouts for a farmer
     * @param farmer Address of the farmer
     * @return payouts Array of Payout structs
     */
    function getFarmerPayouts(address farmer) external view returns (Payout[] memory payouts);

    /**
     * @notice Check if a payout is eligible for processing
     * @param payoutId ID of the payout
     * @return eligible True if payout can be processed
     */
    function isEligibleForPayout(uint256 payoutId) external view returns (bool eligible);

    /**
     * @notice Get total payouts processed (all-time statistics)
     * @return totalPayouts Number of payouts completed
     * @return totalAmount Total USDC paid out
     */
    function getPayoutStats() external view returns (uint256 totalPayouts, uint256 totalAmount);
}
