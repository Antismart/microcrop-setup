// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReceiverTemplate} from "./keystone/IReceiverTemplate.sol";
import {ITreasury} from "../interfaces/ITreasury.sol";
import {IPolicyManager} from "../interfaces/IPolicyManager.sol";

/**
 * @title PayoutReceiver
 * @notice Consumer contract that receives damage assessment reports from CRE workflows
 * @dev Implements IReceiverTemplate for secure report reception from KeystoneForwarder
 *
 * ARCHITECTURE:
 * This contract replaces the old PayoutEngine.sol and oracle system.
 * Instead of on-chain oracles pushing data, the CRE workflow:
 * 1. Monitors active policies daily
 * 2. Fetches weather data from WeatherXM API
 * 3. Fetches satellite data from Planet Labs API
 * 4. Calculates damage off-chain (60% weather + 40% satellite)
 * 5. Submits a signed report to this contract via KeystoneForwarder
 *
 * SECURITY:
 * - Only accepts reports from authorized CRE workflow (via workflow ID validation)
 * - Only accepts reports from authorized workflow owner (your admin address)
 * - Only accepts reports from KeystoneForwarder (Chainlink's on-chain validator)
 * - Prevents duplicate payouts for the same policy
 */
contract PayoutReceiver is IReceiverTemplate {
    // ============ Structs ============

    /**
     * @notice Damage assessment report structure
     * @dev This must match the ABI encoding in the CRE workflow
     */
    struct DamageReport {
        uint256 policyId;           // Policy being assessed
        uint256 damagePercentage;   // Total damage (0-10000 bps = 0-100%)
        uint256 weatherDamage;      // Weather component (0-10000 bps)
        uint256 satelliteDamage;    // Satellite component (0-10000 bps)
        uint256 payoutAmount;       // Calculated payout in USDC (6 decimals)
        uint256 assessedAt;         // Unix timestamp of assessment
    }

    // ============ State Variables ============

    /// @notice Reference to PolicyManager contract
    IPolicyManager public immutable policyManager;

    /// @notice Reference to Treasury contract
    ITreasury public immutable treasury;

    /// @notice Track which policies have been paid out
    mapping(uint256 => bool) public policyPaid;

    /// @notice Store the last damage report for each policy
    mapping(uint256 => DamageReport) public damageReports;

    /// @notice Total payouts processed
    uint256 public totalPayouts;

    /// @notice Total amount paid (USDC)
    uint256 public totalAmountPaid;

    // ============ Events ============

    event DamageReportReceived(
        uint256 indexed policyId,
        uint256 damagePercentage,
        uint256 weatherDamage,
        uint256 satelliteDamage,
        uint256 payoutAmount,
        uint256 timestamp
    );

    event PayoutInitiated(
        uint256 indexed policyId,
        address indexed farmer,
        uint256 amount,
        uint256 timestamp
    );

    // ============ Errors ============

    error PolicyAlreadyPaid(uint256 policyId);
    error PolicyNotActive(uint256 policyId);
    error InvalidDamagePercentage(uint256 damage);
    error ZeroPayoutAmount();

    // ============ Constructor ============

    /**
     * @notice Initialize the PayoutReceiver contract
     * @param _policyManager Address of PolicyManager contract
     * @param _treasury Address of Treasury contract
     * @dev The IReceiverTemplate parent constructor doesn't require any parameters
     *      Security checks (forwarder, workflow ID, author) are configured after deployment
     */
    constructor(address _policyManager, address _treasury) {
        require(_policyManager != address(0), "PayoutReceiver: Zero address");
        require(_treasury != address(0), "PayoutReceiver: Zero address");

        policyManager = IPolicyManager(_policyManager);
        treasury = ITreasury(_treasury);
    }

    // ============ Core Logic ============

    /**
     * @notice Process incoming damage report from CRE workflow
     * @param report ABI-encoded DamageReport struct
     * @dev This is called by IReceiverTemplate.onReport() after all security checks pass
     *      The KeystoneForwarder has already validated:
     *      - The report came from the authorized CRE workflow
     *      - The cryptographic signatures are valid
     *      - The workflow owner matches the expected address
     */
    function _processReport(bytes calldata report) internal override {
        // Decode the report
        DamageReport memory damageReport = abi.decode(report, (DamageReport));

        // Validate the report
        _validateReport(damageReport);

        // Store the report
        damageReports[damageReport.policyId] = damageReport;

        // Emit event for indexing
        emit DamageReportReceived(
            damageReport.policyId,
            damageReport.damagePercentage,
            damageReport.weatherDamage,
            damageReport.satelliteDamage,
            damageReport.payoutAmount,
            damageReport.assessedAt
        );

        // Initiate payout if damage detected
        if (damageReport.payoutAmount > 0) {
            _initiatePayout(damageReport);
        }
    }

    /**
     * @notice Validate the damage report
     * @param report The damage report to validate
     */
    function _validateReport(DamageReport memory report) internal view {
        // Check policy hasn't been paid already
        if (policyPaid[report.policyId]) {
            revert PolicyAlreadyPaid(report.policyId);
        }

        // Verify policy exists and is in correct state
        // Note: You'll need to add this function to IPolicyManager
        (bool exists, bool isActive) = _checkPolicyStatus(report.policyId);
        if (!exists || !isActive) {
            revert PolicyNotActive(report.policyId);
        }

        // Validate damage percentage (0-100%)
        if (report.damagePercentage > 10000) {
            revert InvalidDamagePercentage(report.damagePercentage);
        }

        // Validate payout amount is non-zero if damage detected
        if (report.damagePercentage > 0 && report.payoutAmount == 0) {
            revert ZeroPayoutAmount();
        }
    }

    /**
     * @notice Initiate payout through Treasury
     * @param report The damage report containing payout details
     */
    function _initiatePayout(DamageReport memory report) internal {
        // Mark policy as paid
        policyPaid[report.policyId] = true;

        // Get policy details to find farmer address
        // Note: You'll need to add this function to IPolicyManager
        address farmer = _getFarmerAddress(report.policyId);

        // Request payout from Treasury
        // Note: You'll need to add this function to ITreasury
        treasury.requestPayoutFromOracle(report.policyId, farmer, report.payoutAmount);

        // Update stats
        totalPayouts++;
        totalAmountPaid += report.payoutAmount;

        // Emit event
        emit PayoutInitiated(report.policyId, farmer, report.payoutAmount, block.timestamp);
    }

    // ============ Internal Helper Functions ============

    /**
     * @notice Check if policy exists and is active
     * @param policyId The policy ID to check
     * @return exists Whether the policy exists
     * @return isActive Whether the policy is active
     * @dev This calls PolicyManager to verify policy state
     */
    function _checkPolicyStatus(uint256 policyId) internal view returns (bool exists, bool isActive) {
        // You'll need to implement getPolicyStatus() in PolicyManager.sol
        // For now, using a placeholder structure
        try policyManager.policies(policyId) returns (
            address, // farmer
            uint256, // coverageAmount
            uint256, // premium
            uint256 startDate,
            uint256 endDate,
            IPolicyManager.PolicyStatus status,
            uint256, // claimAmount
            bool // claimPaid
        ) {
            exists = true;
            isActive = (status == IPolicyManager.PolicyStatus.ACTIVE) 
                && (block.timestamp >= startDate) 
                && (block.timestamp <= endDate);
        } catch {
            exists = false;
            isActive = false;
        }
    }

    /**
     * @notice Get farmer address for a policy
     * @param policyId The policy ID
     * @return farmer The farmer's address
     */
    function _getFarmerAddress(uint256 policyId) internal view returns (address farmer) {
        // Extract farmer address from policy data
        (farmer, , , , , , , ) = policyManager.policies(policyId);
    }

    // ============ View Functions ============

    /**
     * @notice Get damage report for a policy
     * @param policyId The policy ID
     * @return report The damage report
     */
    function getDamageReport(uint256 policyId) external view returns (DamageReport memory report) {
        return damageReports[policyId];
    }

    /**
     * @notice Check if a policy has been paid
     * @param policyId The policy ID
     * @return paid Whether the policy has been paid
     */
    function isPolicyPaid(uint256 policyId) external view returns (bool paid) {
        return policyPaid[policyId];
    }

    /**
     * @notice Get payout statistics
     * @return count Total number of payouts
     * @return amount Total amount paid (USDC)
     */
    function getPayoutStats() external view returns (uint256 count, uint256 amount) {
        return (totalPayouts, totalAmountPaid);
    }

    // ============ Admin Functions ============

    /**
     * @notice Configure security checks after deployment
     * @param forwarder Address of KeystoneForwarder on Base
     * @param workflowId ID of your deployed CRE workflow
     * @param workflowOwner Address that owns the workflow (your admin address)
     * @dev Only callable by contract owner
     *      For Base Mainnet, forwarder is: 0xF8344CFd5c43616a4366C34E3EEE75af79a74482
     *      For Base Sepolia, you'll use the testnet forwarder
     */
    function configureValidation(
        address forwarder,
        bytes32 workflowId,
        address workflowOwner
    ) external onlyOwner {
        // Set forwarder address (required)
        setForwarderAddress(forwarder);

        // Set expected workflow ID (required for production)
        setExpectedWorkflowId(workflowId);

        // Set expected workflow owner (required for production)
        setExpectedAuthor(workflowOwner);
    }

    /**
     * @notice Emergency function to mark a policy as paid without processing
     * @param policyId The policy ID
     * @dev Only callable by owner, use only in emergency situations
     */
    function emergencyMarkPaid(uint256 policyId) external onlyOwner {
        policyPaid[policyId] = true;
    }
}
